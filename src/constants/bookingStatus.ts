import { BookingStatus } from '@/types';

// Single source of truth for booking status values/groupings. Mirrors the
// backend's Prisma BookingStatus enum (see normalizeBooking in
// src/api/bookings.ts, which lowercases the raw API value to match these).
// Never compare booking.status against a raw string literal elsewhere —
// import from here instead, so a backend enum change only needs updating
// in one place.
export const BOOKING_STATUS = {
  PENDING: 'pending',
  PENDING_ARTIST_APPROVAL: 'pending_artist_approval',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  SERVICE_COMPLETED: 'service_completed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const satisfies Record<string, BookingStatus>;

// Live, forward-looking appointment — safe to show "track location" actions.
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.IN_PROGRESS,
];

// Statuses the customer/artist can still cancel from.
export const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PENDING_ARTIST_APPROVAL,
  BOOKING_STATUS.CONFIRMED,
];

// "Upcoming" grouping for the customer/artist bookings-list filters.
export const UPCOMING_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PENDING_ARTIST_APPROVAL,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.IN_PROGRESS,
];

// A chat thread only makes sense once the artist has confirmed the booking,
// through to some time after the service is done.
export const CHAT_ELIGIBLE_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.SERVICE_COMPLETED,
  BOOKING_STATUS.COMPLETED,
];

export function canStartService(status: BookingStatus): boolean {
  return status === BOOKING_STATUS.CONFIRMED;
}

export function canCompleteService(status: BookingStatus): boolean {
  return status === BOOKING_STATUS.IN_PROGRESS;
}

// True once the artist has marked the service done, whether or not the
// final payment has been collected yet (SERVICE_COMPLETED vs COMPLETED).
export function isServiceDone(status: BookingStatus): boolean {
  return status === BOOKING_STATUS.SERVICE_COMPLETED || status === BOOKING_STATUS.COMPLETED;
}

export const BOOKING_STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  pending_artist_approval: 'Awaiting Approval',
  service_completed: 'Service Completed',
};

export const BOOKING_STATUS_VARIANT: Record<
  BookingStatus,
  'primary' | 'success' | 'error' | 'muted' | 'warning'
> = {
  pending: 'muted',
  pending_artist_approval: 'warning',
  confirmed: 'primary',
  in_progress: 'primary',
  service_completed: 'warning',
  completed: 'success',
  cancelled: 'error',
  expired: 'error',
};
