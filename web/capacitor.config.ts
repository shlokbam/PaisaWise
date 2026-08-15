import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paisawise.app',
  appName: 'PaisaWise',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For local development, uncomment and set your Mac's IP:
    // url: 'http://192.168.1.4:3000',
    // cleartext: true,
  },
  plugins: {
    SmsReader: {
      // Native SMS plugin config
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
