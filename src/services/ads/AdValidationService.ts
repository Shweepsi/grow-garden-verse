export class AdValidationService {
  private static readonly MIN_WATCH_SECONDS = 3;

  static validateAdWatchTime(actualDuration: number): {
    isValid: boolean;
    errorMessage?: string;
  } {
    const minRequiredMs = this.MIN_WATCH_SECONDS * 1000;
    
    console.log(`AdMob: Validation simple - Actual: ${actualDuration}ms, Min required: ${minRequiredMs}ms`);
    
    if (actualDuration < minRequiredMs) {
      return {
        isValid: false,
        errorMessage: `Publicité trop courte (${Math.round(actualDuration/1000)}s minimum ${this.MIN_WATCH_SECONDS}s)`
      };
    }

    return { isValid: true };
  }
}