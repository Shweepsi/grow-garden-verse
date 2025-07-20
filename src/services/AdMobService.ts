
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
}

export class AdMobService {
  private static readonly REWARDED_AD_ID = __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917' // Test ID Google officiel
    : 'ca-app-pub-4824355487707598/1018150693'; // Production ID

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null
  };

  private static eventListeners: { [key: string]: any } = {};

  static async initialize(): Promise<boolean> {
    if (this.state.isInitialized || !Capacitor.isNativePlatform()) {
      console.log('AdMob: Already initialized or not on native platform');
      return this.state.isInitialized;
    }

    try {
      console.log('AdMob: Initializing...');
      
      await AdMob.initialize({
        testingDevices: __DEV__ ? [] : [], // Pas d'ID spécifique en test
        initializeForTesting: __DEV__
      });
      
      // Configurer les listeners d'événements
      this.setupEventListeners();
      
      this.state.isInitialized = true;
      this.state.lastError = null;
      console.log('AdMob: Initialized successfully');
      return true;
    } catch (error) {
      console.error('AdMob: Failed to initialize:', error);
      this.state.lastError = (error as Error).message;
      return false;
    }
  }

  private static setupEventListeners(): void {
    console.log('AdMob: Setting up event listeners');

    // Listener pour le chargement réussi
    this.eventListeners.onRewardedVideoAdLoaded = AdMob.addListener('onRewardedVideoAdLoaded', (info: AdLoadInfo) => {
      console.log('AdMob: Rewarded ad loaded successfully', info);
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      this.state.lastError = null;
    });

    // Listener pour les erreurs de chargement
    this.eventListeners.onRewardedVideoAdFailedToLoad = AdMob.addListener('onRewardedVideoAdFailedToLoad', (error: AdMobError) => {
      console.error('AdMob: Failed to load rewarded ad:', error);
      this.state.isAdLoaded = false;
      this.state.isAdLoading = false;
      this.state.lastError = error.message || 'Unknown error';
    });

    // Listener pour l'affichage de la pub
    this.eventListeners.onRewardedVideoAdShowed = AdMob.addListener('onRewardedVideoAdShowed', () => {
      console.log('AdMob: Rewarded ad showed');
    });

    // Listener pour la fermeture de la pub
    this.eventListeners.onRewardedVideoAdClosed = AdMob.addListener('onRewardedVideoAdClosed', () => {
      console.log('AdMob: Rewarded ad closed');
      this.state.isAdLoaded = false; // La pub est consommée
    });

    // Listener pour la récompense
    this.eventListeners.onRewarded = AdMob.addListener('onRewarded', (reward: AdMobRewardItem) => {
      console.log('AdMob: User rewarded:', reward);
    });
  }

  static async loadRewardedAd(retryCount: number = 0): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Not on native platform - simulating load success');
      this.state.isAdLoaded = true;
      return true;
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
      // S'assurer que AdMob est initialisé
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AdMob not initialized');
      }

      this.state.isAdLoading = true;
      this.state.lastError = null;

      console.log(`AdMob: Loading rewarded ad (attempt ${retryCount + 1})...`);
      
      const options: RewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: __DEV__
      };

      await AdMob.prepareRewardVideoAd(options);
      
      // Attendre un peu pour que l'événement soit déclenché
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.state.isAdLoaded) {
        console.log('AdMob: Rewarded ad loaded successfully');
        return true;
      } else if (this.state.lastError && retryCount < 2) {
        console.log(`AdMob: Retrying load due to error: ${this.state.lastError}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s avant retry
        return this.loadRewardedAd(retryCount + 1);
      } else {
        throw new Error(this.state.lastError || 'Ad failed to load within timeout');
      }
    } catch (error) {
      console.error('AdMob: Error loading rewarded ad:', error);
      this.state.isAdLoading = false;
      this.state.lastError = (error as Error).message;
      
      // Retry logic pour certaines erreurs
      if (retryCount < 2 && this.shouldRetry(error as Error)) {
        console.log(`AdMob: Retrying load (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.loadRewardedAd(retryCount + 1);
      }
      
      return false;
    }
  }

  private static shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'no_fill',
      'internal'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
  }

  static async showRewardedAd(): Promise<{ success: boolean; reward?: AdMobRewardItem; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Web platform - simulating ad watch');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 } 
      };
    }

    try {
      // Charger la pub si elle n'est pas déjà chargée
      if (!this.state.isAdLoaded) {
        console.log('AdMob: Ad not loaded, loading now...');
        const loaded = await this.loadRewardedAd();
        if (!loaded) {
          return { 
            success: false, 
            error: this.state.lastError || 'Failed to load ad' 
          };
        }
      }

      console.log('AdMob: Showing rewarded ad...');
      await AdMob.showRewardVideoAd();
      
      // La récompense sera gérée par l'événement onRewarded
      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 } 
      };
    } catch (error) {
      console.error('AdMob: Error showing rewarded ad:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  // Méthodes utilitaires pour diagnostiquer l'état
  static getState(): AdMobState {
    return { ...this.state };
  }

  static async preloadAd(): Promise<void> {
    if (!this.state.isAdLoaded && !this.state.isAdLoading) {
      console.log('AdMob: Preloading ad...');
      await this.loadRewardedAd();
    }
  }

  static cleanup(): void {
    console.log('AdMob: Cleaning up event listeners');
    Object.values(this.eventListeners).forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.eventListeners = {};
  }
}
