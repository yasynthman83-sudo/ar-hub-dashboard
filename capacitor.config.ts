import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.arhubdashboard',
  appName: 'ar-hub-dashboard',
  webDir: 'dist',
  server: {
    url: 'https://17df9b7f-6264-446f-8e19-083c1763f987.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
