import { api } from './client';
import { AppNotification, Paginated } from '@/types';

export interface NotificationPreferences {
  bookings: boolean;
  messages: boolean;
  promotions: boolean;
}

export const notificationsApi = {
  list: (page = 1) =>
    api.get<Paginated<AppNotification>>('/notifications', { params: { page } }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  registerToken: (token: string) => api.post('/users/me/push-token', { token }),
  preferences: () => api.get<{ success: boolean } & NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (prefs: Partial<NotificationPreferences>) =>
    api.patch<{ success: boolean } & NotificationPreferences>('/notifications/preferences', prefs),
};
