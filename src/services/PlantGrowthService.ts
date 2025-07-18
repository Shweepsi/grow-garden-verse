
export class PlantGrowthService {
  static calculateGrowthProgress(plantedAt: string | null, growthTimeSeconds: number): number {
    if (!plantedAt || !growthTimeSeconds || growthTimeSeconds <= 0) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    
    // Validation des dates
    if (isNaN(planted.getTime()) || planted.getTime() > now.getTime()) {
      return 0;
    }
    
    const elapsedSeconds = (now.getTime() - planted.getTime()) / 1000;
    return Math.min(Math.max(elapsedSeconds / growthTimeSeconds, 0), 1);
  }

  static isPlantReady(plantedAt: string | null, growthTimeSeconds: number): boolean {
    if (!plantedAt || !growthTimeSeconds) return false;
    return this.calculateGrowthProgress(plantedAt, growthTimeSeconds) >= 1;
  }

  static getTimeRemaining(plantedAt: string | null, growthTimeSeconds: number): number {
    if (!plantedAt || !growthTimeSeconds || growthTimeSeconds <= 0) return 0;
    
    const now = new Date();
    const planted = new Date(plantedAt);
    
    // Validation des dates
    if (isNaN(planted.getTime()) || planted.getTime() > now.getTime()) {
      return 0;
    }
    
    const elapsedSeconds = (now.getTime() - planted.getTime()) / 1000;
    return Math.max(growthTimeSeconds - elapsedSeconds, 0);
  }

  static formatTimeRemaining(seconds: number): string {
    if (!seconds || seconds < 1) {
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

  // Méthode optimisée pour déterminer la fréquence de mise à jour selon le temps restant
  static getOptimalUpdateInterval(growthTimeSeconds: number, timeRemaining?: number): number {
    if (!growthTimeSeconds || growthTimeSeconds <= 0) return 5000;
    
    // Si on a le temps restant, l'utiliser pour une précision maximale
    const remainingTime = timeRemaining !== undefined ? timeRemaining : growthTimeSeconds;
    
    // Pour les plantes presque prêtes (< 30s), mise à jour très fréquente
    if (remainingTime < 30) {
      return 100; // 100ms pour la fluidité maximale en fin de croissance
    }
    
    // Pour les plantes avec moins de 2 minutes restantes, mise à jour fréquente
    if (remainingTime < 120) {
      return 250; // 250ms pour une fluidité élevée
    }
    
    // Pour les plantes avec moins de 10 minutes de croissance totale, mise à jour rapide
    if (growthTimeSeconds < 600) {
      return 500; // 500ms pour les plantes rapides
    }
    
    // Pour les plantes normales, 1 seconde suffit
    return 1000;
  }

  // Nouvelle méthode pour déterminer si une plante nécessite une mise à jour fréquente
  static needsFrequentUpdate(plantedAt: string | null, growthTimeSeconds: number): boolean {
    if (!plantedAt || !growthTimeSeconds) return false;
    
    const timeRemaining = this.getTimeRemaining(plantedAt, growthTimeSeconds);
    
    // Mise à jour fréquente si moins de 2 minutes restantes ou plante rapide
    return timeRemaining < 120 || growthTimeSeconds < 300;
  }
}
