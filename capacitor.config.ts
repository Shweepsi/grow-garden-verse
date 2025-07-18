import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.lovable.28164eb90f8a43bd9b5cdc8227ba1150',
  appName: 'Idle Grow',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://28164eb9-0f8a-43bd-9b5c-dc8227ba1150.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#22c55e',
      showSpinner: false
    }
  }
}

export default config