// Payment types shared with the app (frontend/src/api/payments.ts).
// Types only: payments are stubbed on the website until the Paytm web flow
// exists (see README → Payments), so nothing here calls the payment API.

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
