import { api } from './client';
import { Booking, Paginated, Slot } from '@/types';
import { ADVANCE_PAYMENT_PERCENTAGE } from '@/config/constants';

export type BookingType = 'STANDARD' | 'BRIDAL' | 'EVENT' | 'FASHION_SHOOT';
export type LocationType = 'HOME' | 'STUDIO';

export interface CreateBookingPayload {
  artistId: string;
  serviceIds: string[];
  startTime: string; // ISO
  bookingType: BookingType;
  locationType: LocationType;
  customerAddress?: string;
  notes?: string;
  isMultiDay?: boolean;
  endDate?: string;
}

export interface AvailabilityDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DayOff {
  id: string;
  date: string;
  reason: string | null;
}

// GET /availability/me. Until an artist saves their own hours they're
// bookable during the admin-set defaults (usingDefaultHours + defaultHours).
export interface MyAvailability {
  success: boolean;
  availability: AvailabilityDay[];
  usingDefaultHours?: boolean;
  defaultHours?: { days: number[]; startTime: string; endTime: string };
  paused?: boolean;
  pausedUntil?: string | null;
}

// A stretch the artist can't be booked — a whole day or part of one.
// kind 'dayOff' = a day off saved by an older app build (removed through the
// days-off endpoint).
export interface TimeBlock {
  id: string;
  kind: 'block' | 'dayOff';
  startTime: string;
  endTime: string;
  allDay: boolean;
  reason: string | null;
}

export interface ActiveOtp {
  otp: string | null;
  stage: 'start' | 'completion' | null;
}

function normalizeBooking(b: any): Booking {
  if (!b) return b;
  // Real /bookings/my shape nests these under artistProfile.user and a
  // bookingServices[] join table rather than the flat artist/service the
  // frontend originally guessed at — keep both so either shape resolves.
  const primaryService = b.bookingServices?.[0]?.service ?? b.service;
  const primaryBookingService = b.bookingServices?.[0];
  if (__DEV__ && (!b.artistName && !b.artistProfile?.user?.name && !b.artist?.user?.name && !b.artist?.name)) {
    // TEMP DEBUG: none of our known artist-name paths matched — log the raw
    // shape once so the real path can be confirmed, then remove this block.
    console.log('[bookingsApi] unrecognized artist shape, raw booking:', JSON.stringify(b, null, 2));
  }
  // Customer has no separate profile table (unlike Artist), so the nested
  // shape is expected to be flatter — but resolve it the same defensive way
  // as artistName above rather than trusting a single flat field.
  const customerName =
    b.customerName || b.customer?.user?.name || b.customer?.name || undefined;
  const customerPhone =
    b.customerPhone || b.customer?.user?.phone || b.customer?.phone || undefined;
  const customerGender =
    b.customerGender || b.customer?.user?.gender || b.customer?.gender || undefined;
  if (__DEV__ && !customerName) {
    console.log('[bookingsApi] unrecognized customer shape, raw booking:', JSON.stringify(b, null, 2));
  }
  const totalAmount = b.totalAmount ?? b.amount ?? primaryService?.price ?? 0;
  // b.advanceAmount is the backend-authoritative value; the estimate below is
  // only a fallback for shapes where the backend hasn't sent it.
  const advanceAmount = b.advanceAmount ?? Math.round(totalAmount * ADVANCE_PAYMENT_PERCENTAGE);
  return {
    ...b,
    customerName,
    customerPhone,
    customerGender,
    // The real users.id behind the artist on this booking — distinct from
    // artistId, which is the artist_profiles.id. Needed wherever a call
    // (report/block, etc.) takes a users.id and not a profile id.
    artistUserId: b.artistUserId || b.artistProfile?.user?.id || b.artist?.user?.id || undefined,
    artistName:
      b.artistName ||
      b.artistProfile?.user?.name ||
      b.artistProfile?.businessName ||
      b.artistProfile?.name ||
      b.artist?.user?.name ||
      b.artist?.name ||
      b.artist?.businessName ||
      primaryBookingService?.artist?.user?.name ||
      primaryBookingService?.artist?.name ||
      'Unknown Artist',
    serviceTitle: b.serviceTitle || primaryService?.title || primaryService?.name || 'Service',
    // Backend enums are UPPERCASE elsewhere (see Role: 'CUSTOMER'|'ARTIST'),
    // but the app's BookingStatus type/filter map are lowercase — normalize
    // here so "CANCELLED" from the API still matches FILTER_STATUS_MAP's
    // 'cancelled' and statusVariant's lookup instead of silently missing both.
    status: String(b.status || b.state || 'pending').toLowerCase(),
    scheduledAt: b.scheduledAt || b.startTime || b.start || new Date().toISOString(),
    amount: b.amount ?? b.totalAmount ?? primaryService?.price ?? 0,
    // Advance-payment split: prefer the backend's authoritative numbers;
    // only derive locally (e.g. for stub/dev data) when the backend omits them.
    totalAmount,
    advanceAmount,
    remainingAmount: b.remainingAmount ?? (totalAmount - advanceAmount),
    advancePaid: b.advancePaid ?? false,
    finalPaid: b.finalPaid ?? false,
    durationMin: b.durationMin ?? primaryService?.durationMin ?? null,
    notes: b.notes ?? b.note ?? undefined,
    // Confirmed: flat fields on the Prisma Booking model, same shape on
    // both the admin and customer-facing endpoints.
    discountAmount: b.discountAmount ?? 0,
    discountLabel: b.discountLabel ?? null,
    discountSource: b.discountSource ?? null,
  };
}

// A confirmed booking the artist hasn't opened yet (GET /bookings/artist/new).
export interface NewArtistBooking {
  id: string;
  startTime: string;
  locationType: 'STUDIO' | 'HOME';
  totalAmount: number;
  advanceAmount: number;
  createdAt: string;
  customerName: string;
  customerImage: string | null;
  services: string[];
}

// One day in the customer's date strip: how many start times are open, and
// the first of them (GET /availability/days/:artistId).
export interface DayAvailability {
  date: string; // YYYY-MM-DD (India)
  count: number;
  firstStart: string | null;
}

export interface BookingPricing {
  homeServiceFee: number;
  // Fractions, not percentages: 0.05 = 5%.
  convenienceFeePct: number;
  advancePct: number;
  // Admin-set base commission, and the rate each paid tier gets instead
  // (e.g. { PRO: 0.1, ELITE: 0.08 }). Optional until the backend sends them —
  // the app shows no figure rather than a guessed one.
  commissionRate?: number;
  tierCommissionRates?: Record<string, number>;
}

export const bookingsApi = {
  slots: async (artistId: string, date: string, duration?: number) => {
    const res = await api.get<any>(`/availability/slots/${artistId}`, { params: { date, duration } });
    const data = res.data;
    const slotList = Array.isArray(data) ? data : (Array.isArray(data?.slots) ? data.slots : (Array.isArray(data?.data) ? data.data : []));
    res.data = slotList.map((s: any) => ({ ...s, startTime: s.startTime || s.start }));
    return res as { data: Slot[] };
  },
  create: async (payload: CreateBookingPayload) => {
    const res = await api.post<any>('/bookings', payload);
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  cancel: async (id: string, reason?: string) => {
    const res = await api.patch<any>(`/bookings/${id}/cancel`, { reason });
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  accept: async (id: string) => {
    const res = await api.patch<any>(`/bookings/${id}/accept`);
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  reject: async (id: string, reason: string) => {
    const res = await api.patch<any>(`/bookings/${id}/reject`, { reason });
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  sendStartOtp: async (id: string) => {
    return api.patch<any>(`/bookings/${id}/send-start-otp`);
  },
  start: async (id: string, otp: string) => {
    const res = await api.patch<any>(`/bookings/${id}/start`, { otp });
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  sendCompletionOtp: async (id: string) => {
    return api.patch<any>(`/bookings/${id}/send-completion-otp`);
  },
  // Customer-only: reads the OTP the artist just requested, so the customer
  // can read it aloud instead of it being sent to the artist directly.
  getActiveOtp: async (id: string) => {
    const res = await api.get<any>(`/bookings/${id}/active-otp`);
    const raw = res.data?.data ?? res.data;
    res.data = {
      otp: raw?.otp ?? null,
      stage: raw?.stage ?? null,
    };
    return res as { data: ActiveOtp };
  },
  complete: async (id: string, otp: string) => {
    const res = await api.patch<any>(`/bookings/${id}/complete`, { otp });
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  reschedule: async (id: string, newStartTime: string) => {
    const res = await api.patch<any>(`/bookings/${id}/reschedule`, { newStartTime });
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  list: async (params: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get<any>('/bookings/my', { params });
    const raw = res.data;
    const items = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw?.bookings) ? raw.bookings : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : [])));
    res.data = {
      items: items.map(normalizeBooking),
      page: raw?.page ?? 1,
      pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
      total: raw?.total ?? items.length,
    };
    return res as { data: Paginated<Booking> };
  },
  history: async (params: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const res = await api.get<any>('/bookings/history', { params });
    const raw = res.data;
    const items = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw?.bookings) ? raw.bookings : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : [])));
    res.data = {
      items: items.map(normalizeBooking),
      page: raw?.page ?? 1,
      pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
      total: raw?.total ?? items.length,
    };
    return res as { data: Paginated<Booking> };
  },
  newForArtist: () =>
    api.get<{ success: boolean; count: number; bookings: NewArtistBooking[] }>('/bookings/artist/new'),
  // Fees set in the admin console — what the backend actually charges.
  pricing: () => api.get<{ success: boolean; pricing: BookingPricing }>('/bookings/pricing'),
  getById: async (id: string) => {
    const res = await api.get<any>(`/bookings/${id}`);
    res.data = normalizeBooking(res.data?.booking || res.data?.data || res.data);
    return res as { data: Booking };
  },
  availableDays: (artistId: string, from: string, days: number, duration: number) =>
    api.get<{ success: boolean; days: DayAvailability[]; paused: boolean; pausedUntil: string | null }>(
      `/availability/days/${artistId}`,
      { params: { from, days, duration } }
    ),
  setAvailability: (days: AvailabilityDay[]) => api.post('/availability', days),
  // The caller's own weekly hours, so the editor can open on what they
  // actually set rather than on a made-up default.
  getMyAvailability: () => api.get<MyAvailability>('/availability/me'),
  // Specific dates marked off — overrides the weekly pattern for that one
  // date (holiday, personal leave), rather than the recurring hours above.
  getMyDaysOff: () =>
    api.get<{ success: boolean; daysOff: DayOff[] }>('/availability/days-off'),
  addDayOff: (date: string, reason?: string) =>
    api.post<{ success: boolean; dayOff: DayOff }>('/availability/days-off', { date, reason }),
  removeDayOff: (id: string) => api.delete(`/availability/days-off/${id}`),
  // Block time: date is YYYY-MM-DD; no start/end = the whole day. Times are
  // "HH:MM" (end may be "24:00").
  getMyBlocks: () => api.get<{ success: boolean; blocks: TimeBlock[] }>('/availability/blocks'),
  // endDate (YYYY-MM-DD, inclusive) blocks every whole day from date to it.
  addBlock: (input: { date: string; endDate?: string; startTime?: string; endTime?: string; reason?: string }) =>
    api.post<{ success: boolean; block: TimeBlock }>('/availability/blocks', input),
  removeBlock: (id: string) => api.delete(`/availability/blocks/${id}`),
  // Stop taking new bookings; `until` (YYYY-MM-DD) is the date they reopen.
  setPause: (paused: boolean, until?: string) =>
    api.put<{ success: boolean; paused: boolean; pausedUntil: string | null }>('/availability/pause', { paused, until }),
};
