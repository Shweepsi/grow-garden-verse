export interface PlotTraits {
  // Traits de qualité du sol
  soilQuality?: 'poor' | 'normal' | 'rich' | 'fertile';
  
  // Traits de vitesse
  growthSpeed?: 'slow' | 'normal' | 'fast' | 'turbo';
  
  // Traits de rendement
  yieldBonus?: 'low' | 'normal' | 'high' | 'abundant';
  
  // Traits spéciaux
  specialTrait?: 'lucky' | 'golden' | 'mystical' | 'cursed' | 'blessed';
  
  // Multiplicateurs calculés
  growthMultiplier: number;
  yieldMultiplier: number;
  expMultiplier: number;
  gemChanceBonus: number;
}

export class PlotIndividualizationService {
  // Génère des traits aléatoires pour une parcelle
  static generateRandomTraits(): PlotTraits {
    const traits: PlotTraits = {
      growthMultiplier: 1,
      yieldMultiplier: 1,
      expMultiplier: 1,
      gemChanceBonus: 0
    };

    // 30% de chance d'avoir un trait de qualité du sol
    if (Math.random() < 0.3) {
      const soilQualities: PlotTraits['soilQuality'][] = ['poor', 'normal', 'rich', 'fertile'];
      const weights = [0.4, 0.3, 0.2, 0.1]; // Plus de chance d'avoir un sol pauvre
      traits.soilQuality = this.weightedRandom(soilQualities, weights);
    }

    // 25% de chance d'avoir un trait de vitesse
    if (Math.random() < 0.25) {
      const growthSpeeds: PlotTraits['growthSpeed'][] = ['slow', 'normal', 'fast', 'turbo'];
      const weights = [0.3, 0.4, 0.2, 0.1];
      traits.growthSpeed = this.weightedRandom(growthSpeeds, weights);
    }

    // 20% de chance d'avoir un trait de rendement
    if (Math.random() < 0.2) {
      const yieldBonuses: PlotTraits['yieldBonus'][] = ['low', 'normal', 'high', 'abundant'];
      const weights = [0.3, 0.4, 0.2, 0.1];
      traits.yieldBonus = this.weightedRandom(yieldBonuses, weights);
    }

    // 5% de chance d'avoir un trait spécial
    if (Math.random() < 0.05) {
      const specialTraits: PlotTraits['specialTrait'][] = ['lucky', 'golden', 'mystical', 'cursed', 'blessed'];
      const weights = [0.3, 0.2, 0.2, 0.2, 0.1];
      traits.specialTrait = this.weightedRandom(specialTraits, weights);
    }

    // Calculer les multiplicateurs basés sur les traits
    traits.growthMultiplier = this.calculateGrowthMultiplier(traits);
    traits.yieldMultiplier = this.calculateYieldMultiplier(traits);
    traits.expMultiplier = this.calculateExpMultiplier(traits);
    traits.gemChanceBonus = this.calculateGemChanceBonus(traits);

    return traits;
  }

  // Sélection pondérée aléatoire
  private static weightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  // Calcule le multiplicateur de croissance basé sur les traits
  private static calculateGrowthMultiplier(traits: PlotTraits): number {
    let multiplier = 1;

    // Qualité du sol affecte la vitesse de croissance
    switch (traits.soilQuality) {
      case 'poor': multiplier *= 0.8; break;
      case 'rich': multiplier *= 1.2; break;
      case 'fertile': multiplier *= 1.4; break;
    }

    // Trait de vitesse de croissance
    switch (traits.growthSpeed) {
      case 'slow': multiplier *= 0.75; break;
      case 'fast': multiplier *= 1.25; break;
      case 'turbo': multiplier *= 1.5; break;
    }

    // Traits spéciaux
    switch (traits.specialTrait) {
      case 'blessed': multiplier *= 1.3; break;
      case 'cursed': multiplier *= 0.7; break;
      case 'mystical': multiplier *= 1.2; break;
    }

    return multiplier;
  }

  // Calcule le multiplicateur de rendement basé sur les traits
  private static calculateYieldMultiplier(traits: PlotTraits): number {
    let multiplier = 1;

    // Qualité du sol affecte le rendement
    switch (traits.soilQuality) {
      case 'poor': multiplier *= 0.7; break;
      case 'rich': multiplier *= 1.3; break;
      case 'fertile': multiplier *= 1.5; break;
    }

    // Trait de rendement
    switch (traits.yieldBonus) {
      case 'low': multiplier *= 0.8; break;
      case 'high': multiplier *= 1.3; break;
      case 'abundant': multiplier *= 1.6; break;
    }

    // Traits spéciaux
    switch (traits.specialTrait) {
      case 'golden': multiplier *= 2; break;
      case 'blessed': multiplier *= 1.5; break;
      case 'cursed': multiplier *= 0.5; break;
      case 'lucky': multiplier *= 1.4; break;
    }

    return multiplier;
  }

  // Calcule le multiplicateur d'expérience basé sur les traits
  private static calculateExpMultiplier(traits: PlotTraits): number {
    let multiplier = 1;

    // Les sols riches donnent plus d'expérience
    switch (traits.soilQuality) {
      case 'rich': multiplier *= 1.2; break;
      case 'fertile': multiplier *= 1.3; break;
    }

    // Traits spéciaux
    switch (traits.specialTrait) {
      case 'mystical': multiplier *= 1.5; break;
      case 'blessed': multiplier *= 1.3; break;
      case 'cursed': multiplier *= 0.8; break;
    }

    return multiplier;
  }

  // Calcule le bonus de chance de gemmes basé sur les traits
  private static calculateGemChanceBonus(traits: PlotTraits): number {
    let bonus = 0;

    // Sol fertile augmente la chance de gemmes
    if (traits.soilQuality === 'fertile') {
      bonus += 0.05; // +5%
    }

    // Traits spéciaux
    switch (traits.specialTrait) {
      case 'lucky': bonus += 0.15; break; // +15%
      case 'golden': bonus += 0.1; break; // +10%
      case 'mystical': bonus += 0.08; break; // +8%
      case 'blessed': bonus += 0.12; break; // +12%
    }

    return bonus;
  }

  // Génère une description des traits
  static getTraitDescription(traits: PlotTraits): string[] {
    const descriptions: string[] = [];

    if (traits.soilQuality) {
      const soilDescriptions = {
        poor: '🟫 Sol pauvre (-20% vitesse, -30% rendement)',
        normal: '🟤 Sol normal',
        rich: '🟨 Sol riche (+20% vitesse, +30% rendement)',
        fertile: '🟩 Sol fertile (+40% vitesse, +50% rendement)'
      };
      descriptions.push(soilDescriptions[traits.soilQuality]);
    }

    if (traits.growthSpeed) {
      const speedDescriptions = {
        slow: '🐌 Croissance lente (-25% vitesse)',
        normal: '🌱 Croissance normale',
        fast: '⚡ Croissance rapide (+25% vitesse)',
        turbo: '🚀 Croissance turbo (+50% vitesse)'
      };
      descriptions.push(speedDescriptions[traits.growthSpeed]);
    }

    if (traits.yieldBonus) {
      const yieldDescriptions = {
        low: '📉 Faible rendement (-20%)',
        normal: '📊 Rendement normal',
        high: '📈 Haut rendement (+30%)',
        abundant: '💰 Rendement abondant (+60%)'
      };
      descriptions.push(yieldDescriptions[traits.yieldBonus]);
    }

    if (traits.specialTrait) {
      const specialDescriptions = {
        lucky: '🍀 Chanceux (+40% rendement, +15% gemmes)',
        golden: '✨ Doré (x2 rendement, +10% gemmes)',
        mystical: '🔮 Mystique (+20% vitesse, +50% EXP)',
        cursed: '👻 Maudit (-30% vitesse, -50% rendement)',
        blessed: '😇 Béni (+30% vitesse, +50% rendement)'
      };
      descriptions.push(specialDescriptions[traits.specialTrait]);
    }

    return descriptions;
  }

  // Obtient l'emoji représentant la qualité globale
  static getQualityEmoji(traits: PlotTraits): string {
    const totalMultiplier = traits.growthMultiplier * traits.yieldMultiplier;
    
    if (totalMultiplier >= 2) return '🌟'; // Exceptionnel
    if (totalMultiplier >= 1.5) return '⭐'; // Excellent
    if (totalMultiplier >= 1.2) return '✨'; // Bon
    if (totalMultiplier >= 0.8) return '🌱'; // Normal
    if (totalMultiplier >= 0.5) return '🥀'; // Mauvais
    return '💀'; // Terrible
  }
}