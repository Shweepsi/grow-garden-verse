import { AdMob, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface SimpleAdState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
}

interface AdResult {
  success: boolean;
  rewarded: boolean;
  error?: string;
}

/**
 * Service AdMob simplifié et optimisé
 * Se concentre uniquement sur l'affichage des publicités
 * La gestion des récompenses est déléguée à l'edge function
 */
export class AdMobSimpleService {
  private static readonly AD_UNIT_ID = 'ca-app-pub-4824355487707598/1680280074';
  
  private static state: SimpleAdState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null
  };

  static async initialize(): Promise<boolean> {
    try {
      if (!await Capacitor.isNativePlatform()) {
        return false;
      }

      if (this.state.isInitialized) {
        return true;
      }

      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false
      });

      this.state.isInitialized = true;
      this.state.lastError = null;
      
      console.log('[AdMobSimple] ✅ Initialisé');
      return true;
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur initialisation:', error);
      this.state.lastError = this.getErrorMessage(error as Error);
      return false;
    }
  }

  static async loadAd(): Promise<boolean> {
    try {
      if (!await this.initialize()) {
        return false;
      }

      if (this.state.isAdLoaded || this.state.isAdLoading) {
        return this.state.isAdLoaded;
      }

      this.state.isAdLoading = true;
      this.state.lastError = null;

      const options: RewardAdOptions = {
        adId: this.AD_UNIT_ID,
        isTesting: false
      };

      await AdMob.prepareRewardVideoAd(options);
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      
      console.log('[AdMobSimple] ✅ Publicité chargée');
      return true;
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur chargement:', error);
      this.state.isAdLoading = false;
      this.state.lastError = this.getErrorMessage(error as Error);
      return false;
    }
  }

  static async showAd(): Promise<AdResult> {
    try {
      // Chargement si nécessaire
      if (!this.state.isAdLoaded) {
        const loaded = await this.loadAd();
        if (!loaded) {
          return {
            success: false,
            rewarded: false,
            error: this.state.lastError || 'Impossible de charger la publicité'
          };
        }
      }

      console.log('[AdMobSimple] 🎬 Affichage publicité');
      const result = await AdMob.showRewardVideoAd();
      
      // Vérification si l'utilisateur a été récompensé
      const wasRewarded = !!(result && typeof result === 'object' && 'type' in result && 'amount' in result);
      
      // Nettoyage
      this.cleanup();
      
      // Préchargement pour la prochaine fois
      this.preloadNext();
      
      return {
        success: true,
        rewarded: wasRewarded
      };
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur affichage:', error);
      this.state.lastError = this.getErrorMessage(error as Error);
      this.cleanup();
      
      return {
        success: false,
        rewarded: false,
        error: this.state.lastError
      };
    }
  }

  private static cleanup(): void {
    this.state.isAdLoaded = false;
    this.state.isAdLoading = false;
  }

  private static preloadNext(): void {
    // Préchargement silencieux après 5 secondes
    setTimeout(() => {
      this.loadAd().catch(() => {
        // Échec silencieux
      });
    }, 5000);
  }

  private static getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('no_fill') || message.includes('no ad')) {
      return 'Aucune publicité disponible pour le moment';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Problème de connexion internet';
    }
    
    if (message.includes('timeout')) {
      return 'Timeout lors du chargement de la publicité';
    }
    
    return 'Erreur lors du chargement de la publicité';
  }

  static getState(): SimpleAdState {
    return { ...this.state };
  }

  static getDiagnostics() {
    return {
      adUnitId: this.AD_UNIT_ID,
      state: this.state,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    };
  }
}