import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watchparty.app',
  appName: 'WatchParty',
  webDir: 'dist',
  server: {
    // App loads deployed web app — UI updates without rebuilding APK
    url: 'https://frontend-gilt-two-77.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
