interface AdMobEnhancedMetrics {
  totalCallbacks: number;
  validCallbacks: number;
  invalidCallbacks: number;
  signatureValidations: {
    success: number;
    failures: number;
    lastFailureReason?: string;
  };
  rewardMappings: {
    total: number;
    byType: Record<string, number>;
    customDataSuccess: number;
    fallbackMappings: number;
  };
  performance: {
    averageProcessingTime: number;
    slowestCallback: number;
    fastestCallback: number;
  };
  lastUpdated: Date;
}

interface AdMobSSVEvent {
  timestamp: Date;
  type: 'callback' | 'signature_validation' | 'reward_mapping' | 'error';
  success: boolean;
  details: any;
  processingTime?: number;
  userId?: string;
  rewardType?: string;
  amount?: number;
}

export class AdMobEnhancedMonitor {
  private static metrics: AdMobEnhancedMetrics = {
    totalCallbacks: 0,
    validCallbacks: 0,
    invalidCallbacks: 0,
    signatureValidations: {
      success: 0,
      failures: 0
    },
    rewardMappings: {
      total: 0,
      byType: {},
      customDataSuccess: 0,
      fallbackMappings: 0
    },
    performance: {
      averageProcessingTime: 0,
      slowestCallback: 0,
      fastestCallback: Infinity
    },
    lastUpdated: new Date()
  };

  private static recentEvents: AdMobSSVEvent[] = [];
  private static readonly MAX_EVENTS = 100;

  static recordSSVCallback(isValid: boolean, processingTime: number, details: any = {}) {
    this.metrics.totalCallbacks++;
    this.metrics.lastUpdated = new Date();
    
    if (isValid) {
      this.metrics.validCallbacks++;
    } else {
      this.metrics.invalidCallbacks++;
    }

    // Mise à jour des métriques de performance
    this.updatePerformanceMetrics(processingTime);

    // Enregistrer l'événement
    this.addEvent({
      timestamp: new Date(),
      type: 'callback',
      success: isValid,
      details,
      processingTime
    });

    console.log(`AdMob Enhanced Monitor: Callback recorded - Valid: ${isValid}, Time: ${processingTime}ms`);
  }

  static recordSignatureValidation(success: boolean, details: any = {}) {
    if (success) {
      this.metrics.signatureValidations.success++;
    } else {
      this.metrics.signatureValidations.failures++;
      this.metrics.signatureValidations.lastFailureReason = details.reason || 'Unknown';
    }

    this.addEvent({
      timestamp: new Date(),
      type: 'signature_validation',
      success,
      details
    });

    console.log(`AdMob Enhanced Monitor: Signature validation - Success: ${success}`);
  }

  static recordRewardMapping(rewardType: string, amount: number, usedCustomData: boolean, userId?: string) {
    this.metrics.rewardMappings.total++;
    
    // Compter par type de récompense
    if (!this.metrics.rewardMappings.byType[rewardType]) {
      this.metrics.rewardMappings.byType[rewardType] = 0;
    }
    this.metrics.rewardMappings.byType[rewardType]++;

    if (usedCustomData) {
      this.metrics.rewardMappings.customDataSuccess++;
    } else {
      this.metrics.rewardMappings.fallbackMappings++;
    }

    this.addEvent({
      timestamp: new Date(),
      type: 'reward_mapping',
      success: true,
      details: { rewardType, amount, usedCustomData },
      userId,
      rewardType,
      amount
    });

    console.log(`AdMob Enhanced Monitor: Reward mapped - Type: ${rewardType}, Amount: ${amount}, CustomData: ${usedCustomData}`);
  }

  static recordError(error: Error, context: any = {}) {
    this.addEvent({
      timestamp: new Date(),
      type: 'error',
      success: false,
      details: {
        message: error.message,
        stack: error.stack,
        context
      }
    });

    console.error('AdMob Enhanced Monitor: Error recorded:', error.message);
  }

  private static updatePerformanceMetrics(processingTime: number) {
    const currentAverage = this.metrics.performance.averageProcessingTime;
    const totalCallbacks = this.metrics.totalCallbacks;
    
    // Calcul de la moyenne mobile
    this.metrics.performance.averageProcessingTime = 
      (currentAverage * (totalCallbacks - 1) + processingTime) / totalCallbacks;

    if (processingTime > this.metrics.performance.slowestCallback) {
      this.metrics.performance.slowestCallback = processingTime;
    }

    if (processingTime < this.metrics.performance.fastestCallback) {
      this.metrics.performance.fastestCallback = processingTime;
    }
  }

  private static addEvent(event: AdMobSSVEvent) {
    this.recentEvents.unshift(event);
    
    // Limiter le nombre d'événements stockés
    if (this.recentEvents.length > this.MAX_EVENTS) {
      this.recentEvents = this.recentEvents.slice(0, this.MAX_EVENTS);
    }
  }

  static getMetrics(): AdMobEnhancedMetrics {
    return { ...this.metrics };
  }

  static getRecentEvents(limit: number = 20): AdMobSSVEvent[] {
    return this.recentEvents.slice(0, limit);
  }

  static getPerformanceReport(): object {
    const successRate = this.metrics.totalCallbacks > 0 
      ? (this.metrics.validCallbacks / this.metrics.totalCallbacks) * 100 
      : 0;

    const signatureSuccessRate = (this.metrics.signatureValidations.success + this.metrics.signatureValidations.failures) > 0
      ? (this.metrics.signatureValidations.success / (this.metrics.signatureValidations.success + this.metrics.signatureValidations.failures)) * 100
      : 0;

    const customDataSuccessRate = this.metrics.rewardMappings.total > 0
      ? (this.metrics.rewardMappings.customDataSuccess / this.metrics.rewardMappings.total) * 100
      : 0;

    return {
      overview: {
        totalCallbacks: this.metrics.totalCallbacks,
        successRate: `${successRate.toFixed(2)}%`,
        averageProcessingTime: `${this.metrics.performance.averageProcessingTime.toFixed(2)}ms`
      },
      security: {
        signatureValidations: this.metrics.signatureValidations,
        signatureSuccessRate: `${signatureSuccessRate.toFixed(2)}%`
      },
      rewards: {
        totalMappings: this.metrics.rewardMappings.total,
        customDataSuccessRate: `${customDataSuccessRate.toFixed(2)}%`,
        rewardDistribution: this.metrics.rewardMappings.byType
      },
      performance: this.metrics.performance,
      lastUpdated: this.metrics.lastUpdated
    };
  }

  static reset() {
    this.metrics = {
      totalCallbacks: 0,
      validCallbacks: 0,
      invalidCallbacks: 0,
      signatureValidations: {
        success: 0,
        failures: 0
      },
      rewardMappings: {
        total: 0,
        byType: {},
        customDataSuccess: 0,
        fallbackMappings: 0
      },
      performance: {
        averageProcessingTime: 0,
        slowestCallback: 0,
        fastestCallback: Infinity
      },
      lastUpdated: new Date()
    };
    this.recentEvents = [];
    console.log('AdMob Enhanced Monitor: Metrics reset');
  }
}