import { api } from './client';
import { ArtistApplicationStatus } from '@/types';

export const onboardingApi = {
  saveStep: (step: number, data: Record<string, unknown>) =>
    api.post(`/onboarding/step/${step}`, data),
  presignKyc: (docType: string, contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string }>('/onboarding/kyc/presign', {
      docType, contentType,
    }),
  presignPortfolio: (type: 'image' | 'video', contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string }>('/onboarding/portfolio/presign', {
      type, contentType,
    }),
  presignAadhaar: (contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string }>('/onboarding/aadhaar/presign', {
      contentType,
    }),
  submit: () => api.post<{ status: ArtistApplicationStatus }>('/onboarding/submit'),
  status: () => api.get<{ status: ArtistApplicationStatus; rejectionReason?: string }>('/onboarding/status'),
};
