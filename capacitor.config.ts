
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shweepsi.idlegrow',
  appName: 'Idle Grow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Configuration pour SDK 35+ : gérer les safe areas et l'UI immersive
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: true,
    // Configuration importante pour éviter les superpositions avec les éléments système
    backgroundColor: "#ffffff"
  },
  plugins: {
    StatusBar: {
      // Configuration de la barre de statut pour Android SDK 35+
      style: "DARK",
      backgroundColor: "#ffffff",
      overlaysWebView: false
    },
    AdMob: {
      appId: 'ca-app-pub-4824355487707598~3701914540',
      requestTrackingAuthorization: true,
      // Configuration pour la production
      testingDevices: [],
      initializeForTesting: false
    }
  }
};

export default config;
