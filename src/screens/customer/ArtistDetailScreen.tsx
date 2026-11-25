import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { sheet, cx } from '@/lib/rn';
import { Badge, BackHeader, Button, EmptyState, HScroll, Icon, Img, PressableScale, SkeletonLoader, StarRating, Text, View } from '@/components/ui';
import { PortfolioGrid } from '@/components/discovery';
import { HOME_CATEGORY_CARDS, LOGO } from '@/config/constants';
import { useArtist, useDeviceLocation, useFollowArtist, useHomeLayout } from '@/hooks';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import type { HomeCategoriesData, Service } from '@/types';

// Port of frontend/src/screens/customer/ArtistDetailScreen.tsx (the customer
// view; the artist's own "preview" mode comes with the artist portal).

// Paused bookings — same rule as the app's isArtistPaused.
const isArtistPaused = (a?: { isAvailable?: boolean; pausedUntil?: string | null } | null) =>
  !!a && a.isAvailable === false && (!a.pausedUntil || dayjs(a.pausedUntil).isAfter(dayjs()));

export default function ArtistDetailScreen() {
  const navigate = useNavigate();
  const { artistId = '' } = useParams();
  const [params] = useSearchParams();
  const browsedCategory = params.get('category') ?? undefined;

  const { coords } = useDeviceLocation();
  const { data: artist, isLoading, error, refetch } = useArtist(artistId, coords ? { lat: coords.lat, lng: coords.lng } : undefined);
  const favorites = useFavoritesStore((s) => s.ids);
  const followArtist = useFollowArtist();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const toggleService = (id: string) => setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isFav = artist ? favorites.includes(artist.id) : false;

  // The profile photo is the hero image above; don't repeat it in the grid.
  const portfolioItems = useMemo(() => (artist?.portfolio ?? []).filter((p) => p.imageUrl !== artist?.photoUrl), [artist]);

  // Portfolio tabs: only categories the artist both offers and has photos for.
  const portfolioTabs = useMemo(() => {
    const tagged = new Set(portfolioItems.map((p) => p.category?.toLowerCase()).filter(Boolean));
    const seen = new Map<string, string>();
    for (const s of artist?.services ?? []) {
      const c = s.category?.trim();
      if (c && tagged.has(c.toLowerCase()) && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    }
    return [...seen.values()];
  }, [portfolioItems, artist]);
  const showPortfolioTabs = portfolioTabs.length > 1;
  const [pickedTab, setPickedTab] = useState<string | null | undefined>(undefined);
  const browsedTab = browsedCategory ? portfolioTabs.find((t) => t.toLowerCase().includes(browsedCategory.toLowerCase())) ?? null : null;
  const portfolioTab = showPortfolioTabs ? (pickedTab !== undefined ? pickedTab : browsedTab) : null;

  const { data: homeLayout } = useHomeLayout();
  const categoryImages = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of HOME_CATEGORY_CARDS) map.set(c.title.toLowerCase(), c.image);
    const tiles = (homeLayout?.find((s) => s.slug === 'categories')?.data as HomeCategoriesData | null)?.tiles ?? [];
    for (const t of tiles) if (t.imageUrl) map.set(t.title.trim().toLowerCase(), t.imageUrl);
    return map;
  }, [homeLayout]);

  // Services grouped by category, each with the artist's own photo for it
  // when they have one, else the category art.
  const serviceCategories = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; services: Service[]; image: string | null }>();
    for (const s of artist?.services ?? []) {
      const label = s.category?.trim() || 'Other';
      const key = label.toLowerCase();
      if (!groups.has(key)) {
        const ownPhoto = portfolioItems.find((p) => p.category?.trim().toLowerCase() === key)?.imageUrl;
        groups.set(key, { key, label, services: [], image: ownPhoto ?? categoryImages.get(key) ?? null });
      }
      groups.get(key)!.services.push(s);
    }
    return [...groups.values()];
  }, [artist, portfolioItems, categoryImages]);

  const [pickedServiceCat, setPickedServiceCat] = useState<string | null>(null);
  const browsedServiceCat = browsedCategory ? serviceCategories.find((c) => c.key.includes(browsedCategory.toLowerCase()))?.key : undefined;
  const activeServiceCat =
    serviceCategories.find((c) => c.key === pickedServiceCat) ?? serviceCategories.find((c) => c.key === browsedServiceCat) ?? serviceCategories[0];
  const showServiceCircles = serviceCategories.length > 1;
  const visibleServices = showServiceCircles ? activeServiceCat?.services ?? [] : artist?.services ?? [];
  const visiblePortfolio = portfolioTab ? portfolioItems.filter((p) => p.category?.toLowerCase() === portfolioTab.toLowerCase()) : portfolioItems;

  if (error) {
    return (
      <View style={styles.safe}>
        <BackHeader onBack={() => navigate(-1)} />
        <EmptyState title="Could not load this artist" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => refetch()} />
      </View>
    );
  }

  if (isLoading || !artist) {
    return (
      <View style={styles.safe}>
        <BackHeader onBack={() => navigate(-1)} />
        <View style={{ paddingLeft: 24, paddingRight: 24 }}>
          <SkeletonLoader height={240} style={{ margin: '16px 0', borderRadius: 12 }} />
          <SkeletonLoader height={24} width="70%" style={{ marginBottom: 12 }} />
          <SkeletonLoader height={16} width="40%" style={{ marginBottom: 24 }} />
          <SkeletonLoader height={80} style={{ marginBottom: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title={artist.name} onBack={() => navigate(-1)} />

      <View style={styles.scrollContent}>
        <Img src={artist.photoUrl || LOGO} fit={artist.photoUrl ? 'cover' : 'contain'} lazy={false} style={{ width: '100%', height: 300, backgroundColor: '#efe6e2' }} />

        <View style={styles.overlappingCard}>
          <View className="fade-up" style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.nameText}>{artist.name}</Text>
              <View style={styles.ratingRow}>
                <StarRating value={artist.rating} />
                <Text style={styles.ratingLinkText}>({artist.reviewCount} Reviews)</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {/* Elite (subscription) and Verified (KYC) are separate facts. */}
              {artist.subscriptionTier === 'elite' && artist.isVerified ? (
                <Badge label="Verified Elite" variant="elite" />
              ) : artist.subscriptionTier === 'elite' ? (
                <Badge label="Elite" variant="elite" />
              ) : artist.isVerified ? (
                <Badge label="Verified" variant="success" />
              ) : null}
              <PressableScale onPress={() => followArtist.mutate({ id: artist.id, follow: !isFav })} style={styles.followBtn} ariaLabel={isFav ? 'Unfollow' : 'Follow'}>
                <Icon name={isFav ? 'heart' : 'heart-outline'} size={22} color="#884952" />
              </PressableScale>
            </View>
          </View>

          {isArtistPaused(artist) && (
            <View style={styles.reachWarning}>
              <Icon name="pause-circle-outline" size={16} color="#92400E" />
              <Text style={styles.reachWarningText}>
                Not taking new bookings right now
                {artist.pausedUntil ? ` — back on ${dayjs(artist.pausedUntil).format('ddd, D MMM')}.` : '.'}
              </Text>
            </View>
          )}

          {artist.inReach === false && (
            <View style={styles.reachWarning}>
              <Icon name="location-outline" size={16} color="#92400E" />
              <Text style={styles.reachWarningText}>
                This artist may not travel to your area for a home booking
                {typeof artist.maxTravelDistance === 'number' ? ` (travels up to ${artist.maxTravelDistance}km)` : ''} — studio booking is still available.
              </Text>
            </View>
          )}

          <View className="fade-up">
            <Text style={styles.sectionHeader}>The Artist</Text>
            <Text style={styles.bioText}>{artist.bio}</Text>
          </View>

          <View className="fade-up">
            <Text style={styles.sectionHeader}>Portfolio Showcase</Text>
            {showPortfolioTabs && (
              <HScroll contentStyle={styles.portfolioTabs}>
                {[null, ...portfolioTabs].map((tab) => {
                  const active = portfolioTab === tab;
                  return (
                    <PressableScale key={tab ?? '__all'} onPress={() => setPickedTab(tab)} style={cx(styles.portfolioTab, active && styles.portfolioTabActive)}>
                      <Text style={cx(styles.portfolioTabText, active && styles.portfolioTabTextActive)}>{tab ?? 'All'}</Text>
                    </PressableScale>
                  );
                })}
              </HScroll>
            )}
            <PortfolioGrid items={visiblePortfolio} />
          </View>

          <Text style={styles.sectionHeader}>
            Services{(artist.services ?? []).length ? ` · ${(artist.services ?? []).length}` : ''}
          </Text>

          {showServiceCircles && (
            <HScroll contentStyle={styles.catCircles}>
              {serviceCategories.map((c) => {
                const active = c.key === activeServiceCat?.key;
                const picked = c.services.filter((s) => serviceIds.includes(s.id)).length;
                return (
                  <PressableScale key={c.key} onPress={() => setPickedServiceCat(c.key)} style={styles.catItem} scaleTo={0.95}>
                    <View style={cx(styles.catRing, active && styles.catRingActive)}>
                      {c.image ? (
                        <Img src={c.image} style={styles.catImage} />
                      ) : (
                        <View style={cx(styles.catImage, styles.catImageEmpty)}>
                          <Text style={styles.catInitial}>{c.label.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      {picked > 0 && (
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{picked}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={cx(styles.catLabel, active && styles.catLabelActive)} numberOfLines={2}>{c.label}</Text>
                    <Text style={styles.catCount}>
                      {c.services.length} {c.services.length === 1 ? 'service' : 'services'}
                    </Text>
                  </PressableScale>
                );
              })}
            </HScroll>
          )}

          {showServiceCircles && activeServiceCat && <Text style={styles.catHeading}>{activeServiceCat.label}</Text>}

          {visibleServices.map((s, index) => {
            const isSelected = serviceIds.includes(s.id);
            return (
              <div key={s.id} className="fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                <View
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleService(s.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleService(s.id))}
                  aria-pressed={isSelected}
                  style={cx(styles.serviceCard, isSelected && { borderColor: '#884952', backgroundColor: '#fbf2ed' })}
                >
                  <View style={{ marginRight: 12 }}>
                    <Icon name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isSelected ? '#884952' : '#d7c1c3'} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle}>{s.title}</Text>
                    <Text style={styles.serviceDuration}>{s.durationMin} mins</Text>
                  </View>
                  <View style={styles.servicePriceCol}>
                    <Text style={styles.servicePrice}>{formatPrice(s.price)}</Text>
                    <PressableScale
                      onPress={(e) => {
                        e.stopPropagation();
                        navigate(`/artist/${artist.id}/service/${s.id}`);
                      }}
                      style={{ padding: 4, marginTop: 2 }}
                    >
                      <Text style={{ ...styles.serviceBookLabel, color: '#827378' }}>Details</Text>
                    </PressableScale>
                  </View>
                </View>
              </div>
            );
          })}
        </View>
      </View>

      <View style={styles.stickyFooter}>
        <Button
          title={serviceIds.length > 0 ? `Book ${serviceIds.length} Service${serviceIds.length > 1 ? 's' : ''}` : 'Select a Service'}
          disabled={serviceIds.length === 0}
          onPress={() => navigate('/book', { state: { artistId, serviceIds } })}
        />
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  reachWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16 },
  reachWarningText: { flex: 1, flexShrink: 1, fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: '#92400E', lineHeight: 17 },
  scrollContent: { paddingBottom: 140 },
  overlappingCard: { marginTop: -48, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, backgroundColor: '#fff8f5' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, flexShrink: 1, paddingRight: 12 },
  headerRight: { alignItems: 'flex-end', gap: 12 },
  followBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf2ed' },
  nameText: { fontSize: 28, fontFamily: 'BodoniModa_700Bold', color: '#1e1b18' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  ratingLinkText: { fontSize: 12, color: '#884952', fontFamily: 'HankenGrotesk_600SemiBold', letterSpacing: 0.5, marginLeft: 10 },
  portfolioTabs: { gap: 8, paddingBottom: 12 },
  portfolioTab: { borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  portfolioTabActive: { borderColor: '#884952', backgroundColor: '#884952' },
  portfolioTabText: { fontSize: 12, color: '#524344', fontFamily: 'HankenGrotesk_600SemiBold', whiteSpace: 'nowrap' },
  portfolioTabTextActive: { color: '#FFFFFF' },
  sectionHeader: { fontSize: 11, color: '#857374', fontFamily: 'HankenGrotesk_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 32, marginBottom: 10 },
  bioText: { fontSize: 14, color: '#524344', lineHeight: 22, fontFamily: 'HankenGrotesk_400Regular' },
  catCircles: { gap: 14, paddingTop: 4, paddingBottom: 6, paddingRight: 8 },
  catItem: { width: 78, alignItems: 'center' },
  catRing: { width: 72, height: 72, borderRadius: 36, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  catRingActive: { borderColor: '#884952' },
  catImage: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#f6eeeb' },
  catImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  catInitial: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, color: '#884952' },
  catBadge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#884952', borderWidth: 2, borderColor: '#fff8f5', alignItems: 'center', justifyContent: 'center' },
  catBadgeText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: '#FFFFFF' },
  catLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: '#524344', textAlign: 'center', marginTop: 6, lineHeight: 15 },
  catLabelActive: { fontFamily: 'HankenGrotesk_600SemiBold', color: '#884952' },
  catCount: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 10, color: '#A8A29E', marginTop: 2 },
  catHeading: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18', marginTop: 14, marginBottom: 10 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#efe6e2', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5,
  },
  serviceInfo: { flex: 1, flexShrink: 1, paddingRight: 12 },
  serviceTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#1e1b18' },
  serviceDuration: { fontSize: 12, color: '#857374', marginTop: 4, fontFamily: 'HankenGrotesk_400Regular' },
  servicePriceCol: { alignItems: 'flex-end', gap: 4 },
  servicePrice: { color: '#884952', fontFamily: 'HankenGrotesk_700Bold', fontSize: 16 },
  serviceBookLabel: { fontSize: 10, color: '#884952', fontFamily: 'HankenGrotesk_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  stickyFooter: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 30,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#efe6e2', backgroundColor: '#ffffff',
  },
});
