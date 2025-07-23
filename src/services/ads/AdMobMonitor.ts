interface AdMobMetrics {
  totalCallbacks: number;
  validCallbacks: number;
  invalidSignatures: number;
  fraudulentAttempts: number;
  rewardsProcessed: number;
  lastValidCallback: Date | null;
  averageProcessingTime: number;
}

interface SuspiciousActivity {
  type: string;
  details: string;
  timestamp: Date;
  sourceIP?: string;
  userAgent?: string;
}

export class AdMobMonitor {
  private static metrics: AdMobMetrics = {
    totalCallbacks: 0,
    validCallbacks: 0,
    invalidSignatures: 0,
    fraudulentAttempts: 0,
    rewardsProcessed: 0,
    lastValidCallback: null,
    averageProcessingTime: 0
  };

  private static suspiciousActivities: SuspiciousActivity[] = [];
  private static readonly MAX_SUSPICIOUS_LOGS = 100;

  static recordCallback(isValid: boolean, processingTime: number): void {
    this.metrics.totalCallbacks++;
    
    if (isValid) {
      this.metrics.validCallbacks++;
      this.metrics.lastValidCallback = new Date();
      this.metrics.rewardsProcessed++;
      
      // Mise à jour de la moyenne du temps de traitement
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (this.metrics.validCallbacks - 1) + processingTime) / 
        this.metrics.validCallbacks;
    } else {
      this.metrics.fraudulentAttempts++;
    }

    console.log('AdMob Monitor: Callback recorded', {
      total: this.metrics.totalCallbacks,
      valid: this.metrics.validCallbacks,
      successRate: `${((this.metrics.validCallbacks / this.metrics.totalCallbacks) * 100).toFixed(2)}%`
    });
  }

  static recordInvalidSignature(details: string, sourceIP?: string): void {
    this.metrics.invalidSignatures++;
    this.recordSuspiciousActivity('invalid_signature', details, sourceIP);
  }

  static recordSuspiciousActivity(
    type: string, 
    details: string, 
    sourceIP?: string,
    userAgent?: string
  ): void {
    const activity: SuspiciousActivity = {
      type,
      details,
      timestamp: new Date(),
      sourceIP,
      userAgent
    };

    this.suspiciousActivities.unshift(activity);
    
    if (this.suspiciousActivities.length > this.MAX_SUSPICIOUS_LOGS) {
      this.suspiciousActivities = this.suspiciousActivities.slice(0, this.MAX_SUSPICIOUS_LOGS);
    }

    console.warn('AdMob Monitor: Suspicious activity detected', activity);
    
    const recentCount = this.suspiciousActivities.filter(a => 
      Date.now() - a.timestamp.getTime() < 60000
    ).length;
    
    if (recentCount > 10) {
      console.error('AdMob Monitor: HIGH FRAUD ALERT - Multiple suspicious activities in last minute');
    }
  }

  static validateTimestamp(timestamp: string): boolean {
    try {
      const callbackTime = parseInt(timestamp);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (isNaN(callbackTime)) {
        return false;
      }
      
      const timeDiff = Math.abs(now - callbackTime);
      
      if (timeDiff > fiveMinutes) {
        this.recordSuspiciousActivity(
          'timestamp_manipulation',
          `Timestamp too old/future: ${new Date(callbackTime).toISOString()}, diff: ${timeDiff}ms`
        );
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  static validateAdUnit(adUnitId: string): boolean {
    const expectedAdUnit = '2747237135';
    
    if (adUnitId !== expectedAdUnit) {
      this.recordSuspiciousActivity(
        'unknown_ad_unit',
        `Unexpected ad_unit: ${adUnitId}, expected: ${expectedAdUnit}`
      );
      
      console.warn(`AdMob Monitor: Unexpected ad_unit: ${adUnitId}`);
    }
    
    return true;
  }

  static getMetrics(): AdMobMetrics {
    return { ...this.metrics };
  }

  static getSuspiciousActivities(limit = 20): SuspiciousActivity[] {
    return this.suspiciousActivities.slice(0, limit);
  }

  static getSecurityStats() {
    const fraudRate = this.metrics.totalCallbacks > 0 
      ? (this.metrics.fraudulentAttempts / this.metrics.totalCallbacks) * 100 
      : 0;
    
    const signatureFailureRate = this.metrics.totalCallbacks > 0
      ? (this.metrics.invalidSignatures / this.metrics.totalCallbacks) * 100
      : 0;
    
    const recentSuspiciousCount = this.suspiciousActivities.filter(activity =>
      Date.now() - activity.timestamp.getTime() < 60 * 60 * 1000
    ).length;
    
    const isHighRisk = fraudRate > 10 || signatureFailureRate > 5 || recentSuspiciousCount > 20;

    return {
      fraudRate,
      signatureFailureRate,
      recentSuspiciousCount,
      isHighRisk
    };
  }

  static resetMetrics(): void {
    this.metrics = {
      totalCallbacks: 0,
      validCallbacks: 0,
      invalidSignatures: 0,
      fraudulentAttempts: 0,
      rewardsProcessed: 0,
      lastValidCallback: null,
      averageProcessingTime: 0
    };
    this.suspiciousActivities = [];
  }
}