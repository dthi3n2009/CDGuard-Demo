import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync } from 'node:fs';

const config: CapacitorConfig = {
  appId: 'com.cdguard.app',
  appName: 'CDGuard',
  // Firebase's native SDK needs real project configuration before it can initialize.
  includePlugins: existsSync('android/app/google-services.json') ? ['@capacitor-firebase/authentication'] : [],
  webDir: 'dist',
  plugins: { FirebaseAuthentication: { providers: ['google.com'], skipNativeAuth: false } },
  android: {
    backgroundColor: '#1A3D2B'
  }
};

export default config;
