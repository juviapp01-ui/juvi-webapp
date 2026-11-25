import { api } from './client';
import { User } from '@/types';

export interface DeleteAccountBlockedResponse {
  success: false;
  message: string;
  blockingBookings?: unknown[];
}

export const profileApi = {
  // GET replies {success, user}; PUT replies {success, message, user}. Both
  // were once typed as `User` directly, which let callers pass the whole
  // envelope into setUser() unnoticed.
  get: () => api.get<{ success: boolean; user: User }>('/profile'),
  update: (payload: {
    name?: string;
    email?: string;
    profileImage?: string;
    city?: string;
    state?: string;
    gender?: string;
    phone?: string;
  }) => api.put<{ success: boolean; message: string; user: User }>('/profile', payload),
  // returns a presigned S3 URL for direct upload
  presignUpload: (contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string }>('/profile/photo/presign', { contentType }),
  // 409 (active bookings / unsettled payout) arrives as an axios error with
  // this same shape on error.response.data — see DeleteAccountScreen.
  // Longer than the client's 15s default: deletion is several writes plus a
  // confirmation email, and timing out here reads as "failed" even when the
  // server went on to finish it.
  deleteAccount: () => api.delete<{ success: true; message: string }>('/users/me', { timeout: 60000 }),
};
