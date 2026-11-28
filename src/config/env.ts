// Every value comes from .env (see .env.example) — nothing is hardcoded here,
// so the website never ships a key someone didn't deliberately configure.
const read = (key: string): string => (import.meta.env[key] as string | undefined)?.trim() ?? '';

export const ENV = {
  API_URL: read('VITE_API_URL').replace(/\/+$/, ''),
  FIREBASE: {
    apiKey: read('VITE_FIREBASE_API_KEY'),
    authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: read('VITE_FIREBASE_PROJECT_ID'),
    appId: read('VITE_FIREBASE_APP_ID'),
    messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  },
  // Chat's live connection. Defaults to the API's own host over wss://, which
  // is how the app's settings pair the two.
  WS_URL: read('VITE_WS_URL') || read('VITE_API_URL').replace(/\/+$/, '').replace(/^http/, 'ws'),
  GOOGLE_MAPS_KEY: read('VITE_GOOGLE_MAPS_KEY'),
  PAYTM_ENV: read('VITE_PAYTM_ENV') || 'STAGING',
  // Landing page store buttons (public links); override in .env if needed.
  APP_STORE_URL: read('VITE_APP_STORE_URL') || 'https://apps.apple.com/app/juvi/id6787046486',
  PLAY_STORE_URL: read('VITE_PLAY_STORE_URL') || 'https://play.google.com/store/apps/details?id=com.juvi.app',
};

// Settings the site can't work without. Shown on a setup screen instead of
// failing with a blank page or a confusing network error.
export const missingEnv = (): string[] => {
  const missing: string[] = [];
  if (!ENV.API_URL) missing.push('VITE_API_URL');
  if (!ENV.FIREBASE.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!ENV.FIREBASE.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!ENV.FIREBASE.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!ENV.FIREBASE.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
};
