import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * Hook pour initialiser la StatusBar sur Android SDK 35+
 * Évite les superpositions avec l'interface système
 */
export const useStatusBarInit = () => {
  useEffect(() => {
    const initStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setOverlaysWebView({ overlay: false });
          
          console.log('✅ StatusBar configurée pour SDK 35+');
        } catch (error) {
          console.warn('⚠️ Erreur configuration StatusBar:', error);
        }
      }
    };

    initStatusBar();
  }, []);
};