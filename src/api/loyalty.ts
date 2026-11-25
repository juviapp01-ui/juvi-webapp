import { api } from './client';
import { LoyaltyState } from '@/types';

export const loyaltyApi = {
  state: () => api.get<LoyaltyState>('/loyalty'),
  redeem: (points: number) => api.post('/loyalty/redeem', { points }),
};
