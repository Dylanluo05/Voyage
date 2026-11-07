import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.voyagetravel.voyage',
  appName: 'Voyage',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 800, backgroundColor: '#0b76dd' },
    Keyboard: { resize: 'body' },
  },
};

export default config;
