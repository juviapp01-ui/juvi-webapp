import dayjs, { type Dayjs } from 'dayjs';

// Dates and times are India time (IST, UTC+5:30, no daylight saving) whatever
// timezone the computer is set to — same as the app. dayjs formats in local
// time, so an instant is shifted until its local reading is the India clock.
const IST_OFFSET_MIN = 330;

export function istDayjs(value?: string | Date | number): Dayjs {
  const d = value === undefined ? new Date() : new Date(value);
  return dayjs(d.getTime() + (IST_OFFSET_MIN + d.getTimezoneOffset()) * 60 * 1000);
}

// Today's India date, YYYY-MM-DD.
export const istToday = () => istDayjs().format('YYYY-MM-DD');

export const formatIstDate = (iso: string, fmt = 'ddd, D MMM YYYY') => istDayjs(iso).format(fmt);
export const formatIstTime = (iso: string) => istDayjs(iso).format('h:mm A');
export const formatIstDateTime = (iso: string) => istDayjs(iso).format('ddd, D MMM · h:mm A');
