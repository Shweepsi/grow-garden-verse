
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
}

interface AdWatchResult {
  success: boolean;
  reward?: AdMobRewardItem;
  error?: string;
  actualDuration?: number; // Durée réelle en millisecondes
  estimatedDuration?: number; // Durée estimée en millisecondes
}

export class AdMobService {
  // ID test officiel Google pour les publicités rewarded
  private static readonly REWARDED_AD_ID = __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917' 
    : 'ca-app-pub-4824355487707598/1680280074';

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null
  };

  private static adStartTime: number | null = null;
  private static adEndTime: number | null = null;

  static async initialize(): Promise<boolean> {
    if (this.state.isInitialized || !Capacitor.isNativePlatform()) {
      console.log('AdMob: Already initialized or not on native platform');
      return this.state.isInitialized;
    }

    try {
      console.log('AdMob: Initializing...');
      
      await AdMob.initialize({
        testingDevices: __DEV__ ? [] : [],
        initializeForTesting: __DEV__
      });

      // Écouter les événements AdMob
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
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Événement quand la publicité commence
      AdMob.addListener('onRewardedVideoAdLoaded', () => {
        console.log('AdMob: Rewarded ad loaded');
        this.state.isAdLoaded = true;
        this.state.isAdLoading = false;
      });

      AdMob.addListener('onRewardedVideoAdOpened', () => {
        console.log('AdMob: Rewarded ad opened');
        this.adStartTime = Date.now();
      });

      AdMob.addListener('onRewardedVideoAdClosed', () => {
        console.log('AdMob: Rewarded ad closed');
        this.adEndTime = Date.now();
        this.state.isAdLoaded = false; // Marquer comme non chargée après fermeture
      });

      AdMob.addListener('onRewardedVideoAdFailedToLoad', (error: any) => {
        console.error('AdMob: Failed to load rewarded ad:', error);
        this.state.isAdLoading = false;
        this.state.isAdLoaded = false;
        this.state.lastError = error.message || 'Failed to load ad';
      });

      AdMob.addListener('onRewarded', (reward: AdMobRewardItem) => {
        console.log('AdMob: User rewarded:', reward);
      });

    } catch (error) {
      console.error('AdMob: Error setting up event listeners:', error);
    }
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
      
      // Les événements se chargeront de mettre à jour l'état
      return true;
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

  static async showRewardedAd(): Promise<AdWatchResult> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Web platform - simulating ad watch');
      const simulatedDuration = Math.floor(Math.random() * 25000) + 5000; // Entre 5 et 30 secondes
      await new Promise(resolve => setTimeout(resolve, simulatedDuration));
      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 },
        actualDuration: simulatedDuration,
        estimatedDuration: simulatedDuration
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
        
        // Attendre que la pub soit chargée
        let attempts = 0;
        while (!this.state.isAdLoaded && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (!this.state.isAdLoaded) {
          return { 
            success: false, 
            error: 'Ad failed to load in time' 
          };
        }
      }

      // Reset des timers
      this.adStartTime = null;
      this.adEndTime = null;

      console.log('AdMob: Showing rewarded ad...');
      await AdMob.showRewardVideoAd();
      
      // Attendre que la publicité se termine (avec timeout)
      let waitTime = 0;
      const maxWaitTime = 60000; // 60 secondes maximum
      
      while (this.adEndTime === null && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
      }

      // Calculer la durée réelle
      let actualDuration = 0;
      if (this.adStartTime && this.adEndTime) {
        actualDuration = this.adEndTime - this.adStartTime;
        console.log(`AdMob: Ad watched for ${actualDuration}ms`);
      } else {
        // Fallback si les événements n'ont pas fonctionné
        actualDuration = Math.max(waitTime, 5000); // Minimum 5 secondes
        console.log(`AdMob: Using fallback duration: ${actualDuration}ms`);
      }

      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 },
        actualDuration: actualDuration,
        estimatedDuration: this.estimateAdDuration(actualDuration)
      };
    } catch (error) {
      console.error('AdMob: Error showing rewarded ad:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  private static estimateAdDuration(actualDuration: number): number {
    // Estimer la durée "normale" de la pub basée sur la durée réelle
    if (actualDuration < 8000) return 5000;      // ~5 secondes
    if (actualDuration < 20000) return 15000;    // ~15 secondes
    if (actualDuration < 35000) return 30000;    // ~30 secondes
    return Math.max(actualDuration, 30000);      // 30+ secondes
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
    console.log('AdMob: Cleanup method called');
    if (Capacitor.isNativePlatform()) {
      try {
        AdMob.removeAllListeners();
      } catch (error) {
        console.error('AdMob: Error during cleanup:', error);
      }
    }
  }
}
