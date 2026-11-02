import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.navolive.app',
  appName: 'Navo Live',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '534655553492-3lc1drveiblnpag69spneocjeh7qbks8.apps.googleusercontent.com',
      serverClientId: '534655553492-3lc1drveiblnpag69spneocjeh7qbks8.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
