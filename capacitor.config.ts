
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shweepsi.idlegrow',
  appName: 'Idle Grow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-4824355487707598~3701914540',
      testingDevices: ['YOUR_DEVICE_ID_FOR_TESTING'] // Replace with your device ID for testing
    }
  }
};

export default config;
