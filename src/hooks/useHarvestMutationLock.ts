import { useRef, useCallback } from 'react';

/**
 * Hook pour empêcher les récoltes simultanées et éviter les duplications
 * Implémente un système de verrouillage global pour les mutations
 */
export const useHarvestMutationLock = () => {
  const isHarvestingRef = useRef(false);
  const harvestQueueRef = useRef<Array<{ plotNumber: number; resolve: Function; reject: Function }>>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current || harvestQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    while (harvestQueueRef.current.length > 0) {
      const item = harvestQueueRef.current.shift();
      if (!item) continue;

      try {
        // Attendre un petit délai entre les récoltes pour éviter les conditions de course
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Le traitement réel sera fait par le hook qui utilise ce verrou
        item.resolve();
      } catch (error) {
        item.reject(error);
      }
    }

    processingRef.current = false;
  }, []);

  const acquireHarvestLock = useCallback(async (plotNumber: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isHarvestingRef.current) {
        // Ajouter à la queue si une récolte est déjà en cours
        harvestQueueRef.current.push({ plotNumber, resolve, reject });
        processQueue();
      } else {
        // Acquérir le verrou immédiatement
        isHarvestingRef.current = true;
        resolve();
      }
    });
  }, [processQueue]);

  const releaseHarvestLock = useCallback(() => {
    isHarvestingRef.current = false;
    // Traiter le prochain élément de la queue
    processQueue();
  }, [processQueue]);

  const isLocked = useCallback(() => {
    return isHarvestingRef.current;
  }, []);

  return {
    acquireHarvestLock,
    releaseHarvestLock,
    isLocked,
    queueLength: harvestQueueRef.current.length
  };
};