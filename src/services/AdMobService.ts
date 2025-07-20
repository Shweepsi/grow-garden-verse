import { AdMob, RewardAdOptions, AdMobRewardItem } from '@capacitor-community/admob';
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
      const options: RewardAdOptions = {
        adId: this.REWARDED_AD_ID,
        isTesting: __DEV__
      };

      await AdMob.prepareRewardVideoAd(options);
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

      // Show the ad and wait for result
      await AdMob.showRewardVideoAd();
      
      // In a real implementation, we would listen for events
      // For now, we assume success
      return { 
        success: true, 
        reward: { type: 'coins', amount: 100 } 
      };
    } catch (error) {
      console.error('Error in showRewardedAd:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}