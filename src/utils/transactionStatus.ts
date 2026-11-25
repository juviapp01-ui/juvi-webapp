import { Transaction } from '@/types';

// Shared by WalletScreen and PayoutHistoryScreen. The backend always sends
// uppercase statuses; comparing against lowercase values used to leave every
// transaction stuck on "Processing".
export interface TransactionStatusInfo {
  label: string;
  // Icon/text tone: 'done' (settled), 'pending' (awaiting action),
  // 'rejected' (failed).
  tone: 'done' | 'pending' | 'rejected';
}

export function transactionStatusInfo(t: Pick<Transaction, 'type' | 'status'>): TransactionStatusInfo {
  const status = (t.status || '').toUpperCase();

  if (t.type === 'withdrawal') {
    // Payouts are transferred manually by JUVI:
    // PENDING (requested) -> PROCESSED (transfer sent) -> COMPLETED, or FAILED.
    switch (status) {
      case 'COMPLETED':
        return { label: 'Completed', tone: 'done' };
      case 'PROCESSED':
        return { label: 'Processed — transfer in progress', tone: 'pending' };
      case 'FAILED':
        return { label: 'Failed', tone: 'rejected' };
      case 'PENDING':
      default:
        return { label: 'Requested — awaiting transfer', tone: 'pending' };
    }
  }

  // Earnings are money in; they have no payout state of their own.
  return { label: 'Earned', tone: 'done' };
}
