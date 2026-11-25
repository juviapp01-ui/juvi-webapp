import { api } from './client';
import { User } from '@/types';

export const authApi = {
  requestOtp: (email: string) =>
    api.post<{ success: boolean; message: string }>('/auth/send-otp-email', { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post<{ success: boolean; message: string; accessToken: string; refreshToken: string; user: User }>(
      '/auth/verify-otp-email', { email, otp }
    ),
  verifyFirebaseToken: (idToken: string) =>
    api.post<{ success: boolean; message: string; accessToken: string; refreshToken: string; user: User }>(
      '/auth/verify-firebase-token', { idToken }
    ),
  refresh: (refreshToken: string) =>
    api.post<{ success: boolean; accessToken: string }>('/auth/refresh-token', { refreshToken }),
  me: () => api.get<User>('/profile'),
};
