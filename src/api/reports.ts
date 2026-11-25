import { api } from './client';

// Mirrors the backend's report reason enum exactly.
export type ReportReason =
  | 'INAPPROPRIATE'
  | 'SPAM'
  | 'HARASSMENT'
  | 'NUDITY'
  | 'VIOLENCE'
  | 'COPYRIGHT'
  | 'OTHER';

export interface CreateReportPayload {
  reelId?: string;
  reportedUserId?: string;
  reason: ReportReason;
  details?: string;
}

export const reportsApi = {
  create: (payload: CreateReportPayload) => api.post('/reports', payload),
};
