import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * useAndroidBackButton
 * ------------------------------------------------------------------
 * Simplifie la gestion du bouton « Retour » (Android) dans Capacitor.
 * Lorsque `enabled` est vrai, la callback `handler` est exécutée à
 * l'appui du bouton retour et l'action native est bloquée.
 * ------------------------------------------------------------------
 * @param enabled  Active / désactive le listener.
 * @param handler  Fonction appelée lors du back press.
 */
export const useAndroidBackButton = (
  enabled: boolean,
  handler: () => void,
) => {
  useEffect(() => {
    if (!enabled) return;

    const listener = CapacitorApp.addListener('backButton', (event) => {
      // On empêche l'action par défaut (navigation ou fermeture de l'app)
      // et on exécute la callback fournie.
      event && (event as any).preventDefault?.();
      handler();
    });

    return () => {
      listener?.remove();
    };
  }, [enabled, handler]);
};