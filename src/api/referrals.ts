import { api } from './client';

// POST /referrals/generate is idempotent: it returns the user's existing code,
// or creates one on first call.
export const referralsApi = {
  myCode: () => api.post<{ success: boolean; referralCode: string }>('/referrals/generate'),
  apply: (referralCode: string) =>
    api.post<{ success: boolean; message?: string }>('/referrals/apply', { referralCode }),
};
