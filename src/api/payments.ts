import { api } from './client';

// Payment types and calls shared with the app (frontend/src/api/payments.ts).
// Paying is stubbed on the website until the Paytm web flow exists (see
// README → Payments), so there is no create-order / verify here. Refunds are a
// backend call — the server decides eligibility and amount — so cancelling a
// booking that was paid in the app works on the website too.

export type PaymentStage = 'ADVANCE' | 'FINAL';

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  txnToken: string;
  mid: string;
  checkoutHost?: string;
  amount: number;
  paymentType?: string;
  bookingId?: string;
  message?: string;
}

export interface RefundResponse {
  success: boolean;
  refunded?: number;
  pending?: boolean;
  message?: string;
}

export const paymentsApi = {
  refund: (bookingId: string, stage: PaymentStage) => api.post<RefundResponse>(`/payments/${bookingId}/refund`, { stage }),
};
