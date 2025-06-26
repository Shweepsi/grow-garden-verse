
export class PlantGrowthService {
  static calculateGrowthProgress(plantedAt: string | null, growthTimeSeconds: number): number {
    if (!plantedAt) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    const elapsedSeconds = (now.getTime() - planted.getTime()) / 1000;
    
    return Math.min(elapsedSeconds / growthTimeSeconds, 1);
  }

  static isPlantReady(plantedAt: string | null, growthTimeSeconds: number): boolean {
    return this.calculateGrowthProgress(plantedAt, growthTimeSeconds) >= 1;
  }

  static getTimeRemaining(plantedAt: string | null, growthTimeSeconds: number): number {
    if (!plantedAt) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    const elapsedSeconds = (now.getTime() - planted.getTime()) / 1000;
    
    return Math.max(growthTimeSeconds - elapsedSeconds, 0);
  }

  static formatTimeRemaining(seconds: number): string {
    if (seconds < 1) {
      return "Prêt !";
    }
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      if (remainingSeconds === 0) {
        return `${minutes}min`;
      }
      return `${minutes}min ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}min`;
  }

  // Méthode pour déterminer la fréquence de mise à jour optimale
  static getOptimalUpdateInterval(growthTimeSeconds: number): number {
    // Pour les plantes avec moins de 2 minutes (120s) de croissance, mise à jour plus fréquente
    if (growthTimeSeconds < 120) {
      return 250; // 250ms pour une fluidité maximale sur les temps courts
    }
    // Pour les plantes normales, 1 seconde suffit
    return 1000;
  }
}
