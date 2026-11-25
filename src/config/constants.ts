// Copied from the app (frontend/src/config/constants.ts) — keep in step.

export const OTP_LENGTH = 6;

// The 8 fixed service categories used app-wide (home screen rail, service
// category picker).
export const SERVICE_CATEGORIES = [
  'Indian Bridal Makeup',
  'Bridal Makeup',
  'Groom Services',
  'Party Makeup',
  'Editorial & Photoshoots',
  'Hair Styling',
  'Nail Services',
  'Skin & Facials',
] as const;

const cat = (file: string) => `/assets/images/categories/${file}`;

// Visual taxonomy for the Home screen category rail — same art the app bundles.
export const HOME_CATEGORY_CARDS = [
  { title: SERVICE_CATEGORIES[0], color: '#fff4f5', image: cat('indian-bridal.jpg') },
  { title: SERVICE_CATEGORIES[1], color: '#fff4f5', image: cat('bridal-makeup.jpg') },
  { title: SERVICE_CATEGORIES[2], color: '#f5f3f2', image: cat('groom.jpg') },
  { title: SERVICE_CATEGORIES[3], color: '#f8efea', image: cat('party-makeup.jpg') },
  { title: SERVICE_CATEGORIES[4], color: '#f5f3f2', image: cat('editorial.jpg') },
  { title: SERVICE_CATEGORIES[5], color: '#f9f2ef', image: cat('hair-styling.jpg') },
  { title: SERVICE_CATEGORIES[6], color: '#f7f1f9', image: cat('nail-services.jpg') },
  { title: SERVICE_CATEGORIES[7], color: '#f9f9ef', image: cat('skin-facials.jpg') },
];

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const LOGO = '/assets/images/logo.png';

// Fraction collected as advance at booking time — a display estimate only;
// the backend's booking.advanceAmount is authoritative. (Same as the app.)
export const ADVANCE_PAYMENT_PERCENTAGE = 0.5;

export const CANCELLATION_POLICY = {
  fullRefundHours: 24, // >24h => 100%
  partialRefundHours: 12, // 12-24h => 50%
  partialRefundRate: 0.5, // <12h => 0%
};

export const LOYALTY_TIERS = [
  { tier: 'bronze', min: 0 },
  { tier: 'silver', min: 500 },
  { tier: 'gold', min: 2000 },
] as const;
