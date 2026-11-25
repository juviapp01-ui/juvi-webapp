import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet, absoluteFill } from '@/lib/rn';
import {
  CitySearchInput, EmptyState, HScroll, Icon, Img, Pressable, PressableScale, SkeletonLoader, Spinner, Text, View,
} from '@/components/ui';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { HeroCard } from '@/components/home/HeroCard';
import { HomeFooter } from '@/components/home/HomeFooter';
import { LearnBannerSection } from '@/components/home/LearnBannerSection';
import { PromoBannerCard } from '@/components/home/PromoBannerCard';
import { HomeTrendDecodeSection } from '@/components/home/TrendDecode';
import { TAB_BAR_SPACE } from '@/layouts/AppShell';
import { useDebounce, useDeviceLocation, useDiscovery, useFollowArtist, useHomeLayout, useReelsFeed, useTrendDecodeFeed } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { artistsApi } from '@/api';
import { formatCompactNumber, formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { getSizedImageUri } from '@/utils/image';
import type {
  Artist, HomeCategoriesData, HomeFooterData, HomeHeroData, HomeLayoutSection, HomeLearnData, HomePromoData, HomeSectionSlug, Reel, TrendDecodeItem,
} from '@/types';

// Port of frontend/src/screens/customer/HomeScreen.tsx. Every block comes
// from GET /home-layout, in the admin's order, inactive ones already left
// out; FALLBACK_LAYOUT is the app's own default for before/without it.
const FALLBACK_LAYOUT: HomeLayoutSection[] = [
  { slug: 'hero', order: 1, data: null },
  { slug: 'search', order: 2, data: null },
  { slug: 'categories', order: 3, data: null },
  { slug: 'learn_banner', order: 4, data: null },
  { slug: 'continue_learning', order: 5, data: null },
  { slug: 'most_booked', order: 6, data: null },
  { slug: 'top_artists', order: 7, data: null },
  { slug: 'featured_reels', order: 8, data: null },
  { slug: 'trend_decode', order: 9, data: null },
  { slug: 'footer', order: 11, data: null },
];

// ─── Search ──────────────────────────────────────────────────────────────────
const HomeSearchSection = React.memo(function HomeSearchSection({ onOpenArtist, onSeeAll }: { onOpenArtist: (id: string) => void; onSeeAll: (q: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const debounced = useDebounce(searchQuery.trim(), 350);
  const isSearching = debounced.length > 0;
  const { data: results, isLoading } = useQuery({
    queryKey: ['home-search', debounced],
    queryFn: () => artistsApi.search({ q: debounced }),
    enabled: isSearching,
  });
  const items = results?.items ?? [];

  return (
    <View className="fade-down" style={styles.searchSection}>
      <form
        style={styles.searchContainer}
        onSubmit={(e) => {
          e.preventDefault();
          if (searchQuery.trim()) onSeeAll(searchQuery.trim());
        }}
        role="search"
      >
        <Icon name="search" size={20} color="#524344" style={{ opacity: 0.7 }} />
        <input
          className="rn-input"
          type="search"
          placeholder="Find artist or service"
          style={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Find artist or service"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} ariaLabel="Clear search">
            <Icon name="close-circle" size={18} color="#857374" />
          </Pressable>
        )}
      </form>

      {isSearching && (
        <View style={styles.searchDropdown}>
          {isLoading ? (
            <View style={styles.searchDropdownRow}>
              <Spinner />
              <Text style={styles.searchDropdownMuted}>Searching...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.searchDropdownRow}>
              <Icon name="search-outline" size={20} color="#857374" />
              <Text style={styles.searchDropdownMuted}>No results for "{debounced}"</Text>
            </View>
          ) : (
            items.slice(0, 5).map((artist) => (
              <Pressable
                key={artist.id}
                style={styles.searchDropdownItem}
                onPress={() => {
                  setSearchQuery('');
                  onOpenArtist(artist.id);
                }}
              >
                <Img src={getSizedImageUri(artist.photoUrl, 40)} style={styles.searchDropdownAvatar} />
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={styles.searchDropdownName} numberOfLines={1}>{artist.name}</Text>
                  <Text style={styles.searchDropdownMeta} numberOfLines={1}>
                    {artist.category?.join(', ') || 'Makeup Artist'}
                    {typeof artist.rating === 'number' && artist.rating > 0 ? ` · ★ ${artist.rating.toFixed(1)}` : ''}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color="#d7c1c3" />
              </Pressable>
            ))
          )}
          {items.length > 5 && (
            <Pressable style={styles.searchDropdownSeeAll} onPress={() => onSeeAll(debounced)}>
              <Text style={styles.searchDropdownSeeAllText}>See all results</Text>
              <Icon name="arrow-forward" size={14} color="#884952" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

// ─── Most Booked ─────────────────────────────────────────────────────────────
const HomeMostBookedSection = React.memo(function HomeMostBookedSection({
  artists, favoriteIds, onToggleFavorite, onOpenService,
}: {
  artists: Artist[];
  favoriteIds: string[];
  onToggleFavorite: (artistId: string) => void;
  onOpenService: (artistId: string, serviceId: string) => void;
}) {
  return (
    <View style={styles.mostBookedSection}>
      <Text style={{ ...styles.sectionTitle, paddingLeft: 24, paddingRight: 24, marginBottom: 20 }}>Most Booked</Text>
      <HScroll contentStyle={styles.mostBookedScrollContent}>
        {artists.filter((a) => a?.services?.length).slice(0, 8).map((artist, index) => {
          const service = artist.services[0];
          const isFav = favoriteIds.includes(artist.id);
          return (
            <div key={service.id} className="fade-up" style={{ ...styles.productCard, animationDelay: `${120 + index * 40}ms` }}>
              <View style={styles.productImageWrapper}>
                <Img src={getSizedImageUri(artist.photoUrl, 280)} style={styles.productImage} />
                <PressableScale scaleTo={0.85} onPress={() => onToggleFavorite(artist.id)} style={styles.favButton} ariaLabel={isFav ? 'Unfollow' : 'Follow'}>
                  <Icon name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#884952' : '#FFFFFF'} />
                </PressableScale>
              </View>
              <View style={styles.productBody}>
                <View style={styles.productInfoRow}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.productBadge}>{artist.name}</Text>
                    <Text style={styles.productTitle}>{service.title}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color="#FFB800" />
                    <Text style={styles.ratingText}>{artist.rating?.toFixed(1) ?? '-'}</Text>
                  </View>
                </View>
                <View style={styles.productFooter}>
                  <View>
                    <Text style={styles.productPriceLabel}>Starting price</Text>
                    <Text style={styles.productPrice}>{formatPrice(service.price)}</Text>
                  </View>
                  <PressableScale scaleTo={0.9} onPress={() => onOpenService(artist.id, service.id)} style={styles.addToCartBtn}>
                    <Text style={styles.addToCartText}>View</Text>
                  </PressableScale>
                </View>
              </View>
            </div>
          );
        })}
      </HScroll>
    </View>
  );
});

// ─── Top Artists ─────────────────────────────────────────────────────────────
const HomeTopArtistsSection = React.memo(function HomeTopArtistsSection({ artists, onOpenArtist }: { artists: Artist[]; onOpenArtist: (id: string) => void }) {
  return (
    <View style={styles.artistsSection}>
      <Text style={{ ...styles.sectionTitle, paddingLeft: 24, paddingRight: 24, marginBottom: 20 }}>Top Artists</Text>
      <HScroll contentStyle={styles.artistsScrollContent}>
        {artists.slice(0, 5).map((artist) => (
          <PressableScale key={artist.id} scaleTo={0.92} onPress={() => onOpenArtist(artist.id)} style={styles.artistCircleCard}>
            <View style={styles.artistAvatarWrapper}>
              <Img src={getSizedImageUri(artist.photoUrl, 80)} style={styles.artistAvatar} />
              {artist.isVerified && (
                <View style={styles.verifiedMiniBadge}>
                  <Icon name="verified" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={styles.artistCircleName}>{artist.name}</Text>
          </PressableScale>
        ))}
      </HScroll>
    </View>
  );
});

// ─── Featured Reels ──────────────────────────────────────────────────────────
const HomeFeaturedReelsSection = React.memo(function HomeFeaturedReelsSection({ reels, onOpenReels }: { reels: Reel[]; onOpenReels: () => void }) {
  return (
    <View style={styles.reelsSection}>
      <View style={{ ...styles.sectionHeader, paddingLeft: 24, paddingRight: 24 }}>
        <Text style={styles.sectionTitle}>Featured Reels</Text>
        <Pressable onPress={onOpenReels}>
          <Text style={styles.seeAllLink}>See all</Text>
        </Pressable>
      </View>
      {reels.length === 0 ? (
        <EmptyState title="No reels yet" message="Artist reels will show up here." iconName="film-outline" iconColor="#857374" />
      ) : (
        <HScroll contentStyle={styles.horizontalScrollContent}>
          {reels.map((reel, index) => (
            <PressableScale key={reel.id} scaleTo={0.95} onPress={onOpenReels} style={styles.reelWrapper}>
              <div className="fade-up" style={{ ...absoluteFill, animationDelay: `${index * 50}ms` }}>
                <Img src={getSizedImageUri(reel.thumbnailUrl, 160)} style={{ width: '100%', height: '100%' }} />
                <View style={styles.reelBlackOverlay} />
                <View style={styles.reelBadgeWrapper}>
                  <View style={styles.reelLikesPill}>
                    <Icon name="eye" size={10} color="#FFFFFF" />
                    <Text style={styles.reelStatusText}>{formatCompactNumber(reel.viewCount ?? 0)}</Text>
                  </View>
                </View>
                <View style={styles.reelPlayContainer}>
                  <Icon name="play-circle" size={40} color="#FFFFFF" style={{ opacity: 0.85 }} />
                </View>
                <View style={styles.reelFooterRow}>
                  <View style={styles.reelAvatarWrapper}>
                    <Img src={getSizedImageUri(reel.artist?.photoUrl, 24)} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <Text style={styles.reelArtistName}>{reel.artist?.name ?? 'Artist'}</Text>
                </View>
              </div>
            </PressableScale>
          ))}
        </HScroll>
      )}
    </View>
  );
});

export default function HomeScreen() {
  const navigate = useNavigate();
  const favoriteList = useFavoritesStore((s) => s.ids);
  const followArtist = useFollowArtist();
  const user = useAuthStore((s) => s.user);

  const { coords, place, status: locationStatus, requestLocation } = useDeviceLocation();
  // A picked city overrides the browser's location; clearing it (or asking
  // for the location again) goes back to "near me".
  const [manualCity, setManualCity] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [pickerCity, setPickerCity] = useState('');
  const [pickerState, setPickerState] = useState('');

  const { data: discoveryData, isLoading: discoveryLoading, error: discoveryError } = useDiscovery(
    manualCity ? { city: manualCity } : { lat: coords?.lat, lng: coords?.lng }
  );
  const discoveredArtists = useMemo(() => discoveryData?.pages.flatMap((p) => p?.items ?? []) ?? [], [discoveryData]);

  const { data: reelsData } = useReelsFeed();
  const featuredReels = useMemo(() => (reelsData?.pages.flatMap((p) => p.items) ?? []).slice(0, 8), [reelsData]);
  const { data: trendData } = useTrendDecodeFeed();
  const trendDecodeItems = useMemo(() => (trendData?.pages.flatMap((p) => p.items) ?? []).slice(0, 8), [trendData]);

  const { data: homeLayout } = useHomeLayout();
  const sections = homeLayout?.length ? homeLayout : FALLBACK_LAYOUT;

  // Most Booked and Top Artists share one query; whichever comes first owns
  // its loading/error message so it shows once.
  const firstDiscoverySection = sections.find((s) => s.slug === 'most_booked' || s.slug === 'top_artists')?.slug;
  const discoveryIsEmpty = discoveryLoading || !!discoveryError || discoveredArtists.length === 0;

  const renderDiscoveryState = useCallback(
    (slug: HomeSectionSlug) => {
      if (slug !== firstDiscoverySection) return null;
      if (discoveryLoading) {
        return (
          <View style={{ paddingLeft: 24, paddingRight: 24, margin: '24px 0' }}>
            <SkeletonLoader height={20} width="45%" style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ flex: 1 }}>
                  <SkeletonLoader height={160} style={{ marginBottom: 10, borderRadius: 20 }} />
                  <SkeletonLoader height={14} width="70%" style={{ marginBottom: 6 }} />
                  <SkeletonLoader height={12} width="40%" />
                </View>
              ))}
            </View>
          </View>
        );
      }
      if (discoveryError) {
        return <EmptyState title="Could not load artists" message={getErrorMessage(discoveryError)} iconName="alert-circle-outline" iconColor="#C0392B" />;
      }
      return <EmptyState title="No artists nearby yet" message="Try again later or explore by city." iconName="search-outline" iconColor="#857374" />;
    },
    [firstDiscoverySection, discoveryLoading, discoveryError]
  );

  const goToViewAllServices = useCallback(() => navigate('/artists'), [navigate]);
  const goToCategoryServices = useCallback((category: string) => navigate(`/artists?category=${encodeURIComponent(category)}`), [navigate]);
  const goToCourses = useCallback(() => navigate('/courses'), [navigate]);
  const goToArtistDetail = useCallback((artistId: string) => navigate(`/artist/${artistId}`), [navigate]);
  const goToServiceDetail = useCallback((artistId: string, serviceId: string) => navigate(`/artist/${artistId}/service/${serviceId}`), [navigate]);
  const goToReels = useCallback(() => navigate('/reels'), [navigate]);
  const goToSearch = useCallback((q: string) => navigate(`/search?q=${encodeURIComponent(q)}`), [navigate]);
  const goToTrendDecodeList = useCallback(() => navigate('/trend-decode'), [navigate]);
  const goToTrendDecodeViewer = useCallback((item: TrendDecodeItem) => navigate(`/trend-decode/${item.id}`, { state: { item } }), [navigate]);
  const toggleFavorite = useCallback(
    (artistId: string) => followArtist.mutate({ id: artistId, follow: !favoriteList.includes(artistId) }),
    [followArtist, favoriteList]
  );

  const renderers: Record<HomeSectionSlug, (data: any) => React.ReactNode> = {
    hero: (data: HomeHeroData | null) => <HeroCard data={data} onPressCta={goToViewAllServices} />,
    categories: (data: HomeCategoriesData | null) => <CategoryGrid data={data} onPressSeeAll={goToViewAllServices} onPressCategory={goToCategoryServices} />,
    learn_banner: (data: HomeLearnData | null) => <LearnBannerSection data={data} onExplore={goToCourses} onItemPress={goToCourses} />,
    promo_banner: (data: HomePromoData | null) => (
      // The admin's CTA names an app screen; on the web it opens the artist list.
      <PromoBannerCard data={data} onPressCta={data?.ctaTarget ? goToViewAllServices : undefined} />
    ),
    footer: (data: HomeFooterData | null) => <HomeFooter data={data} />,
    search: () => <HomeSearchSection onOpenArtist={goToArtistDetail} onSeeAll={goToSearch} />,
    // Retired from Home in the app too.
    continue_learning: () => null,
    most_booked: () =>
      discoveryIsEmpty ? (
        renderDiscoveryState('most_booked')
      ) : (
        <HomeMostBookedSection artists={discoveredArtists} favoriteIds={favoriteList} onToggleFavorite={toggleFavorite} onOpenService={goToServiceDetail} />
      ),
    top_artists: () =>
      discoveryIsEmpty ? renderDiscoveryState('top_artists') : <HomeTopArtistsSection artists={discoveredArtists} onOpenArtist={goToArtistDetail} />,
    featured_reels: () => <HomeFeaturedReelsSection reels={featuredReels} onOpenReels={goToReels} />,
    trend_decode: () => <HomeTrendDecodeSection items={trendDecodeItems} onOpenItem={goToTrendDecodeViewer} onViewAll={goToTrendDecodeList} />,
  };

  const locationLabel =
    manualCity ?? (locationStatus === 'granted' ? place ?? 'Near You' : locationStatus === 'loading' ? 'Locating…' : 'Enable Location');

  const knownCity = manualCity ?? (locationStatus === 'granted' ? place : null) ?? user?.city ?? undefined;
  const openArtistsInCity = () => {
    setShowCityPicker(false);
    navigate(knownCity ? `/city?city=${encodeURIComponent(knownCity)}` : '/city');
  };
  const useCurrentLocation = () => {
    setManualCity(null);
    setShowCityPicker(false);
    if (locationStatus !== 'granted') requestLocation();
  };

  const hour = new Date().getHours();
  const greeting = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`;

  return (
    <View style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Pressable
            style={styles.locationPickerRow}
            onPress={() => {
              setPickerCity(manualCity ?? '');
              setPickerState('');
              setShowCityPicker(true);
            }}
          >
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            <Icon name="chevron-down" size={16} color="#884952" />
          </Pressable>
          <Pressable onPress={openArtistsInCity} style={styles.cityArtistsLink}>
            <Icon name="people-outline" size={12} color="#884952" />
            <Text style={styles.cityArtistsLinkText}>See artists in my city</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => navigate('/profile')} style={styles.avatarContainer} ariaLabel="Your profile">
          {user?.profileImage ? (
            <Img src={getSizedImageUri(user.profileImage, 40)} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: '#efe6e2', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="person" size={20} color="#c2a3a8" />
            </View>
          )}
        </Pressable>
      </View>

      <View style={{ paddingTop: 12, paddingBottom: TAB_BAR_SPACE }}>
        {sections.map((section) => {
          const render = renderers[section.slug];
          return render ? <React.Fragment key={section.slug}>{render(section.data)}</React.Fragment> : null;
        })}
      </View>

      {showCityPicker && (
        <div style={styles.cityModalBackdrop} onClick={() => setShowCityPicker(false)} role="dialog" aria-modal="true" aria-label="Choose your city">
          <div className="fade-up" style={styles.cityModalSheet} onClick={(e) => e.stopPropagation()}>
            <View style={styles.cityModalHeader}>
              <Text style={styles.cityModalTitle}>Choose your city</Text>
              <PressableScale onPress={() => setShowCityPicker(false)} ariaLabel="Close">
                <Icon name="close" size={22} color="#1e1b18" />
              </PressableScale>
            </View>
            <CitySearchInput
              city={pickerCity}
              state={pickerState}
              autoFocus
              onChange={(c, s) => {
                setPickerCity(c);
                setPickerState(s);
                if (c) {
                  setManualCity(c);
                  setShowCityPicker(false);
                }
              }}
            />
            <PressableScale onPress={useCurrentLocation} style={styles.useLocationBtn}>
              <Icon name="locate" size={16} color="#884952" />
              <Text style={styles.useLocationText}>Use my current location</Text>
            </PressableScale>
            <PressableScale onPress={openArtistsInCity} style={{ ...styles.useLocationBtn, ...styles.cityArtistsBtn }}>
              <Icon name="people" size={16} color="#FFFFFF" />
              <Text style={{ ...styles.useLocationText, color: '#FFFFFF' }}>See all artists by city or pincode</Text>
            </PressableScale>
          </div>
        </div>
      )}
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, backgroundColor: '#fff8f5', paddingTop: 24 },
  cityModalBackdrop: { position: 'fixed', ...absoluteFill, backgroundColor: 'rgba(30, 27, 24, 0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 },
  cityModalSheet: { width: '100%', maxWidth: 480, backgroundColor: '#fff8f5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  cityModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  cityModalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18' },
  useLocationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.5)', marginTop: 4, width: '100%' },
  useLocationText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  cityArtistsBtn: { backgroundColor: '#884952', borderColor: '#884952', marginTop: 10 },
  cityArtistsLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cityArtistsLinkText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#884952', textDecorationLine: 'underline' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  greetingText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#884952', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 },
  locationPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1e1b18' },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#d7c1c3', overflow: 'hidden', backgroundColor: '#FFFFFF' },

  searchSection: { paddingHorizontal: 24, marginBottom: 36 },
  searchContainer: { display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)', borderRadius: 16, paddingHorizontal: 16, height: 52, gap: 12 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  searchDropdown: {
    marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.3)', overflow: 'hidden',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20,
  },
  searchDropdownRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  searchDropdownMuted: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374' },
  searchDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(215, 193, 195, 0.15)', gap: 12, width: '100%' },
  searchDropdownAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#efe6e2' },
  searchDropdownName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#1e1b18', marginBottom: 2 },
  searchDropdownMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374' },
  searchDropdownSeeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6, backgroundColor: 'rgba(136, 73, 82, 0.04)', width: '100%' },
  searchDropdownSeeAllText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#884952', letterSpacing: 0.3 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 24, color: '#1e1b18' },
  seeAllLink: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#884952', textTransform: 'uppercase', letterSpacing: 1.5, borderBottomWidth: 1, borderBottomColor: 'rgba(136, 73, 82, 0.3)', paddingBottom: 2 },
  mostBookedSection: { marginBottom: 36 },
  horizontalScrollContent: { paddingLeft: 24, paddingRight: 12, gap: 16 },
  mostBookedScrollContent: { paddingLeft: 24, paddingRight: 12, gap: 12, paddingBottom: 16 },
  productCard: {
    display: 'flex', flexDirection: 'column', width: 280, backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.2)',
    shadowColor: '#1e1b18', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20,
  },
  productImageWrapper: { height: 220, position: 'relative', backgroundColor: '#f5ece7' },
  productImage: { width: '100%', height: '100%' },
  favButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  productBody: { padding: 20, gap: 12 },
  productInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productBadge: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#884952', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  productTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 18, color: '#1e1b18' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#1e1b18' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  productPriceLabel: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: '#8a827c', marginBottom: 2 },
  productPrice: { fontFamily: 'BodoniModa_600SemiBold', fontSize: 20, color: '#1e1b18' },
  addToCartBtn: { backgroundColor: '#1e1b18', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  addToCartText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 1 },

  artistsSection: { marginBottom: 40 },
  artistsScrollContent: { paddingLeft: 24, paddingRight: 12, gap: 20 },
  artistCircleCard: { alignItems: 'center', gap: 10 },
  artistAvatarWrapper: { position: 'relative', width: 80, height: 80, borderRadius: 40, padding: 3, borderWidth: 2, borderColor: 'rgba(136, 73, 82, 0.2)' },
  artistAvatar: { width: '100%', height: '100%', borderRadius: 36 },
  verifiedMiniBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#884952', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  artistCircleName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#1e1b18' },

  reelsSection: { marginBottom: 40 },
  reelWrapper: { width: 160, aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', position: 'relative', shadowColor: '#884952', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20 },
  reelBlackOverlay: { ...absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
  reelBadgeWrapper: { position: 'absolute', top: 12, left: 12 },
  reelLikesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(30, 27, 24, 0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reelStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF' },
  reelPlayContainer: { ...absoluteFill, alignItems: 'center', justifyContent: 'center' },
  reelFooterRow: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  reelAvatarWrapper: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', overflow: 'hidden' },
  reelArtistName: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF' },
});
