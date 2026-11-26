import { api } from './client';
import { DashboardData } from '@/types';

export const dashboardApi = {
  getArtistDashboard: () => api.get<DashboardData>('/artist/dashboard'),
};
