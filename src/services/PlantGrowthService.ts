
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
    if (minutes < 60) {
      return `${Math.ceil(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.ceil(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
  }
}
