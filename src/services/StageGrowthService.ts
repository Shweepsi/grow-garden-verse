
export class StageGrowthService {
  // Dans le nouveau système, l'arrosage fait progresser d'une étape
  static advanceStage(currentStage: number, maxStages: number): number {
    return Math.min(currentStage + 1, maxStages);
  }

  // Vérifier si la plante est prête à être récoltée
  static isReadyToHarvest(currentStage: number, maxStages: number): boolean {
    return currentStage >= maxStages;
  }

  // Calculer le pourcentage de progression
  static getProgress(currentStage: number, maxStages: number): number {
    return Math.min((currentStage / maxStages) * 100, 100);
  }

  // Obtenir l'emoji selon l'étape
  static getStageEmoji(currentStage: number, maxStages: number, finalEmoji: string): string {
    const progress = currentStage / maxStages;
    
    if (progress === 0) return '🌱';
    if (progress < 0.25) return '🌿';
    if (progress < 0.5) return '🪴';
    if (progress < 0.75) return '🌳';
    if (progress >= 1) return finalEmoji;
    return '🌳';
  }
}
