import { api } from './client';
import { ChatMessage } from '@/types';

export interface ChatHistory {
  success: boolean;
  messages: ChatMessage[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export const chatApi = {
  // Returns this user's own thread only — never the other party's.
  history: (bookingId: string, page = 1) =>
    api.get<ChatHistory>(`/chat/${bookingId}/messages`, { params: { page } }),
  markRead: (bookingId: string) => api.post(`/chat/${bookingId}/read`),
};
