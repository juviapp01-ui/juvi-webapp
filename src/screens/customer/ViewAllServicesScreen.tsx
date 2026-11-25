import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { EmptyState, HScroll, Icon, type IconName, PressableScale, SkeletonLoader, Text, View } from '@/components/ui';
import { ArtistResultCard, CategorySwitcherRow } from '@/components/discovery';
import { useDiscovery } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';

// Port of frontend/src/screens/customer/ViewAllServicesScreen.tsx: every
// artist (or one category's), with the category switcher, offers filter and
// sorting. The category lives in the URL (?category=) so the page can be
// shared and survives a reload.
type SortKey = 'recommended' | 'rating' | 'nearest' | 'price';
const SORTS: { key: SortKey; label: string; icon?: IconName }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'rating', label: 'Top rated', icon: 'star-outline' },
  { key: 'nearest', label: 'Nearest', icon: 'navigate-outline' },
  { key: 'price', label: 'Price: low to high' },
];

export default function ViewAllServicesScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get('category') ?? undefined;
  const setActiveCategory = (c: string | undefined) => setParams(c ? { category: c } : {}, { replace: true });
  const [sort, setSort] = useState<SortKey>('recommended');
  const [offersOnly, setOffersOnly] = useState(false);

  const { data, isLoading, error } = useDiscovery({ category: activeCategory });
  const artists = useMemo(() => data?.pages.flatMap((p) => p?.items ?? []) ?? [], [data]);

  const shown = useMemo(() => {
    let list = artists;
    if (offersOnly) list = list.filter((a) => !!a.offer);
    if (sort === 'rating') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === 'nearest') list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (sort === 'price') list = [...list].sort((a, b) => (a.startingPrice ?? Infinity) - (b.startingPrice ?? Infinity));
    return list;
  }, [artists, sort, offersOnly]);

  const offerCount = artists.filter((a) => !!a.offer).length;

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <PressableScale onPress={() => navigate(-1)} style={styles.iconButton} ariaLabel="Back">
          <Icon name="arrow-back" size={24} color="#1e1b18" />
        </PressableScale>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{activeCategory ?? 'All services'}</Text>
          {!isLoading && <Text style={styles.headerSub}>{shown.length} {shown.length === 1 ? 'artist' : 'artists'}</Text>}
        </View>
        <View style={styles.iconButton} />
      </View>

      <CategorySwitcherRow activeCategory={activeCategory} onSelect={setActiveCategory} />

      <View style={styles.chipsWrap}>
        <HScroll contentStyle={styles.chipsRow}>
          {offerCount > 0 && (
            <PressableScale scaleTo={0.96} onPress={() => setOffersOnly((v) => !v)} style={cx(styles.chip, offersOnly && styles.chipActive)}>
              <Icon name="pricetag-outline" size={13} color={offersOnly ? '#FFFFFF' : '#884952'} />
              <Text style={cx(styles.chipText, offersOnly && styles.chipTextActive)}>Offers ({offerCount})</Text>
            </PressableScale>
          )}
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <PressableScale key={s.key} scaleTo={0.96} onPress={() => setSort(s.key)} style={cx(styles.chip, active && styles.chipActive)}>
                {s.icon && <Icon name={s.icon} size={13} color={active ? '#FFFFFF' : '#524344'} />}
                <Text style={cx(styles.chipText, active && styles.chipTextActive)}>{s.label}</Text>
              </PressableScale>
            );
          })}
        </HScroll>
      </View>

      <View style={styles.scrollContent}>
        {isLoading ? (
          <View>
            {[0, 1].map((i) => (
              <View key={i} style={{ marginBottom: 20 }}>
                <SkeletonLoader height={150} style={{ borderRadius: 20, marginBottom: 10 }} />
                <SkeletonLoader height={15} width="55%" style={{ marginBottom: 6 }} />
                <SkeletonLoader height={12} width="35%" />
              </View>
            ))}
          </View>
        ) : error ? (
          <EmptyState title="Couldn't load artists" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={offersOnly ? 'No offers right now' : 'Nobody here yet'}
            message={offersOnly ? 'Turn off the Offers filter to see everyone in this category.' : 'No artists are covering this category near you. Try another, or widen your search.'}
            iconName="search-outline"
            iconColor="#857374"
          />
        ) : (
          <>
            <Text style={styles.sectionLabel}>{activeCategory ? `${activeCategory} artists` : 'All artists'}</Text>
            {shown.map((artist, i) => (
              <div key={artist.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <ArtistResultCard
                  artist={artist}
                  featured
                  onPress={() => navigate(`/artist/${artist.id}${activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ''}`)}
                />
              </div>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fffaf8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  iconButton: { padding: 8, width: 40 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold' },
  headerSub: { fontSize: 11.5, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  chipsWrap: { borderTopWidth: 1, borderTopColor: '#f1e7e3', borderBottomWidth: 1, borderBottomColor: '#f1e7e3', paddingBottom: 10 },
  chipsRow: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: '#884952', borderColor: '#884952' },
  chipText: { fontSize: 12.5, color: '#524344', fontFamily: 'HankenGrotesk_600SemiBold', whiteSpace: 'nowrap' },
  chipTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: '#857374', fontFamily: 'HankenGrotesk_600SemiBold', marginBottom: 12, marginTop: 6 },
});
