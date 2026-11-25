import { api } from './client';
import { Paginated, Review } from '@/types';

export const reviewsApi = {
  list: (artistId: string, page = 1) =>
    api.get<Paginated<Review>>(`/artists/${artistId}/reviews`, { params: { page } }),
  create: (payload: {
    bookingId: string;
    artistId: string;
    rating: number;
    subRatings?: Record<string, number>;
    comment?: string;
    photoUrl?: string;
  }) => api.post<Review>('/reviews', payload),
  respond: (reviewId: string, response: string) =>
    api.post<Review>(`/reviews/${reviewId}/respond`, { response }),
  report: (reviewId: string, reason: string) =>
    api.post(`/reviews/${reviewId}/report`, { reason }),
};
