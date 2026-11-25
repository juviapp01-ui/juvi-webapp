// Shared domain types for the JUVI platform

export type Role = 'CUSTOMER' | 'ARTIST' | 'ADMIN';

// Mirrors the backend's Prisma BookingStatus enum exactly (lowercased —
// normalizeBooking in src/api/bookings.ts lowercases the raw UPPERCASE
// value from the API). The backend has no ACCEPTED or REJECTED status: an
// accepted request becomes CONFIRMED, and there's no separate rejected
// state distinct from CANCELLED. See src/constants/bookingStatus.ts for the
// single source of truth for grouping/comparing these values.
export type BookingStatus =
  | 'pending'
  | 'pending_artist_approval'
  | 'confirmed'
  | 'in_progress'
  | 'service_completed'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type ArtistApplicationStatus = 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';

export type SubscriptionTier = 'free' | 'pro' | 'elite';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface User {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string;
  city?: string;
  state?: string;
  gender?: Gender;
  isSuspended: boolean;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

// An artist-run discount, shown as the badge on their card.
export interface ArtistOffer {
  id: string;
  label: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
}

export interface Artist {
  id: string;
  userId: string;
  name: string;
  // Only present from endpoints that select the nested User relation with
  // these fields (getMyProfile) — the public getById doesn't return them.
  phone?: string;
  email?: string;
  title?: string;
  bio: string;
  photoUrl?: string;
  city: string;
  isAvailable?: boolean;
  // With isAvailable false: when bookings reopen (null = until the artist
  // switches them back on).
  pausedUntil?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Where a STUDIO booking takes place. Absent until the artist publishes one,
  // in which case studio bookings aren't offered for them.
  studioAddress?: string | null;
  // Whether this artist takes HOME bookings at all, independent of distance
  // — a studio-only artist has this false (set at onboarding step 5).
  // Defaults true when absent (older artist rows / narrower endpoints).
  offersHomeService?: boolean;
  category: string[];
  rating: number;
  reviewCount: number;
  basePrice: number;
  distanceKm?: number;
  // The artist's own running discount, already resolved server-side to the
  // best live one. Absent when they have none; expired and paused offers
  // never reach here.
  offer?: ArtistOffer | null;
  // Cheapest service and its duration, so a card can show "from Rs1,200 -
  // 45 mins" without scanning the service list.
  startingPrice?: number | null;
  durationMins?: number | null;
  // How far this artist will travel for a home booking, in km.
  maxTravelDistance?: number;
  // Whether this artist would travel to the customer's current location for
  // a home booking. True when either side's coordinates are unknown — see
  // getArtistById's comment for why "unknown" isn't grounds to block.
  inReach?: boolean;
  isVerified: boolean;
  kycStatus: ArtistApplicationStatus;
  subscriptionTier: SubscriptionTier;
  portfolio: PortfolioItem[];
  reels: Reel[];
  services: Service[];
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  caption?: string;
  order: number;
  // One of the artist's own service categories, or null for an image that
  // was never tagged — those only show under "All".
  category?: string | null;
  // Only on the artist's own view of their profile — customers are only ever
  // sent approved items. False = still awaiting admin review.
  isApproved?: boolean;
}

export interface ReelArtistSummary {
  id: string;
  // The underlying users.id, distinct from `id` (the artist_profiles.id
  // above) — required by /reports and /blocks, which key off the user table.
  userId?: string;
  name: string;
  photoUrl?: string;
  rating?: number;
}

export interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  durationSeconds?: number;
  viewCount?: number;
  createdAt?: string;
  artistId?: string;
  // Only present on /reels/feed items — the artist's own reel list already
  // has this context from the screen, so /reels/mine doesn't need to send it.
  artist?: ReelArtistSummary;
  // Legacy fake-engagement field, only ever populated by the mock artist-profile
  // reel viewer (ReelPlayer/ReelViewerScreen) — superseded by isLiked/likeCount
  // below on the real feed/mine/saved endpoints, but left optional for that
  // mock viewer's fallback.
  likes?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  likeCount?: number;
  saveCount?: number;
}

export interface TrendDecodeItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt?: string;
}

export interface Service {
  id: string;
  artistId: string;
  title: string;
  description: string;
  price: number;
  durationMin: number;
  category: string;
  visibleTo?: 'MALE' | 'FEMALE' | 'ALL';
}

export interface Slot {
  id: string;
  artistId: string;
  startTime: string; // ISO
  endTime: string;
  isBlocked: boolean;
}

export interface Booking {
  id: string;
  // When the artist first opened it; null on a confirmed booking = new to them.
  artistSeenAt?: string | null;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerGender?: Gender;
  artistId: string;
  // The artist's users.id (distinct from artistId, the artist_profiles.id).
  // Only present where the backend's select nests artistProfile.user — not
  // every booking endpoint does.
  artistUserId?: string;
  artistName: string;
  artistPhone?: string;
  serviceId: string;
  serviceTitle: string;
  status: BookingStatus;
  scheduledAt: string;
  amount: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  advancePaid: boolean;
  finalPaid: boolean;
  // Snapshotted by the backend when the booking was made — the admin-set
  // rate (or the artist's tier rate) at that moment. 0 is a real rate.
  commissionRate: number;
  // What the artist is actually paid for this booking, as the backend
  // computed it. Absent only on older/stub shapes.
  artistPayout?: number | null;
  address?: string;
  // Where the booking happens, once the address has been resolved on a map.
  // Absent when it never was, in which case the app falls back to the text.
  latitude?: number | null;
  longitude?: number | null;
  bookingType?: 'STANDARD' | 'BRIDAL' | 'EVENT' | 'FASHION_SHOOT';
  locationType?: 'HOME' | 'STUDIO';
  // The booked service's duration, in minutes. Absent for older bookings the
  // backend hasn't backfilled — show a placeholder rather than a guess.
  durationMin?: number | null;
  // What the customer wrote at booking time (CreateBookingPayload.notes).
  // Absent when they left it blank.
  notes?: string;
  // Discount already resolved and applied server-side at booking time (e.g.
  // from the artist's own offer, see ArtistOffer) — flat fields on the
  // backend's Booking model. amount/label/source are 0/null/null when
  // nothing was applied — never computed client-side, so this can't
  // advertise a discount the backend didn't actually honour.
  discountAmount?: number;
  discountLabel?: string | null;
  // Backend enum (DiscountSource); kept as string since the app only
  // displays discountLabel and doesn't branch on where the discount came from.
  discountSource?: string | null;
  // advancePaid/finalPaid only ever say a stage was once paid — never
  // whether it's since been refunded. That's this: the Payment rows
  // themselves, whose status moves SUCCESS -> REFUNDED. Only present on the
  // single-booking fetch, not the list.
  payments?: {
    id: string;
    paymentType: 'ADVANCE' | 'FINAL' | 'REFUND';
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    refundAmount?: number | null;
    refundId?: string | null;
  }[];
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  artistId: string;
  customerName: string;
  rating: number;
  subRatings?: Record<string, number>;
  comment?: string;
  photoUrl?: string;
  artistResponse?: string;
  createdAt: string;
}

// A message in this booking's thread with JUVI. Customers and artists don't
// message each other — each has their own thread, and staff pass things
// between them — so the only two sides here are "me" and JUVI.
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  // Written by a JUVI staff member rather than by me.
  fromStaff: boolean;
  createdAt: string;
}

export interface WalletSummary {
  available: number;
  // Withdrawals requested or being transferred, not yet received in the bank.
  pending: number;
  // Total already transferred to the artist's bank (COMPLETED withdrawals).
  withdrawn: number;
  // A withdrawal is waiting for JUVI to start the transfer; only one at a time.
  hasOpenRequest: boolean;
  total: number;
  // What clients actually paid (before commission) and JUVI's cut of it —
  // `total` above is already net (gross - commission).
  gross: number;
  commission: number;
  earningsCount: number;
  avgRate: number;
  bankDetails: {
    accountName: string; accountNumber: string; ifsc: string;
    // Looked up from the IFSC when saved.
    bankName?: string | null; bankBranch?: string | null;
  } | null;
  upiId?: string | null;
  // Which one payouts go to when both are on file.
  preferredPayoutMethod?: 'BANK' | 'UPI' | null;
  // When the artist last confirmed the details are correct.
  payoutDetailsConfirmedAt?: string | null;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'refund';
  amount: number;
  // Earnings: 'EARNED'. Withdrawals: 'PENDING' | 'PROCESSED' | 'COMPLETED' |
  // 'FAILED'. Always uppercase, as the backend sends it.
  status: string;
  // Why a withdrawal FAILED, as entered by the admin.
  rejectionReason?: string;
  // Bank reference recorded by the admin once the transfer is sent.
  transactionRef?: string;
  createdAt: string;
}

export interface LoyaltyState {
  points: number;
  tier: 'bronze' | 'silver' | 'gold';
  history: { id: string; label: string; points: number; createdAt: string }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  deepLink?: string;
  read: boolean;
  createdAt: string;
}

export interface CourseCategory {
  id: string;
  name: string;
  imageUrl?: string;
  courseCount?: number;
}

export interface CourseLesson {
  id: string;
  title: string;
  // Admin-written, optional. Sent even for unpurchased courses.
  description?: string | null;
  order: number;
  durationSeconds?: number;
  // Omitted by the backend for locked/unpurchased lessons — fetch via
  // GET /courses/:id/lessons/:lessonId to get the authoritative URL.
  videoUrl?: string;
  // PDF lessons have no video: their pages load one by one from
  // GET /courses/:id/lessons/:lessonId/pages/:n.
  type: 'VIDEO' | 'PDF';
  pageCount?: number | null;
  // Topics the lesson covers; [] when it has none. Sent for unbought courses too.
  syllabus: string[];
  locked: boolean;
  completed: boolean;
}

export interface Course {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  price: number;
  purchased: boolean;
  lessons: CourseLesson[];
  // Populated from the backend's `lessonCount`/`totalDurationSeconds`/`level`
  // fields on GET /courses and GET /courses/:id. Still optional/undefined
  // for the rare course missing one of these on the backend — undefined
  // means "unknown", not zero.
  lessonCount?: number;
  durationSeconds?: number;
  level?: string;
}

export interface CourseProgress {
  completedLessonIds: string[];
  completedCount: number;
  totalLessons: number;
  nextLessonId?: string;
}

export interface ContinueLearningInfo {
  courseId: string;
  courseTitle: string;
  thumbnailUrl?: string;
  lessonTitle: string;
  completedCount: number;
  totalLessons: number;
  percent: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  // Only ever set by GET /notifications — other paginated endpoints don't
  // return this and it stays undefined for them.
  unread?: number;
}

export interface DashboardStats {
  totalViews: number;
  newComments: number;
  reach: number;
  monthlyRevenue: number;
  revenueTrending: number;
  bookingsCount: number;
  bookingsTrending: 'up' | 'down' | 'flat';
}

export interface DashboardData {
  stats: DashboardStats;
  recentReels: Reel[];
  recentBookings: Booking[];
}

// ─── Home CMS ─────────────────────────────────────────────────────────────
// Shapes returned by GET /home-layout. The screen maps `slug` to a component
// and hands it `data`, so adding a section type is a lookup-table change.
// Every block on the Home screen. The first five carry admin-written copy;
// the rest render from live data and can only be moved or hidden.
export const HOME_EDITABLE_SLUGS = ['hero', 'categories', 'learn_banner', 'promo_banner', 'footer'] as const;

export const HOME_DATA_SLUGS = [
  'search',
  'continue_learning',
  'most_booked',
  'top_artists',
  'featured_reels',
  'trend_decode',
] as const;

// One list, and the type is derived from it. These used to be hand-written
// unions with a separate hand-written whitelist in the API layer — which is
// how six sections came to be dropped silently: the union was widened and the
// whitelist wasn't, and nothing type-checks a string array against a union it
// is already a valid member of.
export const HOME_SECTION_SLUGS = [...HOME_EDITABLE_SLUGS, ...HOME_DATA_SLUGS] as const;

export type HomeEditableSlug = typeof HOME_EDITABLE_SLUGS[number];
export type HomeDataSlug = typeof HOME_DATA_SLUGS[number];
export type HomeSectionSlug = typeof HOME_SECTION_SLUGS[number];

export interface HomeHeroData {
  imageUrl: string | null;
  // When set the hero plays this instead. imageUrl stays the poster — shown
  // while it buffers, and what a failed load falls back to.
  videoUrl?: string | null;
  heading: string | null;
  subtitle: string | null;
  ctaText: string | null;
  avatarUrls: string[];
}

export interface HomeCategoryTileData {
  id: string;
  title: string;
  // Null when the admin hasn't uploaded one — the app shows its built-in
  // artwork for that category, or a placeholder.
  imageUrl: string | null;
  bgColor: string | null;
  displayOrder: number;
}

export interface HomeCategoriesData {
  tiles: HomeCategoryTileData[];
}

export interface HomePromoData {
  badgeText: string | null;
  heading: string | null;
  subtitle: string | null;
  buttonText: string | null;
  imageUrl: string | null;
  ctaTarget: string | null;
  ctaParams: Record<string, unknown> | null;
}

export interface HomeFooterData {
  heading: string | null;
  cities: string | null;
  copyright: string | null;
}

export interface HomeLayoutSection {
  slug: HomeSectionSlug;
  order: number;
  data: HomeHeroData | HomeCategoriesData | HomePromoData | HomeFooterData | null;
}

// Feature row on either Learn banner: icon + label(s).
export interface HomeFeatureItem {
  icon: string | null;
  title: string;
  subtitle: string | null;
}

export interface HomeLearnData {
  imageUrl: string | null;
  heading: string | null;
  subtitle: string | null;
  ctaText: string | null;
  items: HomeFeatureItem[];
}

// Editable block fetched on its own via GET /content/:slug — used by the
// Learn with Annalia page banner, which isn't part of the Home aggregate.
export interface PageContent {
  slug: string;
  imageUrl: string | null;
  heading: string | null;
  subtitle: string | null;
  body: string | null;
  ctaText: string | null;
  mediaUrls: string[];
  items: HomeFeatureItem[];
}
