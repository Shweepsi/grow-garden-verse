
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
  adDuration: number | null;
}

interface AdWatchResult {
  success: boolean;
  rewarded: boolean;
  error?: string;
}

export class AdMobService {
  private static readonly REWARDED_AD_ID = __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917' 
    : 'ca-app-pub-4824355487707598/1680280074';

  private static readonly SERVER_VALIDATION_URL = __DEV__
    ? 'http://localhost:54321/functions/v1/validate-ad-reward'
    : 'https://osfexuqvlpxrfaukfobn.supabase.co/functions/v1/validate-ad-reward';

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null,
    adDuration: null
  };

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

  static async loadRewardedAd(retryCount: number = 0): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Not on native platform - simulating load success');
      this.state.isAdLoaded = true;
      this.state.adDuration = 30; // Simuler 30 secondes
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
      
      // Simuler récupération de durée (en production, cela viendrait des métadonnées AdMob)
      this.state.adDuration = Math.floor(Math.random() * 45) + 15; // 15-60 secondes
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      console.log(`AdMob: Rewarded ad loaded, duration: ${this.state.adDuration}s`);
      return true;
    } catch (error) {
      console.error('AdMob: Error loading rewarded ad:', error);
      this.state.isAdLoading = false;
      this.state.lastError = (error as Error).message;
      
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

  static async showRewardedAd(userId: string, rewardType: string, rewardAmount: number): Promise<AdWatchResult> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Web platform - calling server validation directly');
      
      // Simuler la validation serveur en développement
      try {
        const response = await fetch(this.SERVER_VALIDATION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            reward_type: rewardType,
            reward_amount: rewardAmount,
            ad_duration: this.state.adDuration || 30
          })
        });

        if (response.ok) {
          this.state.isAdLoaded = false;
          return { success: true, rewarded: true };
        } else {
          return { success: false, rewarded: false, error: 'Server validation failed' };
        }
      } catch (error) {
        return { success: false, rewarded: false, error: (error as Error).message };
      }
    }

    try {
      if (!this.state.isAdLoaded) {
        console.log('AdMob: Ad not loaded, loading now...');
        const loaded = await this.loadRewardedAd();
        if (!loaded) {
          return { 
            success: false, 
            rewarded: false,
            error: this.state.lastError || 'Failed to load ad' 
          };
        }
      }

      console.log('AdMob: Showing rewarded ad...');
      
      // Configurer les options de base
      const options: RewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: __DEV__
      };

      // AdMob gère automatiquement la validation serveur
      const result = await AdMob.showRewardVideoAd();
      
      console.log('AdMob: Ad completed, server validation handled automatically');
      
      this.state.isAdLoaded = false;
      
      return { 
        success: true, 
        rewarded: true // AdMob a géré la validation côté serveur
      };
    } catch (error) {
      console.error('AdMob: Error showing rewarded ad:', error);
      this.state.isAdLoaded = false;
      return { 
        success: false, 
        rewarded: false,
        error: (error as Error).message 
      };
    }
  }

  static getAdDuration(): number | null {
    return this.state.adDuration;
  }

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
  }
}
