import { api } from './client';
import { SubscriptionTier } from '@/types';

// Mirrors the backend's shape() helper (subscription.controller.js).
export interface SubscriptionState {
  tier: SubscriptionTier;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  price: number;
  // Both undefined for FREE, which never renews or lapses.
  renewsAt?: string;
  startedAt?: string;
  portfolioMax: number;
}

// subscribe() returns one of two shapes depending on the tier requested:
// downgrading to FREE is applied immediately server-side (no gateway
// involved) and comes back as a full SubscriptionState; upgrading to a paid
// tier only opens a Paytm order — orderId/txnToken/mid/amount are present
// and none of SubscriptionState's fields are, since nothing is granted yet.
export interface SubscribeResponse extends Partial<SubscriptionState> {
  success: boolean;
  message?: string;
  subscriptionId?: string;
  orderId?: string;
  txnToken?: string;
  mid?: string;
  checkoutHost?: string;
  amount?: number;
}

export interface ConfirmSubscriptionResponse extends Omit<Partial<SubscriptionState>, 'status'> {
  success: boolean;
  // The poll outcome — distinct from SubscriptionState's own `status`
  // field (the ArtistSubscription row's ACTIVE/CANCELLED/etc, only present
  // once this resolves to SUCCESS).
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  message?: string;
}

export const subscriptionApi = {
  current: () => api.get<{ success: boolean } & SubscriptionState>('/subscription'),
  plans: () => api.get<{ success: boolean; plans: { tier: string; price: number; portfolioMax: number }[] }>('/subscription-plans'),
  subscribe: (tier: SubscriptionTier) => api.post<SubscribeResponse>('/subscription/subscribe', { tier }),
  // Called after the Paytm sheet returns, and polled — status is re-checked
  // against Paytm on every call, not trusted from the client, and repeat
  // calls for the same order are safe (see confirmSubscription's own
  // idempotency comment on the backend).
  confirm: (orderId: string) => api.post<ConfirmSubscriptionResponse>('/subscription/confirm', { orderId }),
  cancel: (reason: string) => api.post('/subscription/cancel', { reason }),
};
