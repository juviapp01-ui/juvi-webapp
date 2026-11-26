import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet, cx, absoluteFill } from '@/lib/rn';
import { EmptyState, HScroll, Icon, Img, Pressable, PressableScale, Spinner, Text, View } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/layouts/AppShell';
import { artistsApi } from '@/api';
import { useDebounce, useDiscovery, useFollowArtist, useReelsFeed, useSavedReels, useToggleReelSave } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { LOGO } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';
import { formatCompactNumber } from '@/utils/format';
import { getSizedImageUri } from '@/utils/image';
import type { Artist, Reel } from '@/types';

// Port of frontend/src/screens/customer/ExploreScreen.tsx: search with live
// results, Explore (trending artists + a masonry of reels) and Saved (looks
// and artists). A reel opens the Reels feed on that reel.
const TILE_HEIGHT_VARIANTS = [180, 224, 260, 200];
function tileHeight(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return TILE_HEIGHT_VARIANTS[Math.abs(hash) % TILE_HEIGHT_VARIANTS.length];
}

const ExploreGridTile = React.memo(function ExploreGridTile({ reel, onOpen }: { reel: Reel; onOpen: (id: string) => void }) {
  const toggleSave = useToggleReelSave();
  return (
    <div style={{ breakInside: 'avoid', marginBottom: 10 }}>
      <PressableScale asDiv scaleTo={0.97} onPress={() => onOpen(reel.id)} style={{ ...styles.exploreTile, height: tileHeight(reel.id) }} ariaLabel={reel.caption || 'Reel'}>
        <Img src={getSizedImageUri(reel.thumbnailUrl, 200)} style={{ ...absoluteFill, width: '100%', height: '100%' }} />
        <View style={{ ...absoluteFill, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
        <View style={styles.exploreReelPlayBadge}>
          <Icon name="play" size={11} color="#FFFFFF" />
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggleSave.mutate(reel.id);
          }}
          style={styles.bookmarkBtn}
          ariaLabel={reel.isSaved ? 'Unsave' : 'Save'}
        >
          <Icon name={reel.isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={reel.isSaved ? '#884952' : 'rgba(30,27,24,0.6)'} />
        </Pressable>
        <View style={styles.exploreViewsBadge}>
          <Icon name="eye-outline" size={11} color="#FFFFFF" />
          <Text style={styles.exploreViewsText}>{formatCompactNumber(reel.viewCount ?? 0)}</Text>
        </View>
      </PressableScale>
    </div>
  );
});

function ReelMasonry({ reels, onOpen }: { reels: Reel[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ columnCount: 2, columnGap: 10 }}>
      {reels.map((reel) => (
        <ExploreGridTile key={reel.id} reel={reel} onOpen={onOpen} />
      ))}
    </div>
  );
}

export const SearchHitRow = React.memo(function SearchHitRow({ artist, onPress }: { artist: Artist; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={styles.hitRow}>
      <Img src={getSizedImageUri(artist.photoUrl, 44)} style={styles.hitAvatar} />
      <View style={styles.hitBody}>
        <Text style={styles.hitName} numberOfLines={1}>{artist.name}</Text>
        <Text style={styles.hitMeta} numberOfLines={1}>
          {[artist.city, (artist.category ?? []).slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {typeof artist.rating === 'number' && artist.rating > 0 && (
        <View style={styles.hitRating}>
          <Icon name="star" size={11} color="#FFFFFF" />
          <Text style={styles.hitRatingText}>{artist.rating.toFixed(1)}</Text>
        </View>
      )}
      <Icon name="chevron-forward" size={16} color="#d7c1c3" />
    </PressableScale>
  );
});

export function LoadMore({ hasNext, loading, onMore }: { hasNext?: boolean; loading: boolean; onMore: () => void }) {
  if (!hasNext) return null;
  return (
    <View style={{ alignItems: 'center', padding: 16 }}>
      <PressableScale onPress={onMore} disabled={loading} style={styles.moreBtn}>
        {loading ? <Spinner /> : <Text style={styles.moreText}>Show more</Text>}
      </PressableScale>
    </View>
  );
}

export default function ExploreScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [subTab, setSubTab] = useState<'explore' | 'saved'>('explore');
  const [savedSubTab, setSavedSubTab] = useState<'looks' | 'artists'>('looks');
  const favorites = useFavoritesStore((s) => s.ids);
  const followArtist = useFollowArtist();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 220);
  const isSearching = debouncedQuery.length > 0;

  const { data: discoveryData } = useDiscovery({});
  const discoveredArtists = useMemo(() => discoveryData?.pages.flatMap((p) => p?.items ?? []) ?? [], [discoveryData]);

  const { data: searchResults, isFetching: searchLoading, error: searchError } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => artistsApi.search({ q: debouncedQuery }),
    enabled: isSearching,
    placeholderData: (prev) => prev,
  });
  const searchHits = searchResults?.items ?? [];

  const { data: trending = [] } = useQuery({
    queryKey: ['trending'],
    queryFn: () => artistsApi.trending(10).then((r) => r.data.artists ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const reelsFeed = useReelsFeed();
  const exploreReels = useMemo(() => reelsFeed.data?.pages.flatMap((p) => p.items) ?? [], [reelsFeed.data]);
  const savedReelsQuery = useSavedReels(subTab === 'saved');
  const savedReels = useMemo(() => savedReelsQuery.data?.pages.flatMap((p) => p.items) ?? [], [savedReelsQuery.data]);

  const openArtist = (id: string) => navigate(`/artist/${id}`);
  const openReel = (id: string) => navigate(`/reels?start=${encodeURIComponent(id)}`);
  const savedArtists = discoveredArtists.filter((a) => favorites.includes(a.id));

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={styles.logoImage} />
        <Pressable onPress={() => navigate('/profile')} style={styles.avatarMini} ariaLabel="Your profile">
          {user?.profileImage ? (
            <Img src={user.profileImage} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: '#efe6e2', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="person" size={20} color="#c2a3a8" />
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.stickyHeader}>
        <View style={styles.searchRow}>
          <form
            style={styles.searchContainer}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <Icon name="search" size={18} color="rgba(133, 115, 116, 0.6)" style={{ opacity: 0.7 }} />
            <input
              className="rn-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists or looks..."
              style={styles.searchInput}
              aria-label="Search artists or looks"
            />
          </form>
          <PressableScale onPress={() => navigate(`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)} style={styles.filterBtn} ariaLabel="Search with filters">
            <Icon name="options-outline" size={18} color="#884952" />
          </PressableScale>
        </View>
        <View style={styles.tabsRow}>
          {(['explore', 'saved'] as const).map((key) => {
            const isActive = subTab === key;
            return (
              <Pressable key={key} onPress={() => setSubTab(key)} style={cx(styles.tabBtn, isActive && styles.tabBtnActive)}>
                <Text style={cx(styles.tabBtnText, isActive && styles.tabBtnTextActive)}>{key === 'explore' ? 'Explore' : 'Saved'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingBottom: TAB_BAR_SPACE }}>
        {isSearching ? (
          <View style={styles.searchResultsWrap}>
            {searchError ? (
              <EmptyState title="Couldn't search" message={getErrorMessage(searchError)} iconName="alert-circle-outline" iconColor="#C0392B" />
            ) : searchHits.length === 0 && !searchLoading ? (
              <EmptyState title={`Nothing for "${debouncedQuery}"`} message="Try an artist's name, a city, or a service like bridal or nails." iconName="search-outline" iconColor="#857374" />
            ) : (
              <>
                <View style={styles.searchMetaRow}>
                  <Text style={styles.searchMeta}>
                    {searchHits.length} {searchHits.length === 1 ? 'match' : 'matches'}
                  </Text>
                  {searchLoading && <Spinner />}
                </View>
                {searchHits.map((artist) => (
                  <SearchHitRow key={artist.id} artist={artist} onPress={() => openArtist(artist.id)} />
                ))}
              </>
            )}
          </View>
        ) : subTab === 'saved' ? (
          <View>
            <View style={styles.savedSubTabsRow}>
              {(['looks', 'artists'] as const).map((key) => {
                const isActive = savedSubTab === key;
                return (
                  <Pressable key={key} onPress={() => setSavedSubTab(key)} style={cx(styles.savedSubTabBtn, isActive && styles.savedSubTabBtnActive)}>
                    <Text style={cx(styles.savedSubTabText, isActive && styles.savedSubTabTextActive)}>{key === 'looks' ? 'Looks' : 'Artists'}</Text>
                  </Pressable>
                );
              })}
            </View>
            {savedSubTab === 'looks' ? (
              <View style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 16 }}>
                {savedReelsQuery.isLoading ? (
                  <View style={styles.gridLoadingWrap}>
                    <Spinner size="large" />
                  </View>
                ) : savedReelsQuery.error && savedReels.length === 0 ? (
                  <EmptyState title="Could not load saved looks" message={getErrorMessage(savedReelsQuery.error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => savedReelsQuery.refetch()} />
                ) : savedReels.length === 0 ? (
                  <EmptyState title="No saved looks yet" message="Tap the bookmark on any reel to keep it here for later." iconName="bookmark-outline" iconColor="#884952" />
                ) : (
                  <>
                    <ReelMasonry reels={savedReels} onOpen={openReel} />
                    <LoadMore hasNext={savedReelsQuery.hasNextPage} loading={savedReelsQuery.isFetchingNextPage} onMore={() => savedReelsQuery.fetchNextPage()} />
                  </>
                )}
              </View>
            ) : savedArtists.length > 0 ? (
              <div style={styles.savedGrid}>
                {savedArtists.map((artist, index) => (
                  <div key={artist.id} className="fade-down" style={{ animationDelay: `${index * 70}ms`, minWidth: 0 }}>
                    <PressableScale asDiv scaleTo={0.95} onPress={() => openArtist(artist.id)} style={{ width: '100%', textAlign: 'left' }}>
                      <View style={styles.savedImageWrapper}>
                        <Img src={getSizedImageUri(artist.photoUrl, 200)} style={{ width: '100%', height: '100%' }} />
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            followArtist.mutate({ id: artist.id, follow: false });
                          }}
                          style={styles.savedHeartBtn}
                          ariaLabel="Unfollow"
                        >
                          <Icon name="heart" size={16} color="#884952" />
                        </Pressable>
                      </View>
                      <Text style={styles.savedName} numberOfLines={1}>{artist.name}</Text>
                      <Text style={styles.savedMeta} numberOfLines={1}>
                        ★ {artist.rating?.toFixed(1) ?? '-'} · {artist.category?.[0] ?? 'Artist'}
                      </Text>
                    </PressableScale>
                  </div>
                ))}
              </div>
            ) : (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <EmptyState title="No saved artists yet" message="Tap the heart on any artist to keep them here for later." iconName="heart-outline" iconColor="#884952" />
                <PressableScale scaleTo={0.95} style={styles.tabCtaBtn} onPress={() => setSubTab('explore')}>
                  <Icon name="heart-outline" size={16} color="#ffffff" />
                  <Text style={styles.tabCtaText}>Browse Looks</Text>
                </PressableScale>
              </View>
            )}
          </View>
        ) : (
          <View>
            {trending.length > 0 && (
              <View style={styles.trendingWrap}>
                <View style={styles.trendingHeader}>
                  <Text style={styles.trendingTitle}>Trending artists</Text>
                  <Icon name="trending-up" size={16} color="#884952" />
                </View>
                <HScroll contentStyle={styles.trendingRow}>
                  {trending.map((a) => (
                    <PressableScale key={a.id} scaleTo={0.95} onPress={() => openArtist(a.id)} style={styles.trendingCard}>
                      <Img src={getSizedImageUri(a.photoUrl, 64)} style={styles.trendingAvatar} />
                      <Text style={styles.trendingName} numberOfLines={1}>{a.name}</Text>
                      {typeof a.rating === 'number' && a.rating > 0 && <Text style={styles.trendingRating}>★ {a.rating.toFixed(1)}</Text>}
                    </PressableScale>
                  ))}
                </HScroll>
              </View>
            )}
            <View style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 16 }}>
              {reelsFeed.isLoading ? (
                <View style={styles.gridLoadingWrap}>
                  <Spinner size="large" />
                </View>
              ) : reelsFeed.error && exploreReels.length === 0 ? (
                <EmptyState title="Could not load Explore" message={getErrorMessage(reelsFeed.error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => reelsFeed.refetch()} />
              ) : exploreReels.length === 0 ? (
                <EmptyState title="Nothing to explore yet" message="Looks from artists will show up here." iconName="film-outline" iconColor="#857374" />
              ) : (
                <>
                  <ReelMasonry reels={exploreReels} onOpen={openReel} />
                  <LoadMore hasNext={reelsFeed.hasNextPage} loading={reelsFeed.isFetchingNextPage} onMore={() => reelsFeed.fetchNextPage()} />
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, backgroundColor: '#fff8f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: '#fff8f5' },
  logoImage: { width: 80, height: 80 },
  avatarMini: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#d7c1c3', overflow: 'hidden' },
  stickyHeader: { position: 'sticky', top: 0, zIndex: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, backgroundColor: '#fff8f5' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'center' },
  searchContainer: { display: 'flex', flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 30, paddingHorizontal: 16, height: 48, gap: 10, minWidth: 0 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(215, 193, 195, 0.2)' },
  tabBtn: { flex: 1, paddingBottom: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#884952' },
  tabBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: 'rgba(82, 67, 68, 0.5)', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabBtnTextActive: { color: '#884952' },
  searchResultsWrap: { paddingHorizontal: 20, paddingTop: 12 },
  searchMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  searchMeta: { fontSize: 12, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  hitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#f1e7e3', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, width: '100%' },
  hitAvatar: { height: 44, width: 44, borderRadius: 22, backgroundColor: '#f7f1ee' },
  hitBody: { flex: 1, minWidth: 0, textAlign: 'left' },
  hitName: { fontSize: 14.5, color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold' },
  hitMeta: { marginTop: 2, fontSize: 12, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  hitRating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1f7a4d', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  hitRatingText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'HankenGrotesk_600SemiBold' },
  trendingWrap: { paddingTop: 14, paddingBottom: 4 },
  trendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  trendingTitle: { fontSize: 16, color: '#1e1b18', fontFamily: 'PlayfairDisplay_600SemiBold' },
  trendingRow: { paddingHorizontal: 20, gap: 14 },
  trendingCard: { width: 72, alignItems: 'center' },
  trendingAvatar: { height: 64, width: 64, borderRadius: 32, backgroundColor: '#f7f1ee' },
  trendingName: { marginTop: 6, fontSize: 11.5, color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold', textAlign: 'center', width: '100%' },
  trendingRating: { marginTop: 1, fontSize: 10.5, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  savedSubTabsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 4, backgroundColor: '#efe6e2', borderRadius: 20, padding: 4 },
  savedSubTabBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  savedSubTabBtnActive: { backgroundColor: '#ffffff' },
  savedSubTabText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: 'rgba(82, 67, 68, 0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  savedSubTabTextActive: { color: '#884952' },
  tabCtaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e1b18', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  tabCtaText: { color: '#ffffff', fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13 },
  savedGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '16px 20px' },
  savedImageWrapper: { width: '100%', height: 150, borderRadius: 18, overflow: 'hidden', marginBottom: 8 },
  savedHeartBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  savedName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#1e1b18' },
  savedMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374', marginTop: 2 },
  exploreTile: { width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: '#efe6e2' },
  bookmarkBtn: { position: 'absolute', top: 10, left: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  exploreViewsBadge: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  exploreViewsText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF' },
  exploreReelPlayBadge: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  gridLoadingWrap: { paddingTop: 80, alignItems: 'center' },
  moreBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF' },
  moreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952' },
});
