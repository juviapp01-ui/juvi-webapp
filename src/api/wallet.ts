import { api } from './client';
import { Paginated, Transaction, WalletSummary } from '@/types';

export const walletApi = {
  summary: () => api.get<WalletSummary>('/wallet'),
  transactions: (page = 1, limit = 20) =>
    api.get<Paginated<Transaction>>('/wallet/transactions', { params: { page, limit } }),
  withdraw: (amount: number) => api.post('/wallet/withdraw', { amount }),
  // A bank account, a UPI ID, or both. Empty bank fields / upiId remove
  // what was saved before. `confirmed` is the artist's declaration.
  saveBankDetails: (details: {
    accountName?: string; accountNumber?: string; ifsc?: string;
    upiId?: string; preferredMethod?: 'BANK' | 'UPI'; confirmed: boolean;
  }) => api.post<{ success: boolean; message: string; bankName: string | null }>('/wallet/bank-details', details),
  // Bank and branch for an IFSC (404 when no branch has it).
  ifsc: (code: string) =>
    api.get<{ success: boolean; bank: string | null; branch: string | null; city: string | null; state: string | null }>(
      `/wallet/ifsc/${code}`
    ),
};
