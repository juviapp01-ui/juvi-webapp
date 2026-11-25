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
  GOOGLE_MAPS_KEY: read('VITE_GOOGLE_MAPS_KEY'),
  PAYTM_ENV: read('VITE_PAYTM_ENV') || 'STAGING',
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
