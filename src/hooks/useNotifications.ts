import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';

// Backs both the Chat-tab dot and the Account-header bell — there's no
// separate "unread chat messages" endpoint, so both were previously just a
// permanently-on dot with no real signal behind it at all. GET /notifications
// already computes a real unread count on every call (not paginated), so
// this reuses it rather than adding a second endpoint for the same idea.
export function useUnreadNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list(1).then((r) => r.data.unread ?? 0),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });
  return data ?? 0;
}
