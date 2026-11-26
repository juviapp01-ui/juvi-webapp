import dayjs from 'dayjs';
import { MIDNIGHT_END, formatHHMM, hhmmOfMinutes, minutesOfHHMM } from '@/utils/availability';

// Rules for the artist's "Block time" sheet, kept free of React so they can
// be tested on their own (src/utils/__tests__/blockTime.test.ts).
// All dates and times are India time (IST, UTC+5:30, no daylight saving),
// whatever timezone the phone is set to — the backend reads them the same way.

export const IST_OFFSET_MIN = 330;

// "From" choices: every 30 minutes, 6:00 AM to 11:30 PM.
export const BLOCK_FROM_TIMES: string[] = Array.from({ length: 36 }, (_, i) => hhmmOfMinutes(6 * 60 + i * 30));
// "To" choices: 6:30 AM to midnight, so a block can run to the end of the day.
export const BLOCK_TO_TIMES: string[] = [...BLOCK_FROM_TIMES.slice(1), MIDNIGHT_END];

export type BlockSelection = {
  date: string | null; // YYYY-MM-DD (India date)
  endDate: string | null; // last day of a whole-day range, inclusive
  wholeDay: boolean;
  start: string | null; // HH:MM
  end: string | null; // HH:MM, or 24:00
  reason: string;
};

export const emptyBlockSelection = (): BlockSelection => ({
  date: null,
  endDate: null,
  wholeDay: true,
  start: null,
  end: null,
  reason: '',
});

// The India date and minute-of-day at `now`.
export function istNow(now: Date = new Date()): { date: string; minute: number } {
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

// Tapping a calendar day. Whole day: the first tap picks the day, a later day
// makes it a range, any other tap starts over. Part of the day: one date.
export function selectBlockDay(sel: BlockSelection, day: string): BlockSelection {
  if (sel.wholeDay && sel.date && !sel.endDate && day > sel.date) return { ...sel, endDate: day };
  return { ...sel, date: day, endDate: null };
}

// Switching Whole day / Part of the day. A range only exists for whole days.
export function setBlockWholeDay(sel: BlockSelection, wholeDay: boolean): BlockSelection {
  return { ...sel, wholeDay, endDate: wholeDay ? sel.endDate : null };
}

// Picking a From time drops a To that would no longer come after it.
export function selectBlockStart(sel: BlockSelection, start: string): BlockSelection {
  const keepEnd = sel.end && minutesOfHHMM(sel.end) > minutesOfHHMM(start);
  return { ...sel, start, end: keepEnd ? sel.end : null };
}

export function selectBlockEnd(sel: BlockSelection, end: string): BlockSelection {
  return { ...sel, end };
}

// Whether a To chip can be chosen: after From, and (today) still ahead.
export function isBlockEndDisabled(sel: BlockSelection, end: string, now: Date = new Date()): boolean {
  const endMin = minutesOfHHMM(end);
  if (sel.start && endMin <= minutesOfHHMM(sel.start)) return true;
  const ist = istNow(now);
  return sel.date === ist.date && endMin <= ist.minute;
}

// Why the Block button can't be pressed yet, or null when it can.
export function blockInvalidReason(sel: BlockSelection, now: Date = new Date()): string | null {
  if (!sel.date) return 'Pick a date on the calendar';
  const ist = istNow(now);
  if (sel.date < ist.date) return 'That date has already passed';
  if (sel.wholeDay) {
    if (sel.endDate && sel.endDate < sel.date) return 'The last day must be after the first day';
    return null;
  }
  if (!sel.start) return 'Pick a From time';
  if (!sel.end) return 'Pick a To time';
  if (minutesOfHHMM(sel.end) <= minutesOfHHMM(sel.start)) return 'To must be after From';
  if (sel.date === ist.date && minutesOfHHMM(sel.end) <= ist.minute) return 'That time has already passed';
  return null;
}

// "Blocking 27 Nov, 2:00 PM – 4:30 PM", "Blocking 27 Nov (whole day)",
// "Blocking 27 Nov – 29 Nov (3 days)". Null until there's a date.
export function describeBlockSelection(sel: BlockSelection): string | null {
  if (!sel.date) return null;
  const first = dayjs(sel.date).format('D MMM');
  if (sel.wholeDay) {
    if (sel.endDate && sel.endDate !== sel.date) {
      const days = dayjs(sel.endDate).diff(dayjs(sel.date), 'day') + 1;
      return `Blocking ${first} – ${dayjs(sel.endDate).format('D MMM')} (${days} days)`;
    }
    return `Blocking ${first} (whole day)`;
  }
  const from = sel.start ? formatHHMM(sel.start) : '…';
  const to = sel.end ? formatHHMM(sel.end) : '…';
  return `Blocking ${first}, ${from} – ${to}`;
}

export type AddBlockPayload = { date: string; endDate?: string; startTime?: string; endTime?: string; reason?: string };

// The body for POST /availability/blocks — only call when blockInvalidReason is null.
export function buildBlockPayload(sel: BlockSelection): AddBlockPayload {
  if (!sel.date) throw new Error('No date selected');
  const reason = sel.reason.trim() || undefined;
  if (sel.wholeDay) {
    return {
      date: sel.date,
      ...(sel.endDate && sel.endDate !== sel.date ? { endDate: sel.endDate } : {}),
      ...(reason ? { reason } : {}),
    };
  }
  return { date: sel.date, startTime: sel.start!, endTime: sel.end!, ...(reason ? { reason } : {}) };
}
