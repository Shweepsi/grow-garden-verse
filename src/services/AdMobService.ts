
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

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
    if (this.state.isInitialized || !Capacitor.isNativePlatform()) {
      console.log('AdMob: Already initialized or not on native platform');
      return this.state.isInitialized;
    }

    try {
      console.log('AdMob: Initializing with production settings...');
      
      await AdMob.initialize({
        testingDevices: [], // Aucun appareil de test en production
        initializeForTesting: false // Jamais en mode test pour la production
      });

      this.state.isInitialized = true;
      this.state.lastError = null;
      this.state.connectivityStatus = 'connected';
      console.log('AdMob: Initialized successfully with production ad unit');
      return true;
    } catch (error) {
      console.error('AdMob: Failed to initialize:', error);
      this.state.lastError = this.getReadableError(error as Error);
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
      
      // Configuration SSV simplifiée pour éviter les erreurs d'encodage
      const customData = JSON.stringify({
        user_id: userId,
        reward_type: rewardType,
        reward_amount: rewardAmount,
        timestamp: Date.now()
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
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Web platform - ads not available');
      return { 
        success: false, 
        rewarded: false,
        error: 'Publicités disponibles uniquement sur mobile' 
      };
    }

    try {
      if (!this.state.isAdLoaded) {
        console.log('AdMob: Ad not loaded, loading now...');
        const loaded = await this.loadRewardedAd(userId, rewardType, rewardAmount);
        if (!loaded) {
          return { 
            success: false, 
            rewarded: false,
            error: this.state.lastError || 'Failed to load ad' 
          };
        }
      }

      console.log('AdMob: Showing production rewarded ad with SSV for user:', userId);
      console.log('AdMob: Ad unit ID:', this.REWARDED_AD_ID);
      
      const result = await AdMob.showRewardVideoAd();
      
      console.log('AdMob: Production ad watched successfully, applying immediate client reward');
      
      // AMÉLIORATION: Récompense immédiate côté client (recommandation Google)
      await this.applyImmediateClientReward(userId, rewardType, rewardAmount);
      
      // AdMob handles server validation automatically via SSV pour validation a posteriori
      this.state.isAdLoaded = false;
      
      // Preload next ad for better UX
      setTimeout(() => this.preloadAd(userId, rewardType, rewardAmount), 1000);
      
      return { success: true, rewarded: true };
    } catch (error) {
      console.error('AdMob: Error showing rewarded ad:', error);
      this.state.isAdLoaded = false;
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
      
      // Appeler directement notre service de récompense
      const response = await fetch(`https://osfexuqvlpxrfaukfobn.supabase.co/functions/v1/validate-ad-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmV4dXF2bHB4cmZhdWtmb2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NDY3ODIsImV4cCI6MjA2NjQyMjc4Mn0.wu17C74K3kUs8mjRoHwFVAhjgEBmi91gRiJiGkYPICY'}`
        },
        body: JSON.stringify({
          user_id: userId,
          reward_type: rewardType,
          reward_amount: rewardAmount,
          ad_duration: 30,
          source: 'client_immediate'
        })
      });

      if (response.ok) {
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
