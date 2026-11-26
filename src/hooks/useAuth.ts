import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
// Firebase (the biggest library on the site) loads only when someone signs in.
const firebase = () => import('@/lib/firebase');
import { isNetworkFailure } from '@/utils/errors';
import { User } from '@/types';

// Web counterpart of the app's useAuth (frontend/src/hooks/useAuth.ts):
// Firebase sends and checks the code, then POST /auth/verify-firebase-token
// turns the Firebase ID token into JUVI's session — same endpoint, same
// response handling.
function applySessionFromResponse(
  raw: any,
  setSession: (tokens: { accessToken: string; refreshToken: string }, user: User | null) => void
) {
  let token = raw.accessToken || raw.token;
  let refresh = raw.refreshToken;
  let user = raw.user;
  if (!token && raw.data) {
    token = raw.data.accessToken || raw.data.token;
    refresh = raw.data.refreshToken || raw.refreshToken;
    user = raw.data.user || raw.user;
  }
  if (!token) throw new Error('Sign-in failed. Please try again.');
  setSession({ accessToken: token, refreshToken: refresh }, user);
  return user as User | undefined;
}

export function useAuth() {
  const { setSession, logout, user, isAuthenticated } = useAuthStore();

  const sendPhoneOtp = useMutation({
    mutationFn: async ({ phone }: { phone: string }) => (await firebase()).sendPhoneCode(phone),
  });

  const verifyPhoneOtp = useMutation({
    mutationFn: async (code: string) => {
      const idToken = await (await firebase()).confirmPhoneCode(code);
      // One retry when the request never got a response — safe, the same ID
      // token just signs the same user in again.
      try {
        return await authApi.verifyFirebaseToken(idToken);
      } catch (error) {
        if (!isNetworkFailure(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return authApi.verifyFirebaseToken(idToken);
      }
    },
    onSuccess: async (res) => {
      (await firebase()).phoneAuthSession.clear();
      applySessionFromResponse(res.data as any, setSession);
    },
  });

  return { user, isAuthenticated, sendPhoneOtp, verifyPhoneOtp, logout };
}
