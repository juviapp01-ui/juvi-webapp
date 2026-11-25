import { AxiosError } from 'axios';
import { paymentsApi, PaymentStage } from '@/api';
import { Booking } from '@/types';
import { getErrorMessage } from './errors';

export interface RefundAttemptResult {
  stage: PaymentStage;
  ok: boolean;
  message: string;
}

// Called wherever a booking can end up CANCELLED in front of the customer —
// right after they cancel it themselves, and whenever they view a booking an
// artist has just rejected. The backend (requestRefund) is the source of
// truth for eligibility and amount; this just calls it for whichever stages
// were actually paid and turns the result into something worth showing.
//
// Safe to call more than once for the same booking: a repeat call on an
// already-refunded payment comes back 409, treated here as an informational
// no-op rather than a failure.
export async function refundOutstandingStages(
  booking: Pick<Booking, 'id' | 'advancePaid' | 'finalPaid'>
): Promise<RefundAttemptResult[]> {
  const stages: PaymentStage[] = [
    ...(booking.advancePaid ? (['ADVANCE'] as const) : []),
    ...(booking.finalPaid ? (['FINAL'] as const) : []),
  ];

  const results: RefundAttemptResult[] = [];
  for (const stage of stages) {
    try {
      const { data } = await paymentsApi.refund(booking.id, stage);
      results.push({
        stage,
        ok: true,
        message: data.message ?? (data.refunded ? `₹${data.refunded} refunded` : 'Refund processed'),
      });
    } catch (error) {
      if ((error as AxiosError)?.response?.status === 409) {
        results.push({ stage, ok: true, message: 'Already refunded' });
      } else {
        results.push({
          stage,
          ok: false,
          message: getErrorMessage(error, 'Refund could not be processed automatically'),
        });
      }
    }
  }
  return results;
}
