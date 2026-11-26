import { api } from './client';
import { PortfolioItem } from '@/types';

export const portfolioApi = {
  add: (payload: { imageUrl: string; caption?: string; category?: string | null }) =>
    api.post<{ success: boolean; portfolioItem: PortfolioItem }>('/portfolio', payload),
  // Re-tag an already-saved image. null clears the tag (back to "All" only).
  update: (id: string, payload: { caption?: string; category?: string | null }) =>
    api.patch<{ success: boolean; portfolioItem: PortfolioItem }>(`/portfolio/${id}`, payload),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/portfolio/${id}`),
  reorder: (items: { id: string; order: number }[]) =>
    api.put<{ success: boolean; message: string }>('/portfolio/reorder', { items }),
};
