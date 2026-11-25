import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { missingEnv } from '@/config/env';
import { RECAPTCHA_CONTAINER_ID } from '@/lib/firebase';
import { profileApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { Spinner, Toast, View } from '@/components/ui';
import { ErrorBoundary, Page } from '@/components/ui/Page';
import { AppColumn, CustomerTabsLayout } from '@/layouts/AppShell';
import MissingEnvScreen from '@/screens/stubs/MissingEnvScreen';
import ComingSoonScreen from '@/screens/stubs/ComingSoonScreen';
import NotFoundScreen from '@/screens/stubs/NotFoundScreen';
import PhoneLoginScreen from '@/screens/auth/PhoneLoginScreen';
import PhoneOtpVerifyScreen from '@/screens/auth/PhoneOtpVerifyScreen';
import ProfileSetupScreen from '@/screens/auth/ProfileSetupScreen';
import HomeScreen from '@/screens/customer/HomeScreen';
import ViewAllServicesScreen from '@/screens/customer/ViewAllServicesScreen';
import ArtistsInCityScreen from '@/screens/customer/ArtistsInCityScreen';
import ArtistDetailScreen from '@/screens/customer/ArtistDetailScreen';
import ServiceDetailScreen from '@/screens/customer/ServiceDetailScreen';
import ExploreScreen from '@/screens/customer/ExploreScreen';
import ReelsFeedScreen from '@/screens/customer/ReelsFeedScreen';
import SearchResultsScreen from '@/screens/customer/SearchResultsScreen';
import { TrendDecodeListScreen, TrendDecodeViewerScreen } from '@/screens/customer/TrendDecodeScreens';
import { CourseDetailScreen, CourseListScreen, CoursePaymentScreen, CoursesHomeScreen } from '@/screens/customer/CoursesScreens';
import LessonPlayerScreen from '@/screens/customer/LessonPlayerScreen';

// ─── Who may see what ────────────────────────────────────────────────────────
// Mirrors the app's RootNavigator: signed out → sign-in; signed in without a
// name → profile setup; an approved artist (role ARTIST) → the partner area;
// everyone else → the customer pages.

const homeFor = (role?: string) => (role === 'ARTIST' ? '/partner' : '/home');

function useSession() {
  const { isAuthenticated, user } = useAuthStore();
  return { isAuthenticated, user, named: !!user?.name };
}

// Sign-in pages: only while signed out (or mid-sign-up).
function SignedOutOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, named } = useSession();
  if (isAuthenticated && named) return <Navigate to={homeFor(user?.role)} replace />;
  if (isAuthenticated && !named) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

// Profile setup: signed in, but no name yet.
function NeedsProfile({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, named } = useSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (named) return <Navigate to={homeFor(user?.role)} replace />;
  return <>{children}</>;
}

// Customer pages.
function CustomerOnly({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, user, named } = useSession();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!named) return <Navigate to="/setup" replace />;
  if (user?.role === 'ARTIST') return <Navigate to="/partner" replace />;
  return <>{children}</>;
}

// Partner area: approved artists, and customers who applied to become one
// (they see their application there, as the app's ApplicationStatus).
function PartnerArea({ children }: { children: ReactNode }) {
  const { isAuthenticated, named } = useSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!named) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

// Signed in from an earlier visit: refresh the profile once, so a role change
// (approved as an artist) or an edit made in the app shows up. Blocks only
// when there's no stored profile at all.
function SessionBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [ready, setReady] = useState(!isAuthenticated || !!user);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    profileApi
      .get()
      .then(({ data }) => {
        if (alive && data?.user) setUser(data.user);
      })
      .catch(() => {
        // Offline or a server error: keep what's stored. A dead session is
        // handled by the API client (refresh, then sign out on 401).
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
    // Once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const missing = missingEnv();
  if (missing.length > 0) {
    return (
      <AppColumn>
        <Page title="Setup needed">
          <MissingEnvScreen missing={missing} />
        </Page>
      </AppColumn>
    );
  }

  const soon = (title: string, inTabs = false) => (
    <Page title={title}>
      <ComingSoonScreen title={title} inTabs={inTabs} />
    </Page>
  );
  const customer = (title: string, element: ReactNode) => (
    <CustomerOnly>
      <Page title={title}>{element}</Page>
    </CustomerOnly>
  );

  return (
    <AppColumn>
      <ErrorBoundary>
        <SessionBootstrap>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            {/* Sign in */}
            <Route path="/login" element={<SignedOutOnly><Page title="Sign in"><PhoneLoginScreen /></Page></SignedOutOnly>} />
            <Route path="/verify" element={<SignedOutOnly><Page title="Verify"><PhoneOtpVerifyScreen /></Page></SignedOutOnly>} />
            <Route path="/setup" element={<NeedsProfile><Page title="Complete your profile"><ProfileSetupScreen /></Page></NeedsProfile>} />

            {/* Customer tabs */}
            <Route element={<CustomerOnly><CustomerTabsLayout /></CustomerOnly>}>
              <Route path="/home" element={<Page title="Home"><HomeScreen /></Page>} />
              <Route path="/explore" element={<Page title="Explore artists"><ExploreScreen /></Page>} />
              <Route path="/reels" element={<Page title="Reels"><ReelsFeedScreen /></Page>} />
              <Route path="/chat" element={soon('Messages', true)} />
              <Route path="/profile" element={soon('Your profile', true)} />
            </Route>

            {/* Customer pages */}
            <Route path="/artists" element={customer('All services', <ViewAllServicesScreen />)} />
            <Route path="/city" element={customer('Artists in your city', <ArtistsInCityScreen />)} />
            <Route path="/artist/:artistId" element={customer('Artist', <ArtistDetailScreen />)} />
            <Route path="/artist/:artistId/service/:serviceId" element={customer('Service', <ServiceDetailScreen />)} />
            <Route path="/search" element={customer('Search', <SearchResultsScreen />)} />
            <Route path="/trend-decode" element={customer('Trend Decode', <TrendDecodeListScreen />)} />
            <Route path="/trend-decode/:id" element={customer('Trend Decode', <TrendDecodeViewerScreen />)} />
            <Route path="/courses" element={customer('Learn with Annalia', <CoursesHomeScreen />)} />
            <Route path="/courses/category/:categoryId" element={customer('Courses', <CourseListScreen />)} />
            <Route path="/courses/:courseId" element={customer('Course', <CourseDetailScreen />)} />
            <Route path="/courses/:courseId/pay" element={customer('Checkout', <CoursePaymentScreen />)} />
            <Route path="/courses/:courseId/lesson/:lessonId" element={customer('Lesson', <LessonPlayerScreen />)} />
            <Route path="/book" element={<CustomerOnly>{soon('Booking')}</CustomerOnly>} />

            {/* Partner area */}
            <Route path="/partner/*" element={<PartnerArea>{soon('Partner')}</PartnerArea>} />

            <Route path="*" element={<Page title="Page not found"><NotFoundScreen /></Page>} />
          </Routes>
        </SessionBootstrap>
      </ErrorBoundary>
      <Toast />
      {/* Firebase's invisible reCAPTCHA — one container for the whole site, so
          it survives moving from the phone page to the code page (resend). */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </AppColumn>
  );
}

function RootRedirect() {
  const { isAuthenticated, user, named } = useSession();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!named) return <Navigate to="/setup" replace />;
  return <Navigate to={homeFor(user?.role)} replace />;
}
