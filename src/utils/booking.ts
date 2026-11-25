import dayjs from 'dayjs';
import { CANCELLATION_POLICY } from '@/config/constants';

/** Returns refund fraction (0..1) based on hours until the booking start. */
export function refundFraction(scheduledAt: string): number {
  const hours = dayjs(scheduledAt).diff(dayjs(), 'hour', true);
  if (hours >= CANCELLATION_POLICY.fullRefundHours) return 1;
  if (hours >= CANCELLATION_POLICY.partialRefundHours)
    return CANCELLATION_POLICY.partialRefundRate;
  return 0;
}
