import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Icon, Img, Pressable, PressableScale, Text, View } from '@/components/ui';
import { Card, QueryState, Screen, SectionLabel, kit } from '@/components/ui/kit';
import { LearnBannerSection } from '@/components/home/LearnBannerSection';
import { HomeTrendDecodeSection } from '@/components/home/TrendDecode';
import { bookingsApi, subscriptionApi } from '@/api';
import { useArtistDashboard, useHomeLayout, useMyArtistProfile, useNewArtistBookings, useTrendDecodeFeed } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { SUBSCRIPTION_TIERS } from '@/config/constants';
import { formatCompactNumber, formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { istDayjs } from '@/utils/ist';
import type { HomeLearnData, HomeLayoutSection, TrendDecodeItem } from '@/types';

// Ports of the app's ArtistDashboardScreen (partner Home), AnalyticsScreen and
// SubscriptionScreen. Paying for a plan stops at the payment placeholder.

const LEARNING_FALLBACK: HomeLayoutSection[] = [
  { slug: 'learn_banner', order: 4, data: null },
  { slug: 'trend_decode', order: 9, data: null },
] as HomeLayoutSection[];

function NewBookings() {
  const navigate = useNavigate();
  const { data } = useNewArtistBookings();
  if (!data || data.length === 0) return null;
  const shown = data.slice(0, 3);
  return (
    <View style={{ gap: 10, marginBottom: 18 }}>
      {shown.map((b) => (
        <PressableScale key={b.id} scaleTo={0.98} onPress={() => navigate(`/partner/bookings/${b.id}`)} style={styles.newCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="notifications" size={16} color="#E4407A" />
            <Text style={styles.newTag}>NEW BOOKING</Text>
          </View>
          <Text style={styles.newName}>{b.customerName}</Text>
          <Text style={styles.newLine}>{b.services.join(', ')}</Text>
          <Text style={styles.newLine}>
            {istDayjs(b.startTime).format('ddd, D MMM · h:mm A')} · {b.locationType === 'HOME' ? 'Home visit' : 'At studio'}
          </Text>
          <Text style={styles.newPaid}>{formatPrice(b.advanceAmount)} advance paid · Confirmed</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ ...styles.newPaid, color: '#E4407A' }}>View booking</Text>
            <Icon name="arrow-forward" size={14} color="#E4407A" />
          </View>
        </PressableScale>
      ))}
      {data.length > shown.length && (
        <Pressable onPress={() => navigate('/partner/schedule')}>
          <Text style={styles.link}>+{data.length - shown.length} more new bookings in Schedule</Text>
        </Pressable>
      )}
    </View>
  );
}

export function PartnerDashboardScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: dash, isLoading } = useArtistDashboard();
  const { data: me } = useMyArtistProfile();
  const { data: pricing } = useQuery({ queryKey: ['booking-pricing'], queryFn: () => bookingsApi.pricing().then((r) => r.data.pricing) });
  const { data: layout } = useHomeLayout();
  const { data: tdData } = useTrendDecodeFeed();
  const trendItems = (tdData?.pages.flatMap((p) => p.items) ?? []).slice(0, 8);
  const learning = ((layout as HomeLayoutSection[] | undefined)?.length ? (layout as HomeLayoutSection[]) : LEARNING_FALLBACK).filter((s) => s.slug === 'learn_banner' || s.slug === 'trend_decode');
  const base = pricing?.commissionRate;
  const eliteTier = pricing?.tierCommissionRates?.ELITE;
  const eliteRate = base !== undefined && eliteTier !== undefined ? Math.min(eliteTier, base) : undefined;
  const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;
  const commissionLabel = base !== undefined && eliteRate !== undefined && eliteRate < base ? `Reduced Service Commission (${pct(eliteRate)} vs ${pct(base)})` : 'Reduced Service Commission';
  const reels = dash?.recentReels ?? [];
  const stats = dash?.stats;

  return (
    <View style={kit.safe}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <img src="/assets/images/logo.png" alt="JUVI" style={{ height: 26, width: 'auto' }} />
          <Text style={styles.partner}>Partner</Text>
        </View>
        <Pressable onPress={() => navigate('/partner/account')} ariaLabel="Account" style={styles.avatarSm}>
          {user?.profileImage ? <Img src={user.profileImage} alt="" style={styles.fill} /> : <Icon name="person" size={16} color="#827378" />}
        </Pressable>
      </View>
      <View style={{ ...kit.content, paddingBottom: 110 }}>
        <NewBookings />

        <View style={styles.profileRow}>
          <View style={styles.avatarLg}>{user?.profileImage ? <Img src={user.profileImage} alt="" style={styles.fill} /> : <Icon name="person" size={36} color="#c2a3a8" />}</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.name || 'Your name'}</Text>
              {me?.isVerified && <Icon name="verified" size={18} color="#884952" />}
            </View>
            <Text style={styles.sub}>{me?.title || 'Add a professional title from Edit Profile'}</Text>
            <Pressable onPress={() => navigate('/partner/profile/edit')} style={styles.editBtn}>
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {learning.map((s) => (
          <View key={s.slug} style={{ margin: '0 -20px' }}>
            {s.slug === 'learn_banner' ? (
              <LearnBannerSection data={s.data as HomeLearnData | null} onExplore={() => navigate('/courses')} onItemPress={() => navigate('/courses')} />
            ) : (
              <HomeTrendDecodeSection items={trendItems} onOpenItem={(item: TrendDecodeItem) => navigate(`/trend-decode/${item.id}`, { state: { item } })} onViewAll={() => navigate('/trend-decode')} />
            )}
          </View>
        ))}

        <View style={styles.elite}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="ribbon-outline" size={20} color="#e7bcc3" />
            <Text style={styles.eliteTitle}>JUVI ELITE</Text>
          </View>
          <Text style={styles.eliteText}>Unlock the full potential of your artistry. Join the top 1% of partners and dominate the luxury market.</Text>
          {['Priority in Client Search Results', commissionLabel, "Exclusive 'Elite Partner' Badge"].map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="checkmark-circle" size={16} color="#e7bcc3" />
              <Text style={styles.eliteBenefit}>{b}</Text>
            </View>
          ))}
          <Pressable onPress={() => navigate('/partner/subscription')} style={styles.eliteBtn}>
            <Text style={styles.eliteBtnText}>Upgrade to Elite</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <Text style={styles.section}>Growth & Revenue</Text>
          <Pressable onPress={() => navigate('/partner/analytics')}>
            <Text style={styles.link}>Insights</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statLabel}>MONTHLY REV</Text>
            <Text style={styles.stat}>{isLoading ? '-' : formatPrice(stats?.monthlyRevenue || 0)}</Text>
            {!isLoading && (
              <Text style={{ ...styles.trend, color: (stats?.revenueTrending ?? 0) < 0 ? '#B91C1C' : '#446464' }}>
                {(stats?.revenueTrending ?? 0) >= 0 ? '+' : ''}
                {stats?.revenueTrending || 0}% from last month
              </Text>
            )}
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statLabel}>BOOKINGS</Text>
            <Text style={styles.stat}>{isLoading ? '-' : stats?.bookingsCount || 0}</Text>
            {!isLoading && <Text style={{ ...styles.trend, color: '#884952' }}>{stats?.bookingsTrending === 'up' ? 'Trending Up' : stats?.bookingsTrending === 'down' ? 'Trending Down' : 'Steady'}</Text>}
          </Card>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <Text style={styles.section}>My Reels</Text>
          <Pressable onPress={() => navigate('/partner/my-reels')}>
            <Text style={styles.link}>Manage All</Text>
          </Pressable>
        </View>
        {reels.length === 0 ? (
          <Card style={{ marginTop: 12, alignItems: 'center', gap: 8 }}>
            <Icon name="film-outline" size={28} color="#d7c1c3" />
            <Text style={styles.sub}>No reels yet. Share your work to reach more clients.</Text>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
            {reels.slice(0, 6).map((r) => (
              <PressableScale key={r.id} onPress={() => navigate('/partner/my-reels')} style={styles.reelTile}>
                <Img src={r.thumbnailUrl} alt="" style={styles.fill} />
                <View style={styles.reelViews}>
                  <Icon name="eye-outline" size={11} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }}>{formatCompactNumber(r.viewCount ?? 0)}</Text>
                </View>
              </PressableScale>
            ))}
          </div>
        )}
      </View>
      <Pressable onPress={() => navigate('/partner/reels/new')} style={styles.fab} ariaLabel="Add reel">
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Reel</Text>
      </Pressable>
    </View>
  );
}

export function AnalyticsScreen() {
  const { data, isLoading, error, refetch } = useArtistDashboard();
  const likes = (data?.recentReels ?? []).reduce((n, r) => n + (r.likeCount ?? 0), 0);
  const trend = data?.stats.revenueTrending ?? 0;
  return (
    <Screen title="Analytics Detail">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load analytics" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} skeleton={2}>
        <SectionLabel>Performance Overview</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            ['Total Views', formatCompactNumber(data?.stats.totalViews ?? 0)],
            ['Total Likes', formatCompactNumber(likes)],
            ['Bookings', String(data?.stats.bookingsCount ?? 0)],
          ].map(([l, v]) => (
            <Card key={l} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.stat}>{v}</Text>
              <Text style={styles.statLabel}>{l.toUpperCase()}</Text>
            </Card>
          ))}
        </View>
        <SectionLabel>Financials</SectionLabel>
        <Card>
          <Text style={styles.statLabel}>THIS MONTH</Text>
          <Text style={{ ...styles.stat, fontSize: 30 }}>{formatPrice(data?.stats.monthlyRevenue || 0)}</Text>
          <Text style={{ ...styles.trend, color: trend < 0 ? '#B91C1C' : '#446464' }}>
            {trend >= 0 ? '+' : ''}
            {trend}% from last month
          </Text>
        </Card>
      </QueryState>
    </Screen>
  );
}

export function SubscriptionScreen() {
  const navigate = useNavigate();
  const { data: current, isLoading, error, refetch } = useQuery({ queryKey: ['subscription'], queryFn: () => subscriptionApi.current().then((r) => r.data), retry: false });
  const { data: plans } = useQuery({ queryKey: ['subscription-plans'], queryFn: () => subscriptionApi.plans().then((r) => r.data.plans), retry: false });
  const tiers = SUBSCRIPTION_TIERS.map((t) => {
    const live = plans?.find((p) => p.tier.toLowerCase() === t.tier);
    return live ? { ...t, price: live.price, portfolio: live.portfolioMax } : t;
  });
  const currentTier = (current?.tier ?? 'free').toLowerCase();
  return (
    <Screen title="Subscription">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load your plan" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} skeleton={3}>
        {tiers.map((t) => {
          const isCurrent = t.tier === currentTier;
          return (
            <Card key={t.tier} style={isCurrent ? { borderColor: '#884952', borderWidth: 2 } : undefined}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.name}>{t.tier.toUpperCase()}</Text>
                {isCurrent && <Text style={styles.currentTag}>CURRENT PLAN</Text>}
              </View>
              <Text style={styles.trend}>{t.price === 0 ? 'Free Tier' : `₹${t.price} / month`}</Text>
              <Text style={{ ...styles.sub, margin: '6px 0' }}>Up to {t.portfolio} portfolio photos</Text>
              {t.perks.map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <Icon name="checkmark-circle" size={16} color="#884952" />
                  <Text style={styles.body}>{p}</Text>
                </View>
              ))}
              {!isCurrent && t.price > 0 && (
                <Pressable onPress={() => navigate(`/partner/subscription/pay?tier=${t.tier}&amount=${t.price}`)} style={cx(styles.eliteBtn, { backgroundColor: '#884952', marginTop: 14 })}>
                  <Text style={{ ...styles.eliteBtnText, color: '#FFFFFF' }}>Upgrade to {t.tier.charAt(0).toUpperCase() + t.tier.slice(1)}</Text>
                </Pressable>
              )}
            </Card>
          );
        })}
        {current?.renewsAt && <Text style={styles.sub}>Renews on {istDayjs(current.renewsAt).format('D MMM YYYY')}.</Text>}
      </QueryState>
    </Screen>
  );
}

const styles = sheet({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' },
  partner: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 2, color: '#827378', textTransform: 'uppercase' },
  avatarSm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLg: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#884952' },
  fill: { width: '100%', height: '100%', objectFit: 'cover' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: '#857374', lineHeight: 19 },
  body: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344' },
  editBtn: { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: '#d7c1c3', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  editText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#1e1b18' },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  newCard: { backgroundColor: '#FFF0F5', borderRadius: 20, borderWidth: 1, borderColor: '#F8C8DA', padding: 18, gap: 4, width: '100%', textAlign: 'left' },
  newTag: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#E4407A' },
  newName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18' },
  newLine: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: '#524344' },
  newPaid: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: '#2E7D32' },
  elite: { backgroundColor: '#350B22', borderRadius: 24, padding: 22, gap: 10, marginTop: 18 },
  eliteTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2, color: '#e7bcc3' },
  eliteText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  eliteBenefit: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13.5, color: '#FFFFFF' },
  eliteBtn: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 6, width: '100%' },
  eliteBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#350B22' },
  section: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18' },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, letterSpacing: 1.2, color: '#857374' },
  stat: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18', margin: '4px 0' },
  trend: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#446464' },
  currentTag: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, color: '#884952' },
  reelTile: { position: 'relative', aspectRatio: 9 / 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#efe6e2' },
  reelViews: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  fab: {
    position: 'fixed', right: 'max(20px, calc(50% - 220px))', bottom: 96, zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#884952', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18,
    shadowColor: '#884952', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 13.5, color: '#FFFFFF' },
});
