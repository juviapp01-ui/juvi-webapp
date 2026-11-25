import dayjs from 'dayjs';

// IMPORTANT: All monetary amounts in this app are RUPEE INTEGERS (not paise).
// PaymentScreen, booking amounts, and service prices all share this convention,
// so this formatter must NOT divide by 100.
export const formatPrice = (rupees: number) =>
  `₹${Math.round(rupees).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const formatDate = (iso: string) => dayjs(iso).format('DD MMM YYYY');
export const formatTime = (iso: string) => dayjs(iso).format('h:mm A');
export const formatDateTime = (iso: string) => dayjs(iso).format('DD MMM, h:mm A');

export const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export const formatDuration = (totalSeconds: number) => {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

export const formatCompactNumber = (n: number) => {
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
};
