import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';
import { ENV } from '@/config/env';

// Firebase phone sign-in for the browser. The app uses the native SDK, which
// proves itself with a silent push; a browser can't, so Firebase checks it
// with reCAPTCHA instead — the invisible kind, which usually needs no click.
//
// Must be the SAME Firebase project as the app: the backend's
// verify-firebase-token checks ID tokens against that project only.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let verifier: RecaptchaVerifier | null = null;

export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

function firebaseAuth(): Auth {
  if (!auth) {
    app = initializeApp({
      apiKey: ENV.FIREBASE.apiKey,
      authDomain: ENV.FIREBASE.authDomain,
      projectId: ENV.FIREBASE.projectId,
      appId: ENV.FIREBASE.appId,
      ...(ENV.FIREBASE.messagingSenderId ? { messagingSenderId: ENV.FIREBASE.messagingSenderId } : {}),
    });
    auth = getAuth(app);
    auth.useDeviceLanguage();
  }
  return auth;
}

// One verifier per page, reused for resends; cleared after a failure so the
// next attempt renders a fresh challenge instead of reusing a spent token.
function recaptcha(): RecaptchaVerifier {
  if (!verifier) {
    verifier = new RecaptchaVerifier(firebaseAuth(), RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
  }
  return verifier;
}

export function resetRecaptcha() {
  try {
    verifier?.clear();
  } catch {
    /* already gone */
  }
  verifier = null;
}

// The pending code, between the phone screen and the OTP screen. Kept in
// memory like the app's phoneAuthSession: a page reload loses it, and the
// OTP screen then asks for a new code.
let confirmation: ConfirmationResult | null = null;

export const phoneAuthSession = {
  get: () => confirmation,
  clear: () => {
    confirmation = null;
  },
};

// Sends the SMS. `phone` is the 10-digit Indian number, same as the app.
export async function sendPhoneCode(phone: string): Promise<void> {
  try {
    confirmation = await signInWithPhoneNumber(firebaseAuth(), `+91${phone}`, recaptcha());
  } catch (error) {
    resetRecaptcha();
    throw error;
  }
}

// Confirms the code and returns the Firebase ID token the backend exchanges
// for JUVI's own access/refresh tokens.
export async function confirmPhoneCode(code: string): Promise<string> {
  if (!confirmation) {
    throw new Error('Your code has expired. Please request a new one.');
  }
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}
