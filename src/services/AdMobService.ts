
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface ExtendedRewardAdOptions extends RewardAdOptions {
  serverSideVerificationOptions?: {
    userId: string;
    customData: string;
    serverSideVerificationUrl?: string;
  };
}

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
  connectivityStatus: 'unknown' | 'connected' | 'disconnected';
}

interface AdWatchResult {
  success: boolean;
  rewarded: boolean;
  error?: string;
}

export class AdMobService {
  // Mode production pour AdMob (prêt pour publication)
  private static readonly IS_DEV = false;
  
  // ID CORRECT de l'annonce de récompense de production
  private static readonly REWARDED_AD_ID = 'ca-app-pub-4824355487707598/1680280074';  // ID fourni par Google

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null,
    connectivityStatus: 'unknown'
  };

  static async initialize(): Promise<boolean> {
    try {
      console.log('[AdMob] Starting initialization for production...');
      
      // Check if platform is native
      const isNative = await Capacitor.isNativePlatform();
      console.log('[AdMob] Platform check - isNative:', isNative);
      
      if (!isNative) {
        console.log('[AdMob] Web platform detected - skipping initialization');
        this.state.isInitialized = false;
        return false;
      }

      // Skip if already initialized
      if (this.state.isInitialized) {
        console.log('[AdMob] Already initialized');
        return true;
      }

      // Initialize AdMob for native platforms
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false,
      });
      
      this.state.isInitialized = true;
      this.state.lastError = null;
      this.state.connectivityStatus = 'connected';
      console.log('[AdMob] Successfully initialized for production');
      
      // Test connectivity immediately after initialization
      const connectivityResult = await this.testConnectivity();
      console.log('[AdMob] Post-initialization connectivity test:', connectivityResult);
      
      return true;
    } catch (error) {
      console.error('[AdMob] Initialization failed:', error);
      console.error('[AdMob] Initialization error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      this.state.lastError = this.getReadableError(error as Error);
      this.state.isInitialized = false;
      this.state.connectivityStatus = 'disconnected';
      return false;
    }
  }

  static async testConnectivity(): Promise<boolean> {
    try {
      console.log('AdMob: Testing connectivity...');
      
      if (!navigator.onLine) {
        console.log('AdMob: Device offline');
        this.state.connectivityStatus = 'disconnected';
        return false;
      }

      // Test de base de connectivité réseau
      const testResponse = await fetch('https://www.google.com/ads/preferences', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      this.state.connectivityStatus = 'connected';
      console.log('AdMob: Connectivity test passed');
      return true;
    } catch (error) {
      console.error('AdMob: Connectivity test failed:', error);
      this.state.connectivityStatus = 'disconnected';
      return false;
    }
  }

  static async loadRewardedAd(userId: string, rewardType: string, rewardAmount: number, retryCount: number = 0): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Not on native platform - ads not available');
      this.state.lastError = 'Publicités disponibles uniquement sur mobile';
      return false;
    }

    // Test de connectivité avant de charger
    const isConnected = await this.testConnectivity();
    if (!isConnected) {
      this.state.lastError = 'Connexion internet requise pour charger les publicités';
      return false;
    }

    if (this.state.isAdLoading) {
      console.log('AdMob: Ad is already loading');
      return false;
    }

    if (this.state.isAdLoaded) {
      console.log('AdMob: Ad is already loaded');
      return true;
    }

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AdMob not initialized');
      }

      this.state.isAdLoading = true;
      this.state.lastError = null;

      console.log(`AdMob: Loading rewarded ad with correct unit ID (attempt ${retryCount + 1})...`);
      console.log(`AdMob: Using ad unit: ${this.REWARDED_AD_ID}`);
      
      // AMÉLIORATION: Configuration SSV optimisée avec métadonnées enrichies
      const customData = JSON.stringify({
        user_id: userId,
        reward_type: rewardType,
        reward_amount: rewardAmount,
        timestamp: Date.now(),
        session_id: `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform: Capacitor.getPlatform(),
        app_version: '1.0.0',
        validation_mode: 'ssv_enhanced'
      });

      const ssvUrl = `https://osfexuqvlpxrfaukfobn.supabase.co/functions/v1/validate-ad-reward`;

      const options: ExtendedRewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: false, // Jamais en mode test pour la production
        serverSideVerificationOptions: {
          userId: userId,
          customData: customData,
          serverSideVerificationUrl: ssvUrl
        }
      };

      console.log('AdMob: Loading ad with production settings:', {
        adUnitId: this.REWARDED_AD_ID,
        userId: options.serverSideVerificationOptions?.userId,
        ssvUrl: ssvUrl,
        isTesting: false
      });

      await AdMob.prepareRewardVideoAd(options);
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      
      console.log('AdMob: Production ad loaded successfully with SSV configuration');
      return true;
    } catch (error) {
      console.error('AdMob: Error loading rewarded ad:', error);
      console.error('AdMob: Error details:', {
        message: (error as Error).message,
        adUnitId: this.REWARDED_AD_ID,
        retryCount: retryCount
      });
      
      this.state.isAdLoading = false;
      this.state.lastError = this.getReadableError(error as Error);
      
      if (retryCount < 2 && this.shouldRetry(error as Error)) {
        console.log(`AdMob: Retrying load (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.loadRewardedAd(userId, rewardType, rewardAmount, retryCount + 1);
      }
      
      return false;
    }
  }

  private static shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'no_fill',
      'internal',
      'doubleclick.net',
      'failed to connect',
      'connection',
      'request failed'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
  }

  private static getReadableError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('doubleclick.net') || message.includes('failed to connect')) {
      return 'Connexion impossible aux serveurs publicitaires. Vérifiez votre connexion internet.';
    }
    
    if (message.includes('no_fill')) {
      return 'Aucune publicité disponible pour le moment. Réessayez plus tard.';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Problème de réseau. Vérifiez votre connexion internet.';
    }
    
    if (message.includes('timeout')) {
      return 'Timeout lors du chargement de la publicité. Réessayez.';
    }
    
    if (message.includes('ad unit') || message.includes('invalid')) {
      return 'Configuration publicitaire incorrecte. Contactez le support.';
    }
    
    return 'Erreur lors du chargement de la publicité. Réessayez plus tard.';
  }

  static async showRewardedAd(userId: string, rewardType: string, rewardAmount: number): Promise<AdWatchResult> {
    try {
      console.log(`[AdMob] showRewardedAd called for user ${userId}, reward: ${rewardType}, amount: ${rewardAmount}`);
      console.log(`[AdMob] Current state:`, this.getState());
      
      // Vérifier si on est sur une plateforme native
      const isNative = await Capacitor.isNativePlatform();
      console.log(`[AdMob] Platform check - isNative: ${isNative}`);
      if (!isNative) {
        console.log('[AdMob] Web platform detected - ads not available');
        return { 
          success: false, 
          rewarded: false, 
          error: 'Publicités disponibles uniquement sur mobile' 
        };
      }

      // Vérifier l'état d'initialisation
      if (!this.state.isInitialized) {
        console.log('[AdMob] Not initialized, attempting to initialize...');
        const initialized = await this.initialize();
        console.log(`[AdMob] Initialization result: ${initialized}`);
        if (!initialized) {
          console.error('[AdMob] Failed to initialize AdMob service');
          return { 
            success: false, 
            rewarded: false, 
            error: 'Impossible d\'initialiser le service publicitaire' 
          };
        }
      }

      // Test de connectivité avant de charger l'annonce
      console.log('[AdMob] Testing connectivity before loading ad...');
      const connectivity = await this.testConnectivity();
      console.log(`[AdMob] Connectivity test result: ${connectivity}`);

      // Charger l'annonce si elle n'est pas déjà chargée
      if (!this.state.isAdLoaded) {
        console.log('[AdMob] Ad not loaded, loading now...');
        const loaded = await this.loadRewardedAd(userId, rewardType, rewardAmount);
        console.log(`[AdMob] Ad loading result: ${loaded}`);
        if (!loaded) {
          console.error('[AdMob] Failed to load rewarded ad');
          return { 
            success: false, 
            rewarded: false, 
            error: 'Impossible de charger la publicité' 
          };
        }
      }

      console.log('[AdMob] Showing rewarded ad...');
      const result = await AdMob.showRewardVideoAd();
      console.log('[AdMob] Ad show result:', result);

      // Check if the user was rewarded (AdMobRewardItem has 'type' and 'amount' properties)
      const wasRewarded = !!(result && typeof result === 'object' && 'type' in result && 'amount' in result);
      
      // Appliquer la récompense immédiatement côté client
      if (wasRewarded) {
        console.log('[AdMob] User was rewarded, applying client-side reward...');
        await this.applyImmediateClientReward(userId, rewardType, rewardAmount);
      } else {
        console.warn('[AdMob] User was not rewarded - ad may not have been completed');
      }

      // Nettoyer l'état pour permettre le chargement de la prochaine annonce
      this.cleanup();
      
      // Précharger la prochaine annonce en arrière-plan
      this.preloadAd(userId, rewardType, rewardAmount);

      return { 
        success: true, 
        rewarded: wasRewarded 
      };

    } catch (error) {
      console.error('[AdMob] Error showing rewarded ad:', error);
      console.error('[AdMob] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      this.state.lastError = (error as Error).message;
      
      // Nettoyer l'état en cas d'erreur
      this.cleanup();
      
      return { 
        success: false, 
        rewarded: false, 
        error: this.getReadableError(error as Error) 
      };
    }
  }

  /**
   * Applique la récompense immédiate côté client (recommandation Google)
   * La validation SSV côté serveur se fera en parallèle pour sécurité
   */
  private static async applyImmediateClientReward(userId: string, rewardType: string, rewardAmount: number): Promise<void> {
    try {
      console.log('AdMob: Applying immediate client-side reward for optimal UX');
      
      // Use Supabase client for secure API calls
      const { data, error } = await supabase.functions.invoke('validate-ad-reward', {
        body: {
          user_id: userId,
          reward_type: rewardType,
          reward_amount: rewardAmount,
          ad_duration: 30,
          source: 'client_immediate'
        }
      });

      if (!error && data) {
        console.log('AdMob: Immediate client reward applied successfully');
      } else {
        console.warn('AdMob: Failed to apply immediate client reward, SSV will handle it');
      }
    } catch (error) {
      console.warn('AdMob: Error applying immediate client reward:', error);
    }
  }

  static getState(): AdMobState {
    return { ...this.state };
  }

  static getDebugInfo(): object {
    return {
      adUnitId: this.REWARDED_AD_ID,
      state: this.state,
      isProduction: !this.IS_DEV,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    };
  }

  // Fonction de diagnostic complète
  static async getDiagnosticInfo() {
    const isNative = await Capacitor.isNativePlatform();
    const connectivity = await this.testConnectivity();
    
    return {
      platform: {
        isNative,
        platformName: Capacitor.getPlatform()
      },
      admob: {
        ...this.state,
        connectivity
      },
      environment: 'production',
      timestamp: new Date().toISOString()
    };
  }

  static async preloadAd(userId?: string, rewardType?: string, rewardAmount?: number): Promise<void> {
    if (!this.state.isAdLoaded && !this.state.isAdLoading && userId && rewardType && rewardAmount) {
      console.log('AdMob: Preloading production ad...');
      await this.loadRewardedAd(userId, rewardType, rewardAmount);
    }
  }

  static cleanup(): void {
    console.log('AdMob: Cleanup method called');
    this.state.isAdLoaded = false;
    this.state.isAdLoading = false;
  }
}
