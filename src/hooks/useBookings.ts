import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/api';
import { Booking, Paginated } from '@/types';
import { useAuthStore } from '@/store/authStore';

export function useBookings(role: 'customer' | 'artist', status?: string) {
  return useQuery<Paginated<Booking>>({
    queryKey: ['bookings', role, status],
    queryFn: () => bookingsApi.list({ status }).then((r) => r.data),
  });
}

// Customer-only: polls for the OTP the artist has just requested (via
// send-start-otp/send-completion-otp) so it can be shown on the customer's
// screen without them needing to reopen it.
export function useActiveOtp(bookingId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['booking', bookingId, 'active-otp'],
    queryFn: () => bookingsApi.getActiveOtp(bookingId).then((r) => r.data),
    enabled: enabled && !!bookingId,
    refetchInterval: 5000,
    retry: false,
  });
}

// Confirmed bookings the artist hasn't opened yet. Drives the Home alert, the
// Schedule tab badge and the Account "NEW" label; refreshed every 30s and
// straight away when a booking push arrives (usePushNotifications).
export function useNewArtistBookings() {
  const isArtist = useAuthStore((s) => s.user?.role === 'ARTIST');
  return useQuery({
    queryKey: ['artist-new-bookings'],
    queryFn: () => bookingsApi.newForArtist().then((r) => r.data.bookings),
    enabled: isArtist,
    staleTime: 0,
    refetchInterval: 30 * 1000,
  });
}

// Openings per day for the next `days` days — the date strip. Keyed under
// ['slots', artistId] so anything that refreshes slots (a booking that lost a
// race, say) refreshes this too.
export function useAvailableDays(artistId: string, from: string, days: number, duration?: number) {
  return useQuery({
    queryKey: ['slots', artistId, 'days', from, days, duration],
    queryFn: () => bookingsApi.availableDays(artistId, from, days, duration!).then((r) => r.data),
    enabled: !!artistId && !!duration,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60 * 1000,
  });
}

export function useSlots(artistId: string, date: string, duration?: number) {
  return useQuery({
    queryKey: ['slots', artistId, date, duration],
    queryFn: () => bookingsApi.slots(artistId, date, duration).then((r) => r.data),
    // Slots are computed live on the server, so re-ask whenever the picker
    // opens and every 30s while it's open: an artist's new hours, or a slot
    // someone else just booked, show up without leaving the screen.
    enabled: !!artistId && !!date && !!duration,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30 * 1000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useBookingAction() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bookings'] });
  return {
    accept: useMutation({ mutationFn: bookingsApi.accept, onSuccess: invalidate }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        bookingsApi.reject(id, reason),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        bookingsApi.cancel(id, reason),
      onSuccess: invalidate,
    }),
    sendStartOtp: useMutation({
      mutationFn: (id: string) => bookingsApi.sendStartOtp(id),
    }),
    start: useMutation({
      mutationFn: ({ id, otp }: { id: string; otp: string }) =>
        bookingsApi.start(id, otp),
      onSuccess: invalidate,
    }),
    sendCompletionOtp: useMutation({
      mutationFn: (id: string) => bookingsApi.sendCompletionOtp(id),
    }),
    complete: useMutation({
      mutationFn: ({ id, otp }: { id: string; otp: string }) =>
        bookingsApi.complete(id, otp),
      onSuccess: invalidate,
    }),
    reschedule: useMutation({
      mutationFn: ({ id, newStartTime }: { id: string; newStartTime: string }) =>
        bookingsApi.reschedule(id, newStartTime),
      onSuccess: invalidate,
    }),
  };
}
