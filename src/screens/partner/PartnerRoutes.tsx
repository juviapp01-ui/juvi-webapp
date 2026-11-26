import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { Page } from '@/components/ui/Page';
import { PaymentStub } from '@/components/ui/PaymentStub';
import { PartnerTabsLayout } from '@/layouts/AppShell';
import { useNewArtistBookings, useUnreadNotifications } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import ReelsFeedScreen from '@/screens/customer/ReelsFeedScreen';
import ArtistDetailScreen from '@/screens/customer/ArtistDetailScreen';
import { ChatListScreen, ChatRoomScreen } from '@/screens/chat/Chat';
import { AnalyticsScreen, PartnerDashboardScreen, SubscriptionScreen } from './Dashboard';
import { ArtistBookingDetailScreen, ScheduleScreen } from './Schedule';
import { AvailabilityScreen } from './Availability';
import { BankAccountScreen, PayoutHistoryScreen, WalletScreen } from './Earnings';
import { EditArtistProfileScreen, MyReelsScreen, MyReviewsScreen, PartnerAccountScreen, ReelUploadScreen, ReviewReplyScreen } from './PartnerAccount';
import { ApplicationStatusScreen, OnboardingPortfolioScreen, OnboardingProfileScreen, OnboardingServicesScreen, OnboardingStudioScreen } from './Onboarding';

// Everything under /partner. An approved artist (role ARTIST) gets the
// partner tabs, like the app's ArtistTabs; anyone else sees their artist
// application (status, then the onboarding steps).

const page = (title: string, el: ReactNode) => <Page title={title}>{el}</Page>;

function Tabs() {
  const newBookings = useNewArtistBookings().data?.length ?? 0;
  const unread = useUnreadNotifications();
  return <PartnerTabsLayout newBookings={newBookings} unread={unread} />;
}

function SubscriptionPay() {
  const [params] = useSearchParams();
  const tier = params.get('tier') ?? '';
  return <PaymentStub title="Subscription" amount={Number(params.get('amount')) || undefined} what={`JUVI ${tier.charAt(0).toUpperCase()}${tier.slice(1)} · monthly`} />;
}

export default function PartnerRoutes() {
  const isArtist = useAuthStore((s) => s.user?.role === 'ARTIST');

  if (!isArtist) {
    return (
      <Routes>
        <Route index element={page('Become an artist', <ApplicationStatusScreen />)} />
        <Route path="apply/profile" element={page('Partner application', <OnboardingProfileScreen />)} />
        <Route path="apply/services" element={page('Partner application', <OnboardingServicesScreen />)} />
        <Route path="apply/portfolio" element={page('Partner application', <OnboardingPortfolioScreen />)} />
        <Route path="apply/studio" element={page('Partner application', <OnboardingStudioScreen />)} />
        <Route path="*" element={<Navigate to="/partner" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Tabs />}>
        <Route index element={page('Partner home', <PartnerDashboardScreen />)} />
        <Route path="schedule" element={page('Schedule', <ScheduleScreen />)} />
        <Route path="reels" element={page('Reels', <ReelsFeedScreen />)} />
        <Route path="chat" element={page('Inbox', <ChatListScreen perspective="artist" />)} />
        <Route path="earnings" element={page('Earnings', <WalletScreen />)} />
        <Route path="account" element={page('Account', <PartnerAccountScreen />)} />
      </Route>
      <Route path="bookings/:id" element={page('Booking', <ArtistBookingDetailScreen />)} />
      <Route path="chat/:bookingId" element={page('Messages', <ChatRoomScreen />)} />
      <Route path="availability" element={page('Availability', <AvailabilityScreen />)} />
      <Route path="analytics" element={page('Analytics', <AnalyticsScreen />)} />
      <Route path="subscription" element={page('Subscription', <SubscriptionScreen />)} />
      <Route path="subscription/pay" element={page('Payment', <SubscriptionPay />)} />
      <Route path="earnings/bank" element={page('Payout details', <BankAccountScreen />)} />
      <Route path="earnings/payouts" element={page('Payout history', <PayoutHistoryScreen />)} />
      <Route path="profile/edit" element={page('Edit profile', <EditArtistProfileScreen />)} />
      <Route path="my-reels" element={page('My reels', <MyReelsScreen />)} />
      <Route path="reels/new" element={page('New reel', <ReelUploadScreen />)} />
      <Route path="reviews" element={page('Reviews', <MyReviewsScreen />)} />
      <Route path="reviews/:reviewId/reply" element={page('Reply to review', <ReviewReplyScreen />)} />
      <Route path="preview/:artistId" element={page('Your public profile', <ArtistDetailScreen />)} />
      <Route path="apply/services" element={page('Service catalog', <OnboardingServicesScreen />)} />
      <Route path="apply/portfolio" element={page('Portfolio', <OnboardingPortfolioScreen />)} />
      <Route path="apply/studio" element={page('Studio & location', <OnboardingStudioScreen />)} />
      <Route path="*" element={<Navigate to="/partner" replace />} />
    </Routes>
  );
}
