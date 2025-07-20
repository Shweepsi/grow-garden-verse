export class AdValidationService {
  private static readonly MIN_WATCH_PERCENTAGE = 0.8;
  private static readonly MIN_ABSOLUTE_SECONDS = 3;

  static getMinimumWatchTime(estimatedDurationMs: number): number {
    const calculatedMinimum = estimatedDurationMs * this.MIN_WATCH_PERCENTAGE;
    return Math.max(this.MIN_ABSOLUTE_SECONDS * 1000, Math.round(calculatedMinimum));
  }

  static validateAdWatchTime(actualDuration: number, estimatedDuration: number): {
    isValid: boolean;
    minRequired: number;
    errorMessage?: string;
  } {
    const minRequired = this.getMinimumWatchTime(estimatedDuration);
    
    console.log(`AdMob: Validation - Required: ${minRequired}ms, Actual: ${actualDuration}ms, Estimated: ${estimatedDuration}ms`);
    
    if (actualDuration < minRequired) {
      return {
        isValid: false,
        minRequired,
        errorMessage: `Publicité non regardée entièrement (${Math.round(actualDuration/1000)}s/${Math.round(minRequired/1000)}s requis)`
      };
    }

    return { isValid: true, minRequired };
  }
}