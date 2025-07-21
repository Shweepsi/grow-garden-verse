
import { AdMob, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface ExtendedRewardAdOptions extends RewardAdOptions {
  serverSideVerificationOptions?: {
    userId: string;
    customData: string;
  };
}

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
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

  private static state: AdMobState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null
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

  static async loadRewardedAd(userId: string, rewardType: string, rewardAmount: number, retryCount: number = 0): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Not on native platform - ads not available');
      this.state.lastError = 'Publicités disponibles uniquement sur mobile';
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

      console.log(`AdMob: Loading rewarded ad (attempt ${retryCount + 1})...`);
      
      // Create properly formatted custom data
      const customData = JSON.stringify({
        user_id: userId,
        reward_type: rewardType,
        reward_amount: rewardAmount
      });

      const options: ExtendedRewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: __DEV__,
        serverSideVerificationOptions: {
          userId: userId,
          customData: customData
        }
      };

      console.log('AdMob: Loading with SSV options:', options.serverSideVerificationOptions);

      await AdMob.prepareRewardVideoAd(options);
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      
      console.log('AdMob: Rewarded ad loaded successfully with SSV options');
      return true;
    } catch (error) {
      console.error('AdMob: Error loading rewarded ad:', error);
      this.state.isAdLoading = false;
      this.state.lastError = (error as Error).message;
      
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
      'internal'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
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

      console.log('AdMob: Showing rewarded ad with SSV for user:', userId);
      
      const result = await AdMob.showRewardVideoAd();
      
      console.log('AdMob: Ad watched successfully, SSV should handle validation:', result);
      
      // AdMob handles server validation automatically via SSV
      this.state.isAdLoaded = false;
      
      // Preload next ad
      setTimeout(() => this.preloadAd(userId, rewardType, rewardAmount), 1000);
      
      return { success: true, rewarded: true };
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

  static getState(): AdMobState {
    return { ...this.state };
  }

  static async preloadAd(userId?: string, rewardType?: string, rewardAmount?: number): Promise<void> {
    if (!this.state.isAdLoaded && !this.state.isAdLoading && userId && rewardType && rewardAmount) {
      console.log('AdMob: Preloading ad with SSV options...');
      await this.loadRewardedAd(userId, rewardType, rewardAmount);
    }
  }

  static cleanup(): void {
    console.log('AdMob: Cleanup method called');
  }
}
