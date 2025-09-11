import { AdMob, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { AdMonitoringService } from './AdMonitoringService';

interface SimpleAdState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  lastError: string | null;
  lastErrorCode: string | null;
  isTestMode: boolean;
  retryCount: number;
  lastRetryAt: number | null;
  errorCount: number;
  consecutiveFailures: number;
  lastRefreshAt: number | null;
  needsRefresh: boolean;
}

interface AdResult {
  success: boolean;
  rewarded: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Service AdMob simplifié et optimisé
 * Se concentre uniquement sur l'affichage des publicités
 * La gestion des récompenses est déléguée à l'edge function
 */
export class AdMobSimpleService {
  private static readonly AD_UNIT_ID = 'ca-app-pub-4824355487707598/1680280074';
  private static readonly TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Google test ID
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
  private static readonly MAX_CONSECUTIVE_FAILURES = 2; // Force refresh after N failures
  private static readonly REFRESH_COOLDOWN = 10 * 1000; // 10 seconds between refreshes
  
  private static state: SimpleAdState = {
    isInitialized: false,
    isAdLoaded: false,
    isAdLoading: false,
    lastError: null,
    lastErrorCode: null,
    isTestMode: false,
    retryCount: 0,
    lastRetryAt: null,
    errorCount: 0,
    consecutiveFailures: 0,
    lastRefreshAt: null,
    needsRefresh: false
  };

  static async initialize(testMode: boolean = false): Promise<boolean> {
    try {
      if (!await Capacitor.isNativePlatform()) {
        console.log('[AdMobSimple] ❌ Pas sur plateforme native');
        this.state.lastError = 'AdMob nécessite une plateforme native (iOS/Android)';
        return false;
      }

      if (this.state.isInitialized && this.state.isTestMode === testMode) {
        return true;
      }

      this.state.isTestMode = testMode;
      
      await AdMob.initialize({
        testingDevices: testMode ? ['DEVICE_ID_EMULATOR'] : [],
        initializeForTesting: testMode
      });

      this.state.isInitialized = true;
      this.state.lastError = null;
      this.state.lastErrorCode = null;
      
      console.log(`[AdMobSimple] ✅ Initialisé (${testMode ? 'TEST' : 'PROD'})`);
      return true;
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur initialisation:', error);
      const { message, code } = this.parseError(error as Error);
      this.state.lastError = message;
      this.state.lastErrorCode = code;
      return false;
    }
  }

  static async loadAd(retryCount: number = 0): Promise<boolean> {
    try {
      // Vérifier si un refresh est nécessaire
      if (this.state.needsRefresh && this.canRefresh()) {
        console.log('[AdMobSimple] 🔄 Rafraîchissement AdMob nécessaire...');
        await this.forceRefresh();
      }

      if (!await this.initialize(this.state.isTestMode)) {
        return false;
      }

      if (this.state.isAdLoaded || this.state.isAdLoading) {
        return this.state.isAdLoaded;
      }

      this.state.isAdLoading = true;
      this.state.lastError = null;
      this.state.lastErrorCode = null;

      const adUnitId = this.state.isTestMode ? this.TEST_AD_UNIT_ID : this.AD_UNIT_ID;
      const options: RewardAdOptions = {
        adId: adUnitId,
        isTesting: this.state.isTestMode
      };

      console.log(`[AdMobSimple] 🔄 Chargement pub (${this.state.isTestMode ? 'TEST' : 'PROD'}): ${adUnitId}`);
      AdMonitoringService.startAdLoad();
      await AdMob.prepareRewardVideoAd(options);
      
      this.state.isAdLoaded = true;
      this.state.isAdLoading = false;
      this.state.retryCount = 0;
      this.state.consecutiveFailures = 0; // Reset sur succès
      
      AdMonitoringService.recordAdSuccess();
      console.log('[AdMobSimple] ✅ Publicité chargée');
      return true;
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur chargement:', error);
      this.state.isAdLoading = false;
      this.state.consecutiveFailures++;
      
      const { message, code } = this.parseError(error as Error);
      this.state.lastError = message;
      this.state.lastErrorCode = code;
      
      AdMonitoringService.recordAdFailure(code, message);

      // Décider si un refresh est nécessaire
      if (this.shouldTriggerRefresh(error as Error)) {
        this.state.needsRefresh = true;
        console.log(`[AdMobSimple] 🔄 Refresh programmé après ${this.state.consecutiveFailures} échecs`);
      }

      // Retry logic pour erreurs récupérables
      if (this.shouldRetry(error as Error, retryCount)) {
        const delay = this.RETRY_DELAYS[retryCount] || 10000;
        console.log(`[AdMobSimple] 🔄 Retry ${retryCount + 1}/${this.MAX_RETRY_COUNT} dans ${delay}ms`);
        
        this.state.retryCount = retryCount + 1;
        this.state.lastRetryAt = Date.now();
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.loadAd(retryCount + 1);
            resolve(result);
          }, delay);
        });
      }
      
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
            error: this.state.lastError || 'Impossible de charger la publicité',
            errorCode: this.state.lastErrorCode || undefined
          };
        }
      }

      console.log(`[AdMobSimple] 🎬 Affichage publicité (${this.state.isTestMode ? 'TEST' : 'PROD'})`);
      const result = await AdMob.showRewardVideoAd();
      
      // Vérification si l'utilisateur a été récompensé
      const wasRewarded = !!(result && typeof result === 'object' && 'type' in result && 'amount' in result);
      
      console.log(`[AdMobSimple] 🎯 Résultat: récompensé=${wasRewarded}`, result);
      
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
      const { message, code } = this.parseError(error as Error);
      this.state.lastError = message;
      this.state.lastErrorCode = code;
      this.cleanup();
      
      return {
        success: false,
        rewarded: false,
        error: message,
        errorCode: code
      };
    }
  }

  private static cleanup(): void {
    this.state.isAdLoaded = false;
    this.state.isAdLoading = false;
  }

  private static preloadNext(): void {
    // Déléguer le préchargement au service dédié
    // Le service AdPreloadService gérera la logique de préchargement
    console.log('[AdMobSimple] 📲 Préchargement délégué au service');
  }

  private static shouldRetry(error: Error, currentRetryCount: number): boolean {
    if (currentRetryCount >= this.MAX_RETRY_COUNT) {
      return false;
    }

    const message = error.message.toLowerCase();
    
    // Retry pour NO_FILL et erreurs réseau
    return message.includes('no_fill') || 
           message.includes('no ad') ||
           message.includes('network') ||
           message.includes('timeout') ||
           message.includes('connection');
  }

  private static parseError(error: Error): { message: string; code: string } {
    const errorStr = error.toString().toLowerCase();
    const fullError = error.toString();
    let code = 'UNKNOWN';
    let message = 'Erreur lors du chargement de la publicité';

    // Log detailed error information for UNKNOWN errors
    console.error('[AdMobSimple] 🔍 Detailed error analysis:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullString: fullError,
      lowerString: errorStr,
      timestamp: new Date().toISOString()
    });

    // Codes d'erreur AdMob courants
    if (errorStr.includes('no_fill') || errorStr.includes('no ad available')) {
      code = 'NO_FILL';
      message = '❌ Aucune publicité disponible actuellement\n💡 Ceci est normal pour les nouvelles applications';
    } else if (errorStr.includes('network') || errorStr.includes('connection')) {
      code = 'NETWORK_ERROR';
      message = '🌐 Problème de connexion internet';
    } else if (errorStr.includes('timeout')) {
      code = 'TIMEOUT';
      message = '⏱️ Timeout lors du chargement';
    } else if (errorStr.includes('internal_error')) {
      code = 'INTERNAL_ERROR';
      message = '⚙️ Erreur interne AdMob';
    } else if (errorStr.includes('invalid_request')) {
      code = 'INVALID_REQUEST';
      message = '❓ Configuration publicitaire invalide';
    } else if (errorStr.includes('app_not_approved')) {
      code = 'APP_NOT_APPROVED';
      message = '📱 Application en attente d\'approbation AdMob';
    } else {
      // Enhanced UNKNOWN error handling
      console.warn('[AdMobSimple] ⚠️ UNKNOWN ERROR detected:', {
        originalError: fullError,
        errorType: typeof error,
        hasMessage: !!error.message,
        hasStack: !!error.stack,
        isAdMobError: fullError.includes('AdMob') || fullError.includes('admob'),
        timestamp: new Date().toISOString()
      });
      
      message = '❓ Erreur inconnue AdMob - Un rafraîchissement sera tenté';
    }

    // Track error counts
    this.state.errorCount++;
    
    return { message, code };
  }

  /**
   * Force un rafraîchissement complet du SDK AdMob
   */
  static async forceRefresh(): Promise<boolean> {
    try {
      console.log('[AdMobSimple] 🔄 Rafraîchissement forcé du SDK AdMob...');
      
      // Nettoyer l'état actuel
      this.cleanup();
      this.state.isInitialized = false;
      this.state.needsRefresh = false;
      this.state.lastRefreshAt = Date.now();
      
      // Attendre un délai pour éviter les conflits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Réinitialiser le SDK
      const success = await this.initialize(this.state.isTestMode);
      
      if (success) {
        console.log('[AdMobSimple] ✅ Rafraîchissement réussi');
        this.state.consecutiveFailures = 0;
      } else {
        console.error('[AdMobSimple] ❌ Échec du rafraîchissement');
      }
      
      return success;
    } catch (error) {
      console.error('[AdMobSimple] ❌ Erreur lors du rafraîchissement:', error);
      return false;
    }
  }

  /**
   * Vérifie si un refresh peut être déclenché (cooldown)
   */
  private static canRefresh(): boolean {
    if (!this.state.lastRefreshAt) return true;
    return Date.now() - this.state.lastRefreshAt > this.REFRESH_COOLDOWN;
  }

  /**
   * Détermine si un refresh doit être déclenché en fonction de l'erreur
   */
  private static shouldTriggerRefresh(error: Error): boolean {
    const errorStr = error.message.toLowerCase();
    
    // Refresh sur erreurs critiques
    if (errorStr.includes('internal_error') || 
        errorStr.includes('invalid_request') ||
        errorStr.includes('unknown')) {
      return true;
    }
    
    // Refresh après N échecs consécutifs
    if (this.state.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return true;
    }
    
    return false;
  }

  private static getErrorMessage(error: Error): string {
    return this.parseError(error).message;
  }

  static getState(): SimpleAdState {
    return { ...this.state };
  }

  static getDiagnostics() {
    return {
      adUnitId: this.state.isTestMode ? this.TEST_AD_UNIT_ID : this.AD_UNIT_ID,
      testAdUnitId: this.TEST_AD_UNIT_ID,
      prodAdUnitId: this.AD_UNIT_ID,
      state: this.state,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      retryInfo: {
        maxRetries: this.MAX_RETRY_COUNT,
        currentRetries: this.state.retryCount,
        lastRetryAt: this.state.lastRetryAt,
        retryDelays: this.RETRY_DELAYS
      },
      errorTracking: {
        totalErrors: this.state.errorCount,
        consecutiveFailures: this.state.consecutiveFailures,
        needsRefresh: this.state.needsRefresh,
        lastRefreshAt: this.state.lastRefreshAt,
        maxConsecutiveFailures: this.MAX_CONSECUTIVE_FAILURES,
        refreshCooldown: this.REFRESH_COOLDOWN
      },
      monitoring: AdMonitoringService.exportDiagnostics()
    };
  }

  static resetErrorTracking(): void {
    this.state.errorCount = 0;
    this.state.consecutiveFailures = 0;
    this.state.lastRefreshAt = null;
    this.state.needsRefresh = false;
    console.log('[AdMobSimple] 🔄 Compteurs d\'erreur réinitialisés');
  }

  static setTestMode(enabled: boolean): void {
    if (this.state.isTestMode !== enabled) {
      this.state.isTestMode = enabled;
      this.state.isInitialized = false; // Force réinitialisation
      this.cleanup();
      console.log(`[AdMobSimple] 🔧 Mode test ${enabled ? 'activé' : 'désactivé'}`);
    }
  }

  static isTestMode(): boolean {
    return this.state.isTestMode;
  }

  /**
   * Force un rafraîchissement manuel du SDK (utile pour les diagnostics)
   */
  static async manualRefresh(): Promise<boolean> {
    console.log('[AdMobSimple] 🔧 Rafraîchissement manuel demandé');
    this.state.needsRefresh = true;
    return await this.forceRefresh();
  }

  /**
   * Vérifie si un refresh est recommandé
   */
  static shouldRecommendRefresh(): boolean {
    return this.state.consecutiveFailures >= 1 || this.state.needsRefresh;
  }
}