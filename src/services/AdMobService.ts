
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
  
  // ID CORRECT de l'annonce de récompense de production (doit correspondre à capacitor.config.ts)
  private static readonly REWARDED_AD_ID = 'ca-app-pub-4824355487707598/1680280074';  // ID correct configuré dans AdMob

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null,
    connectivityStatus: 'unknown'
  };

  static async initialize(): Promise<boolean> {
    try {
      console.log('[AdMob] 🚀 INITIALISATION PRODUCTION MODE');
      console.log('[AdMob] 📋 Configuration utilisée:');
      console.log('[AdMob] - App ID: ca-app-pub-4824355487707598~3701914540');  
      console.log('[AdMob] - Ad Unit ID: ca-app-pub-4824355487707598/1680280074');
      console.log('[AdMob] - Mode: PRODUCTION (test désactivé)');
      console.log('[AdMob] - Platform:', Capacitor.getPlatform());
      
      // Check if platform is native
      const isNative = await Capacitor.isNativePlatform();
      console.log('[AdMob] 🔍 Platform check - isNative:', isNative);
      
      if (!isNative) {
        console.log('[AdMob] ⚠️ Web platform detected - skipping initialization');
        this.state.isInitialized = false;
        return false;
      }

      // Skip if already initialized
      if (this.state.isInitialized) {
        console.log('[AdMob] ✅ Already initialized');
        return true;
      }

      // Vérification des IDs de production
      console.log('[AdMob] 🔍 Validation IDs production:');
      console.log('[AdMob] - Ad Unit:', this.REWARDED_AD_ID);
      
      if (this.REWARDED_AD_ID.includes('3940256099942544')) {
        throw new Error('ID de test détecté en mode production');
      }
      
      // Initialisation AdMob en mode production
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false
      });
      
      this.state.isInitialized = true;
      this.state.lastError = null;
      this.state.connectivityStatus = 'connected';
      console.log('[AdMob] ✅ Initialisé en mode production');
      
      // Test de connectivité post-initialisation
      await this.testConnectivity();
      
      return true;
    } catch (error) {
      console.error('[AdMob] ❌ Échec initialisation:', error);
      this.state.lastError = this.getReadableError(error as Error);
      this.state.isInitialized = false;
      this.state.connectivityStatus = 'disconnected';
      return false;
    }
  }

  static async testConnectivity(): Promise<boolean> {
    try {
      if (!navigator.onLine) {
        this.state.connectivityStatus = 'disconnected';
        return false;
      }

      // Test simple de connectivité
      await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      this.state.connectivityStatus = 'connected';
      return true;
    } catch (error) {
      this.state.connectivityStatus = 'disconnected';
      return false;
    }
  }

  static async loadRewardedAd(userId: string, rewardType: string, rewardAmount: number, retryCount: number = 0): Promise<boolean> {
    // Vérifications préliminaires simplifiées
    if (!Capacitor.isNativePlatform()) {
      this.state.lastError = 'Publicités disponibles uniquement sur mobile';
      return false;
    }

    if (this.state.isAdLoading || this.state.isAdLoaded) {
      return this.state.isAdLoaded;
    }

    try {
      // Initialisation si nécessaire
      if (!this.state.isInitialized && !(await this.initialize())) {
        throw new Error('Échec initialisation AdMob');
      }

      this.state.isAdLoading = true;
      this.state.lastError = null;

      console.log(`[AdMob] Chargement publicité (tentative ${retryCount + 1})`);
      
      // Configuration simplifiée
      const options: ExtendedRewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: false
      };

      await AdMob.prepareRewardVideoAd(options);
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      
      console.log('[AdMob] ✅ Publicité chargée avec succès');
      return true;
      
    } catch (error) {
      console.error('[AdMob] ❌ Erreur chargement:', error);
      
      this.state.isAdLoading = false;
      this.state.lastError = this.getReadableError(error as Error);
      
      // Retry si erreur réseau
      if (retryCount < 2 && this.shouldRetry(error as Error)) {
        console.log(`[AdMob] 🔄 Nouvelle tentative (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    
    console.log('[AdMob] 🔍 Analyse d\'erreur:', {
      originalMessage: error.message,
      lowerMessage: message,
      adUnitUsed: this.REWARDED_AD_ID
    });
    
    if (message.includes('doubleclick.net') || message.includes('failed to connect')) {
      return 'Connexion impossible aux serveurs publicitaires. Vérifiez votre connexion internet.';
    }
    
    if (message.includes('no_fill') || message.includes('no ad to show')) {
      console.log('[AdMob] 📊 Erreur NO_FILL détectée - cela peut indiquer:');
      console.log('[AdMob] - Inventaire publicitaire insuffisant');
      console.log('[AdMob] - Configuration AdMob incomplète');
      console.log('[AdMob] - Géolocalisation non supportée');
      console.log('[AdMob] - App ID ou Ad Unit ID incorrect');
      return 'Aucune publicité disponible pour le moment. Vérifiez votre configuration AdMob.';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Problème de réseau. Vérifiez votre connexion internet.';
    }
    
    if (message.includes('timeout')) {
      return 'Timeout lors du chargement de la publicité. Réessayez.';
    }
    
    if (message.includes('ad unit') || message.includes('invalid') || message.includes('test')) {
      console.error('[AdMob] ⚠️ Erreur de configuration détectée!');
      console.error('[AdMob] - Vérifiez que l\'Ad Unit ID existe dans votre console AdMob');
      console.error('[AdMob] - Vérifiez que l\'app est bien liée à AdMob');
      console.error('[AdMob] - Current Ad Unit ID:', this.REWARDED_AD_ID);
      return 'Configuration publicitaire incorrecte. Vérifiez votre console AdMob.';
    }
    
    console.warn('[AdMob] ⚠️ Erreur non catégorisée:', message);
    return 'Erreur lors du chargement de la publicité. Réessayez plus tard.';
  }

  static async showRewardedAd(userId: string, rewardType: string, rewardAmount: number): Promise<AdWatchResult> {
    try {
      console.log(`[AdMob] 🎯 Début affichage publicité`);
      
      // Vérifications de base
      if (!await Capacitor.isNativePlatform()) {
        return { 
          success: false, 
          rewarded: false, 
          error: 'Publicités disponibles uniquement sur mobile' 
        };
      }

      // Chargement de la publicité si nécessaire
      if (!this.state.isAdLoaded) {
        const loaded = await this.loadRewardedAd(userId, rewardType, rewardAmount);
        if (!loaded) {
          return { 
            success: false, 
            rewarded: false, 
            error: this.state.lastError || 'Impossible de charger la publicité' 
          };
        }
      }

      console.log(`[AdMob] 🎬 Affichage de la publicité`);
      const result = await AdMob.showRewardVideoAd();
      
      // Vérification de la récompense
      const wasRewarded = !!(result && typeof result === 'object' && 'type' in result && 'amount' in result);
      
      if (wasRewarded) {
        console.log(`[AdMob] ✅ Récompense accordée`);
        // La récompense sera gérée par l'edge function via SSV
      } else {
        console.log(`[AdMob] ❌ Publicité fermée prématurément`);
      }

      // Nettoyage
      this.cleanup();
      
      return { 
        success: true, 
        rewarded: wasRewarded 
      };

    } catch (error) {
      console.error('[AdMob] 💥 Erreur affichage:', error);
      this.state.lastError = this.getReadableError(error as Error);
      this.cleanup();
      
      return { 
        success: false, 
        rewarded: false, 
        error: this.state.lastError 
      };
    }
  }

  static cleanup(): void {
    this.state.isAdLoaded = false;
    this.state.isAdLoading = false;
  }

  static async preloadAd(userId?: string, rewardType?: string, rewardAmount?: number): Promise<void> {
    if (userId && rewardType && rewardAmount && !this.state.isAdLoaded && !this.state.isAdLoading) {
      // Préchargement silencieux en arrière-plan
      setTimeout(() => {
        this.loadRewardedAd(userId, rewardType, rewardAmount).catch(() => {
          // Échec silencieux du préchargement
        });
      }, 5000);
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
      configuration: {
        appId: 'ca-app-pub-4824355487707598~3701914540',
        adUnitId: this.REWARDED_AD_ID,
        isTestMode: this.IS_DEV
      },
      validation: {
        isUsingTestIds: this.REWARDED_AD_ID.includes('3940256099942544'),
        isProductionMode: !this.IS_DEV,
        idsMatch: true
      },
      environment: 'production',
      timestamp: new Date().toISOString()
    };
  }
}
