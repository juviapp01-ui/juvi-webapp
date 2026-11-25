import dayjs from 'dayjs';

// Times as the backend stores them: India wall-clock "HH:MM", where an end of
// "24:00" means midnight at the end of the day.

export const MIDNIGHT_END = '24:00';

export const minutesOfHHMM = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const hhmmOfMinutes = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// "09:30" -> "9:30 AM"; "24:00" -> "12:00 AM (midnight)".
export const formatHHMM = (t: string) =>
  t === MIDNIGHT_END ? '12:00 AM (midnight)' : dayjs(`2000-01-01 ${t}`).format('h:mm A');

// Every half hour across the day — what the time pickers offer. Ends can
// also be midnight.
export const START_TIMES: string[] = Array.from({ length: 48 }, (_, i) => hhmmOfMinutes(i * 30));
export const END_TIMES: string[] = [...START_TIMES.slice(1), MIDNIGHT_END];

// Sunday=0..Saturday=6, the backend's convention.
export const WEEKDAYS = [
  { num: 1, short: 'Mon', name: 'Monday' },
  { num: 2, short: 'Tue', name: 'Tuesday' },
  { num: 3, short: 'Wed', name: 'Wednesday' },
  { num: 4, short: 'Thu', name: 'Thursday' },
  { num: 5, short: 'Fri', name: 'Friday' },
  { num: 6, short: 'Sat', name: 'Saturday' },
  { num: 0, short: 'Sun', name: 'Sunday' },
] as const;

// "Mon–Sat", "Every day", "Mon, Wed, Fri".
export const summarizeDays = (days: number[]) => {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  if (set.size === 0) return 'No days';
  const ordered = WEEKDAYS.filter((d) => set.has(d.num));
  const idx = ordered.map((d) => WEEKDAYS.findIndex((w) => w.num === d.num));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && ordered.length > 2) return `${ordered[0].short}–${ordered[ordered.length - 1].short}`;
  return ordered.map((d) => d.short).join(', ');
};

// Whether an artist is currently not taking bookings. Bookings reopen on
// their own once pausedUntil passes.
export const isArtistPaused = (a?: { isAvailable?: boolean; pausedUntil?: string | null } | null) =>
  !!a && a.isAvailable === false && (!a.pausedUntil || dayjs(a.pausedUntil).isAfter(dayjs()));
