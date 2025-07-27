import { GrowthService } from '../GrowthService';

describe('GrowthService', () => {
  describe('Growth Time Calculations', () => {
    it('should calculate base growth time correctly', () => {
      const mockPlant = { rarity: 'common' } as any;
      expect(GrowthService.getBaseGrowthTime(mockPlant)).toBe(60);
      
      mockPlant.rarity = 'legendary';
      expect(GrowthService.getBaseGrowthTime(mockPlant)).toBe(1800);
    });

    it('should apply growth modifiers correctly', () => {
      const baseTime = 100;
      
      // No modifiers
      let calc = GrowthService.calculateGrowthTime(baseTime);
      expect(calc.finalTimeSeconds).toBe(100);
      expect(calc.totalMultiplier).toBe(1);
      expect(calc.timeReduction).toBe(0);
      
      // Only upgrade modifier (30% faster)
      calc = GrowthService.calculateGrowthTime(baseTime, { upgrades: 1.3 });
      expect(calc.finalTimeSeconds).toBe(76); // 100 / 1.3
      expect(calc.totalMultiplier).toBe(1.3);
      expect(calc.timeReduction).toBe(24);
      
      // Only ad boost (50% faster)
      calc = GrowthService.calculateGrowthTime(baseTime, { adBoost: 1.5 });
      expect(calc.finalTimeSeconds).toBe(66); // 100 / 1.5
      expect(calc.totalMultiplier).toBe(1.5);
      expect(calc.timeReduction).toBe(34);
      
      // Combined modifiers
      calc = GrowthService.calculateGrowthTime(baseTime, { 
        upgrades: 1.3, 
        adBoost: 1.5 
      });
      expect(calc.finalTimeSeconds).toBe(51); // 100 / (1.3 * 1.5)
      expect(calc.totalMultiplier).toBe(1.95);
      expect(calc.timeReduction).toBe(49);
    });

    it('should respect minimum growth time', () => {
      const calc = GrowthService.calculateGrowthTime(10, { 
        upgrades: 10, 
        adBoost: 10 
      });
      expect(calc.finalTimeSeconds).toBe(5); // Minimum is 5 seconds
    });
  });

  describe('Ad Boost Conversions', () => {
    it('should convert reduction percentage to multiplier correctly', () => {
      expect(GrowthService.adBoostToMultiplier(0)).toBe(1);
      expect(GrowthService.adBoostToMultiplier(20)).toBe(1.25); // 1 / 0.8
      expect(GrowthService.adBoostToMultiplier(50)).toBe(2); // 1 / 0.5
      expect(GrowthService.adBoostToMultiplier(75)).toBe(4); // 1 / 0.25
    });

    it('should handle edge cases for ad boost conversion', () => {
      expect(GrowthService.adBoostToMultiplier(-10)).toBe(1);
      expect(GrowthService.adBoostToMultiplier(100)).toBe(1);
      expect(GrowthService.adBoostToMultiplier(150)).toBe(1);
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      expect(GrowthService.formatTimeRemaining(0)).toBe('Prêt!');
      expect(GrowthService.formatTimeRemaining(45)).toBe('45s');
      expect(GrowthService.formatTimeRemaining(90)).toBe('1m 30s');
      expect(GrowthService.formatTimeRemaining(3665)).toBe('1h 1m');
    });
  });

  describe('Growth Progress', () => {
    it('should calculate progress correctly', () => {
      const now = new Date();
      const plantedAt = new Date(now.getTime() - 30000).toISOString(); // 30s ago
      
      // 60s growth time, 30s elapsed = 50% progress
      const progress = GrowthService.getGrowthProgress(plantedAt, 60);
      expect(progress).toBeCloseTo(50, 0);
    });
  });
});