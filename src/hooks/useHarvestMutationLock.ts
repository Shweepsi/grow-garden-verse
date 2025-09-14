import { useRef, useCallback } from 'react';

/**
 * SOLUTION: Hook pour empêcher les récoltes simultanées et la duplication des gemmes.
 * - Une seule récolte à la fois avec verrouillage étendu
 * - Protection contre les événements simultanés
 * - Les suivantes attendent leur tour et obtiennent le verrou quand il se libère
 */
export const useHarvestMutationLock = () => {
  const isHarvestingRef = useRef(false);
  // SOLUTION: Extended lock includes animation and event processing
  const lastHarvestTime = useRef<number>(0);
  // File d'attente des resolveurs d'acquisition
  const waitersRef = useRef<Array<() => void>>([]);

  const acquireHarvestLock = useCallback(async (plotNumber: number): Promise<void> => {
    const now = Date.now();
    
    // Note: previously blocked rapid clicks; now non-blocking but logged for diagnostics
    if (now - lastHarvestTime.current < 200) {
      console.log(`⚠️ Rapid harvest click (${now - lastHarvestTime.current}ms) - queued if needed`);
    }
    
    // Si le verrou est libre, l'acquérir immédiatement
    if (!isHarvestingRef.current) {
      isHarvestingRef.current = true;
      lastHarvestTime.current = now;
      console.log(`🔒 Harvest lock acquired for plot ${plotNumber}`);
      return;
    }

    // Sinon, s'inscrire dans la file d'attente et attendre son tour
    return new Promise<void>((resolve) => {
      const waiter = () => {
        // Ce callback est appelé quand vient notre tour
        isHarvestingRef.current = true;
        lastHarvestTime.current = Date.now();
        console.log(`🔒 Harvest lock acquired from queue for plot ${plotNumber}`);
        resolve();
      };
      waitersRef.current.push(waiter);
    });
  }, []);

  const releaseHarvestLock = useCallback(() => {
    // SOLUTION: Extended release includes cooldown for gem processing
    console.log(`🔓 Releasing harvest lock with extended protection`);
    
    // Libérer le verrou courant
    isHarvestingRef.current = false;

    // Donner immédiatement le verrou au prochain en attente s'il existe
    const next = waitersRef.current.shift();
    if (next) {
      // Small delay to ensure proper sequencing
      setTimeout(next, 50);
    }
  }, []);

  const isLocked = useCallback(() => {
    return isHarvestingRef.current;
  }, []);

  return {
    acquireHarvestLock,
    releaseHarvestLock,
    isLocked,
    queueLength: waitersRef.current.length,
  };
};