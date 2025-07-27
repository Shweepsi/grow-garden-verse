import { useMemo } from 'react';
import { useActiveBoosts } from './useActiveBoosts';
import { useGameMultipliers } from './useGameMultipliers';
import { GrowthModifiers, GrowthService } from '@/services/growth/GrowthService';

export interface UseGrowthModifiersResult {
  modifiers: GrowthModifiers;
  totalMultiplier: number;
  formatReduction: (baseSeconds: number) => string;
}

/**
 * Hook to get all growth modifiers from various sources
 */
export const useGrowthModifiers = (): UseGrowthModifiersResult => {
  const { getBoostMultiplier } = useActiveBoosts();
  const { multipliers } = useGameMultipliers();

  const modifiers = useMemo<GrowthModifiers>(() => {
    // Get upgrade multiplier (from permanent upgrades)
    const upgrades = multipliers.growth || 1;

    // Get ad boost multiplier
    const adBoostValue = getBoostMultiplier('growth_boost');
    const adBoost = adBoostValue !== 1 ? GrowthService.adBoostToMultiplier((1 - adBoostValue) * 100) : 1;

    // Items multiplier (future implementation)
    const items = 1;

    return {
      upgrades,
      adBoost,
      items
    };
  }, [multipliers.growth, getBoostMultiplier]);

  const totalMultiplier = useMemo(() => {
    return GrowthService.calculateTotalMultiplier(modifiers);
  }, [modifiers]);

  const formatReduction = (baseSeconds: number): string => {
    const calculation = GrowthService.calculateGrowthTime(baseSeconds, modifiers);
    if (calculation.timeReduction > 0) {
      return `-${calculation.timeReduction}%`;
    }
    return '';
  };

  return {
    modifiers,
    totalMultiplier,
    formatReduction
  };
};