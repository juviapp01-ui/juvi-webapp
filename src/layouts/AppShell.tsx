import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { Icon, type IconName } from '@/components/ui';

// The website is the app in a column: full width on a phone, a centred
// app-width column (with the page around it a shade darker) on a desktop.
export const COLUMN_MAX_WIDTH = 480;

export function AppColumn({ children }: { children: ReactNode }) {
  return <div style={shell.column}>{children}</div>;
}

// ─── Customer tabs ──────────────────────────────────────────────────────────
// Port of frontend/src/navigation/CustomerTabs.tsx: the floating, frosted
// pill tab bar with Home in the middle.
const TABS: { to: string; label: string; active: IconName; inactive: IconName; home?: boolean }[] = [
  { to: '/explore', label: 'Explore artists', active: 'search', inactive: 'search-outline' },
  { to: '/reels', label: 'Reels', active: 'film', inactive: 'film-outline' },
  { to: '/home', label: 'Home', active: 'home', inactive: 'home-outline', home: true },
  { to: '/chat', label: 'Messages', active: 'chatbubble', inactive: 'chatbubble-outline' },
  { to: '/profile', label: 'You', active: 'person', inactive: 'person-outline' },
];

export const TAB_BAR_SPACE = 120;

export function CustomerTabsLayout() {
  return (
    <>
      <Outlet />
      <nav style={tabs.tabBar} aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} aria-label={t.label} title={t.label} style={tabs.tabLink}>
            {({ isActive }) =>
              t.home ? (
                <span style={cx(tabs.homeIconContainer, isActive && tabs.homeIconActive)}>
                  <Icon name={isActive ? t.active : t.inactive} size={26} color={isActive ? '#FFFFFF' : '#857374'} />
                </span>
              ) : (
                <span style={tabs.iconContainer}>
                  <Icon name={isActive ? t.active : t.inactive} size={24} color={isActive ? '#884952' : '#857374'} />
                  {isActive && <span style={tabs.activeIndicator} />}
                </span>
              )
            }
          </NavLink>
        ))}
      </nav>
    </>
  );
}

// ─── Partner (artist) tabs ──────────────────────────────────────────────────
// Port of frontend/src/navigation/ArtistTabs.tsx: six labelled tabs, a badge
// on Schedule for new bookings and a dot on Inbox for unread notifications.
const PARTNER_TABS: { to: string; label: string; active: IconName; inactive: IconName; end?: boolean }[] = [
  { to: '/partner', label: 'Home', active: 'home', inactive: 'home-outline', end: true },
  { to: '/partner/schedule', label: 'Schedule', active: 'calendar', inactive: 'calendar-outline' },
  { to: '/partner/reels', label: 'Reels', active: 'film', inactive: 'film-outline' },
  { to: '/partner/chat', label: 'Inbox', active: 'chatbubble', inactive: 'chatbubble-outline' },
  { to: '/partner/earnings', label: 'Earnings', active: 'card', inactive: 'card-outline' },
  { to: '/partner/account', label: 'Account', active: 'person', inactive: 'person-outline' },
];

export function PartnerTabsLayout({ newBookings = 0, unread = 0 }: { newBookings?: number; unread?: number }) {
  return (
    <>
      <Outlet />
      <nav style={tabs.partnerBar} aria-label="Partner">
        {PARTNER_TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} style={tabs.partnerLink} aria-label={t.label}>
            {({ isActive }) => (
              <>
                <span style={{ position: 'relative', display: 'flex' }}>
                  <Icon name={isActive ? t.active : t.inactive} size={22} color={isActive ? '#1e1b18' : '#827378'} />
                  {t.label === 'Schedule' && newBookings > 0 && <span style={tabs.newBadge}>{newBookings}</span>}
                  {t.label === 'Inbox' && unread > 0 && <span style={tabs.dot} />}
                </span>
                <span style={cx(tabs.partnerLabel, { color: isActive ? '#1e1b18' : '#827378' })}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

const shell = sheet({
  column: {
    position: 'relative', width: '100%', maxWidth: COLUMN_MAX_WIDTH, minHeight: '100vh', margin: '0 auto',
    backgroundColor: '#fff8f5', display: 'flex', flexDirection: 'column',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.08, shadowRadius: 40,
  },
});

const tabs = sheet({
  tabBar: {
    position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: `min(${COLUMN_MAX_WIDTH - 40}px, calc(100% - 40px))`,
    zIndex: 40, height: 64, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 248, 245, 0.85)', backdropFilter: 'blur(14px)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20,
  },
  tabLink: { flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  homeIconContainer: { height: 44, width: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  homeIconActive: { backgroundColor: '#884952' },
  partnerBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: COLUMN_MAX_WIDTH, zIndex: 40,
    display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 8, paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    backgroundColor: 'rgba(251,249,245,0.92)', backdropFilter: 'blur(14px)', borderTopWidth: 1, borderTopColor: 'rgba(212,194,199,0.3)',
  },
  partnerLink: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' },
  partnerLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  newBadge: {
    position: 'absolute', top: -8, right: -16, backgroundColor: '#E4407A', color: '#fff', borderRadius: 999, padding: '1px 5px',
    fontFamily: 'Inter_600SemiBold', fontSize: 10, borderWidth: 1.5, borderColor: '#fff', borderStyle: 'solid',
  },
  dot: { position: 'absolute', top: -2, right: -4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#AE728D' },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#884952', marginTop: 4 },
});
