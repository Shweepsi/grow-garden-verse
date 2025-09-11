interface RetryConfig {
  maxRetries: number;
  delays: number[];
  shouldRetry: (error: Error, attempt: number) => boolean;
}

interface RetryState {
  attempts: number;
  lastAttempt: number;
  lastError: Error | null;
  totalRetries: number;
}

export class AdRetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    delays: [2000, 5000, 10000], // 2s, 5s, 10s
    shouldRetry: (error, attempt) => {
      const message = error.message.toLowerCase();
      return (
        attempt < 3 &&
        (message.includes('no_fill') ||
         message.includes('network') ||
         message.includes('timeout') ||
         message.includes('connection'))
      );
    }
  };

  private static state: RetryState = {
    attempts: 0,
    lastAttempt: 0,
    lastError: null,
    totalRetries: 0
  };

  /**
   * Exécute une fonction avec retry intelligent et refresh automatique
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    this.state.attempts = 0;
    this.state.lastError = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        this.state.attempts = attempt + 1;
        this.state.lastAttempt = Date.now();
        
        const result = await operation();
        
        // Succès - reset des compteurs
        if (attempt > 0) {
          this.state.totalRetries += attempt;
          console.log(`[AdRetryService] ✅ Succès après ${attempt} tentatives`);
        }
        
        return result;
      } catch (error) {
        const err = error as Error;
        this.state.lastError = err;
        
        console.warn(`[AdRetryService] ❌ Tentative ${attempt + 1}/${finalConfig.maxRetries + 1} échouée:`, err.message);
        
        // Vérifier si on doit retry
        if (attempt < finalConfig.maxRetries && finalConfig.shouldRetry(err, attempt)) {
          const delay = finalConfig.delays[attempt] || finalConfig.delays[finalConfig.delays.length - 1];
          console.log(`[AdRetryService] 🔄 Retry dans ${delay}ms...`);
          
          await this.delay(delay);
          continue;
        }
        
        // Pas de retry possible - l'erreur sera propagée
        // Le refresh sera géré au niveau de AdMobSimpleService
        this.state.totalRetries += attempt;
        throw err;
      }
    }
    
    throw this.state.lastError || new Error('Max retries exceeded');
  }

  /**
   * Messages d'erreur explicites et actionables
   */
  static getActionableErrorMessage(error: Error): {
    title: string;
    message: string;
    action?: string;
    severity: 'low' | 'medium' | 'high';
  } {
    const errorStr = error.message.toLowerCase();
    
    if (errorStr.includes('no_fill') || errorStr.includes('no ad')) {
      return {
        title: 'Aucune publicité disponible',
        message: 'Aucune publicité n\'est disponible actuellement. Ceci est normal pour les nouvelles applications.',
        action: 'Réessayez dans quelques minutes ou activez le mode test',
        severity: 'low'
      };
    }
    
    if (errorStr.includes('network') || errorStr.includes('connection')) {
      return {
        title: 'Problème de connexion',
        message: 'Impossible de se connecter aux serveurs publicitaires.',
        action: 'Vérifiez votre connexion internet et réessayez',
        severity: 'medium'
      };
    }
    
    if (errorStr.includes('timeout')) {
      return {
        title: 'Délai d\'attente dépassé',
        message: 'Le chargement de la publicité a pris trop de temps.',
        action: 'Vérifiez votre connexion et réessayez',
        severity: 'medium'
      };
    }
    
    if (errorStr.includes('app_not_approved')) {
      return {
        title: 'Application en attente d\'approbation',
        message: 'Votre application attend encore l\'approbation AdMob. Les publicités test sont disponibles.',
        action: 'Patientez ou contactez le support',
        severity: 'high'
      };
    }
    
    if (errorStr.includes('invalid_request')) {
      return {
        title: 'Configuration incorrecte',
        message: 'La configuration publicitaire semble incorrecte. Un rafraîchissement va être tenté.',
        action: 'Si le problème persiste, contactez le support',
        severity: 'high'
      };
    }

    if (errorStr.includes('internal_error')) {
      return {
        title: 'Erreur interne AdMob',
        message: 'Une erreur interne s\'est produite. Le système va rafraîchir la connexion.',
        action: 'Réessayez dans quelques instants',
        severity: 'medium'
      };
    }
    
    // Erreur inconnue
    return {
      title: 'Erreur technique',
      message: 'Une erreur technique inattendue s\'est produite. Un rafraîchissement va être tenté.',
      action: 'Si le problème persiste, essayez le mode test',
      severity: 'medium'
    };
  }

  /**
   * Précharge les publicités en arrière-plan
   */
  static async preloadAd(loadFunction: () => Promise<boolean>): Promise<boolean> {
    try {
      console.log('[AdRetryService] 🔄 Préchargement publicité...');
      
      const result = await this.executeWithRetry(loadFunction, {
        maxRetries: 2, // Moins de retries pour le préchargement
        delays: [1000, 3000]
      });
      
      console.log('[AdRetryService] ✅ Publicité préchargée');
      return result;
    } catch (error) {
      console.warn('[AdRetryService] ⚠️ Échec préchargement (silencieux):', error);
      return false;
    }
  }

  /**
   * Statistiques des retries
   */
  static getStats() {
    return {
      currentAttempts: this.state.attempts,
      lastAttempt: this.state.lastAttempt,
      totalRetries: this.state.totalRetries,
      lastError: this.state.lastError?.message,
      timeSinceLastAttempt: this.state.lastAttempt ? Date.now() - this.state.lastAttempt : null
    };
  }

  /**
   * Reset des statistiques
   */
  static resetStats(): void {
    this.state = {
      attempts: 0,
      lastAttempt: 0,
      lastError: null,
      totalRetries: 0
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}