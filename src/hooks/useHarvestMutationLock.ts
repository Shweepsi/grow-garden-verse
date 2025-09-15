import { useRef, useCallback } from 'react';

/**
 * Hook simplifié pour éviter les clics rapides multiples sur les récoltes.
 * Plus de file d'attente complexe - juste un debounce simple.
 */
export const useHarvestMutationLock = () => {
  const isHarvestingRef = useRef(false);
  const lastHarvestTime = useRef<number>(0);

  const acquireHarvestLock = useCallback(async (plotNumber: number): Promise<void> => {
    const now = Date.now();
    
    // Debounce réduit à 100ms pour éviter les double-clics accidentels
    if (now - lastHarvestTime.current < 100) {
      console.log(`⚠️ Rapid harvest click ignored (${now - lastHarvestTime.current}ms)`);
      throw new Error('Too fast - ignored');
    }
    
    // Ignorer si déjà en cours de récolte
    if (isHarvestingRef.current) {
      console.log(`⚠️ Harvest already in progress for plot ${plotNumber}`);
      throw new Error('Already harvesting');
    }

    isHarvestingRef.current = true;
    lastHarvestTime.current = now;
    console.log(`🔒 Harvest started for plot ${plotNumber}`);
  }, []);

  const releaseHarvestLock = useCallback(() => {
    console.log(`🔓 Harvest completed`);
    isHarvestingRef.current = false;
  }, []);

  const isLocked = useCallback(() => {
    return isHarvestingRef.current;
  }, []);

  return {
    acquireHarvestLock,
    releaseHarvestLock,
    isLocked,
  };
};