
import { AdMob, RewardedAdOptions, AdMobRewardItem, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdMobService {
  private static readonly REWARDED_AD_ID = __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917' // Test ID
    : 'ca-app-pub-4824355487707598/1018150693'; // Your production ID

  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await AdMob.initialize({
        requestTrackingAuthorization: true,
        testingDevices: __DEV__ ? ['YOUR_DEVICE_ID_FOR_TESTING'] : [],
        initializeForTesting: __DEV__
      });
      
      this.isInitialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      throw error;
    }
  }

  static async loadRewardedAd(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob not available on web platform');
      return false;
    }

    try {
      const options: RewardedAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: __DEV__
      };

      await AdMob.prepareRewardedVideoAd(options);
      console.log('Rewarded ad loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load rewarded ad:', error);
      return false;
    }
  }

  static async showRewardedAd(): Promise<{ success: boolean; reward?: AdMobRewardItem; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob not available on web platform - using simulation');
      // Simulate ad watching on web for development
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 } 
      };
    }

    try {
      await this.initialize();
      
      const isLoaded = await this.loadRewardedAd();
      if (!isLoaded) {
        return { success: false, error: 'Failed to load ad' };
      }

      return new Promise((resolve) => {
        let resolved = false;

        // Listen for ad events
        const removeListeners = [
          AdMob.addListener('onRewardedVideoAdLoaded', (info: AdLoadInfo) => {
            console.log('Rewarded ad loaded:', info);
          }),

          AdMob.addListener('onRewardedVideoAdFailedToLoad', (error: AdMobError) => {
            console.error('Rewarded ad failed to load:', error);
            if (!resolved) {
              resolved = true;
              resolve({ success: false, error: error.message });
            }
          }),

          AdMob.addListener('onRewardedVideoAdShowed', () => {
            console.log('Rewarded ad showed');
          }),

          AdMob.addListener('onRewardedVideoAdFailedToShow', (error: AdMobError) => {
            console.error('Rewarded ad failed to show:', error);
            if (!resolved) {
              resolved = true;
              resolve({ success: false, error: error.message });
            }
          }),

          AdMob.addListener('onRewardedVideoAdDismissed', () => {
            console.log('Rewarded ad dismissed without reward');
            if (!resolved) {
              resolved = true;
              resolve({ success: false, error: 'Ad dismissed without completion' });
            }
          }),

          AdMob.addListener('onRewardedVideoAdReward', (reward: AdMobRewardItem) => {
            console.log('Rewarded ad reward received:', reward);
            if (!resolved) {
              resolved = true;
              resolve({ success: true, reward });
            }
          })
        ];

        // Show the ad
        AdMob.showRewardedVideoAd().catch((error) => {
          console.error('Error showing rewarded ad:', error);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: error.message });
          }
        });

        // Clean up listeners after 60 seconds (timeout)
        setTimeout(() => {
          removeListeners.forEach(remove => remove());
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: 'Ad timeout' });
          }
        }, 60000);
      });
    } catch (error) {
      console.error('Error in showRewardedAd:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Check if we're in development mode
declare const __DEV__: boolean;
