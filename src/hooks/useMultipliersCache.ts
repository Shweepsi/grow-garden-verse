import { useMemo, useRef } from 'react';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

interface CachedMultipliers {
  multipliers: any;
  timestamp: number;
  activeEffectsHash: string;
}

// Cache global pour éviter les recalculs redondants
const multipliersCache = new Map<string, CachedMultipliers>();
const CACHE_DURATION = 5000; // 5 secondes de cache

export const useMultipliersCache = () => {
  const { getCompleteMultipliers } = useGameMultipliers();
  const lastHashRef = useRef<string>('');

  const getCachedMultipliers = useMemo(() => {
    return (activeEffects: any[] = []) => {
      // Créer un hash des effets actifs pour détecter les changements
      const effectsHash = JSON.stringify(
        activeEffects
          .filter(effect => effect.expires_at > new Date().toISOString())
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(effect => ({ id: effect.id, type: effect.effect_type, value: effect.effect_value }))
      );

      const now = Date.now();
      const cached = multipliersCache.get(effectsHash);

      // Utiliser le cache si valide
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return cached.multipliers;
      }

      // Recalculer les multiplicateurs
      try {
        const multipliers = getCompleteMultipliers();
        
        // Mettre en cache
        multipliersCache.set(effectsHash, {
          multipliers,
          timestamp: now,
          activeEffectsHash: effectsHash
        });

        // Nettoyer les anciens caches
        if (multipliersCache.size > 10) {
          const oldestKey = Array.from(multipliersCache.keys())[0];
          multipliersCache.delete(oldestKey);
        }

        lastHashRef.current = effectsHash;
        return multipliers;
      } catch (error) {
        console.warn('⚠️ Erreur lors du calcul des multiplicateurs:', error);
        return { harvest: 1, growth: 1, exp: 1, plantCostReduction: 1, gemChance: 0, coins: 1, gems: 1 };
      }
    };
  }, [getCompleteMultipliers]);

  return { getCachedMultipliers };
};