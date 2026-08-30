import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mathlift.app',
  appName: 'MathLift',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#181b2e',
    },
  },
};

export default config;
