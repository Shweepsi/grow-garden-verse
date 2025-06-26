
export class PlantGrowthService {
  static calculateGrowthProgress(plantedAt: string | null, growthTimeMinutes: number): number {
    if (!plantedAt) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    const elapsedMinutes = (now.getTime() - planted.getTime()) / (1000 * 60);
    
    return Math.min(elapsedMinutes / growthTimeMinutes, 1);
  }

  static isPlantReady(plantedAt: string | null, growthTimeMinutes: number): boolean {
    return this.calculateGrowthProgress(plantedAt, growthTimeMinutes) >= 1;
  }

  static getTimeRemaining(plantedAt: string | null, growthTimeMinutes: number): number {
    if (!plantedAt) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    const elapsedMinutes = (now.getTime() - planted.getTime()) / (1000 * 60);
    
    return Math.max(growthTimeMinutes - elapsedMinutes, 0);
  }

  static formatTimeRemaining(minutes: number): string {
    if (minutes < 0.01) { // Less than 0.6 seconds
      return "Prêt !";
    }
    if (minutes < 1) {
      const seconds = Math.floor(minutes * 60);
      return `${seconds}s`;
    }
    if (minutes < 60) {
      return `${Math.floor(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
  }

  // Nouvelle méthode pour déterminer la fréquence de mise à jour optimale
  static getOptimalUpdateInterval(growthTimeMinutes: number): number {
    // Pour les plantes avec moins de 2 minutes de croissance, mise à jour plus fréquente
    if (growthTimeMinutes < 2) {
      return 500; // 500ms pour plus de fluidité
    }
    // Pour les plantes normales, 1 seconde suffit
    return 1000;
  }
}
