import { useRef, useCallback } from 'react';

/**
 * Hook pour empêcher les récoltes simultanées (mutex FIFO).
 * - Une seule récolte à la fois
 * - Les suivantes attendent leur tour et obtiennent le verrou quand il se libère
 */
export const useHarvestMutationLock = () => {
  const isHarvestingRef = useRef(false);
  // File d'attente des resolveurs d'acquisition
  const waitersRef = useRef<Array<() => void>>([]);

  const acquireHarvestLock = useCallback(async (_plotNumber: number): Promise<void> => {
    // Si le verrou est libre, l'acquérir immédiatement
    if (!isHarvestingRef.current) {
      isHarvestingRef.current = true;
      return;
    }

    // Sinon, s'inscrire dans la file d'attente et attendre son tour
    return new Promise<void>((resolve) => {
      const waiter = () => {
        // Ce callback est appelé quand vient notre tour
        isHarvestingRef.current = true;
        resolve();
      };
      waitersRef.current.push(waiter);
    });
  }, []);

  const releaseHarvestLock = useCallback(() => {
    // Libérer le verrou courant
    isHarvestingRef.current = false;

    // Donner immédiatement le verrou au prochain en attente s'il existe
    const next = waitersRef.current.shift();
    if (next) {
      next();
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