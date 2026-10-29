import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nevolive.app',
  appName: 'Navo Live',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '240298940237-smbba5g08k46atvtsi4o5idrt82qgc98.apps.googleusercontent.com',
      serverClientId: '240298940237-smbba5g08k46atvtsi4o5idrt82qgc98.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
