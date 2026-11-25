import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { BackHeader, EmptyState, HScroll, Icon, PressableScale, SkeletonLoader, Text, View } from '@/components/ui';
import { SearchHitRow, LoadMore } from '@/screens/customer/ExploreScreen';
import { artistsApi } from '@/api';
import { useDebounce } from '@/hooks';
import { SERVICE_CATEGORIES } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';

// Search results with filters. The app's SearchResults screen plus the
// filters its SearchFilters screen describes, applied through the backend's
// own parameters: /search when there is text, /discovery (same filters)
// when there is only a filter. Everything lives in the URL so a search can
// be shared and survives a reload.
const RATINGS = [
  { key: '', label: 'Any rating' },
  { key: '4', label: '4★ & up' },
  { key: '4.5', label: '4.5★ & up' },
];
const PRICES = [
  { key: '', label: 'Any price', min: undefined, max: undefined },
  { key: 'u2', label: 'Under ₹2,000', min: undefined, max: 2000 },
  { key: '2-5', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { key: '5p', label: '₹5,000+', min: 5000, max: undefined },
];

export default function SearchResultsScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const rating = params.get('rating') ?? '';
  const price = params.get('price') ?? '';
  const city = params.get('city') ?? '';
  const [text, setText] = useState(q);
  const [cityText, setCityText] = useState(city);
  const debounced = useDebounce(text.trim(), 300);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Typing updates the URL after a short pause.
  useEffect(() => {
    if (debounced !== q) set('q', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const band = PRICES.find((p) => p.key === price) ?? PRICES[0];
  const filters = useMemo(
    () => ({
      category: category || undefined,
      minRating: rating ? Number(rating) : undefined,
      minPrice: band.min,
      maxPrice: band.max,
      city: city || undefined,
    }),
    [category, rating, band, city]
  );
  const anyFilter = !!(category || rating || price || city);

  const results = useInfiniteQuery({
    queryKey: ['search-results', q, filters],
    queryFn: ({ pageParam = 1 }) =>
      q ? artistsApi.search({ q, ...filters, page: pageParam }) : artistsApi.discover({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: !!q || anyFilter,
  });
  const hits = results.data?.pages.flatMap((p) => p.items) ?? [];
  const total = results.data?.pages[0]?.total ?? hits.length;

  return (
    <View style={styles.safe}>
      <BackHeader title="Search" onBack={() => navigate(-1)} />

      <View style={styles.top}>
        <form style={styles.searchBox} role="search" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }}>
          <Icon name="search" size={18} color="#857374" />
          <input
            className="rn-input"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Artist name, service or city"
            style={styles.searchInput}
            autoFocus={!q}
            aria-label="Search"
          />
        </form>

        <Text style={styles.filterLabel}>CATEGORY</Text>
        <HScroll contentStyle={styles.chipRow}>
          {['', ...SERVICE_CATEGORIES].map((c) => (
            <Chip key={c || 'all'} label={c || 'All'} active={category === c} onPress={() => set('category', c)} />
          ))}
        </HScroll>

        <Text style={styles.filterLabel}>RATING</Text>
        <HScroll contentStyle={styles.chipRow}>
          {RATINGS.map((r) => (
            <Chip key={r.key || 'any'} label={r.label} active={rating === r.key} onPress={() => set('rating', r.key)} />
          ))}
        </HScroll>

        <Text style={styles.filterLabel}>PRICE (STARTING FROM)</Text>
        <HScroll contentStyle={styles.chipRow}>
          {PRICES.map((p) => (
            <Chip key={p.key || 'any'} label={p.label} active={price === p.key} onPress={() => set('price', p.key)} />
          ))}
        </HScroll>

        <Text style={styles.filterLabel}>CITY</Text>
        <form style={styles.cityRow} onSubmit={(e) => { e.preventDefault(); set('city', cityText.trim()); }}>
          <input
            className="rn-input"
            value={cityText}
            onChange={(e) => setCityText(e.target.value)}
            onBlur={() => set('city', cityText.trim())}
            placeholder="Any city"
            style={styles.cityInput}
            aria-label="City"
          />
          {city && (
            <PressableScale onPress={() => { setCityText(''); set('city', ''); }} ariaLabel="Clear city">
              <Icon name="close-circle" size={18} color="#A8A29E" />
            </PressableScale>
          )}
        </form>
      </View>

      <View style={styles.results}>
        {!q && !anyFilter ? (
          <EmptyState title="Search JUVI" message="Type an artist's name, a service like bridal or nails, or pick a filter." iconName="search-outline" iconColor="#857374" />
        ) : results.isLoading ? (
          [0, 1, 2].map((i) => <SkeletonLoader key={i} height={64} style={{ borderRadius: 16, marginBottom: 8 }} />)
        ) : results.error ? (
          <EmptyState title="Couldn't search" message={getErrorMessage(results.error)} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel="Retry" onAction={() => results.refetch()} />
        ) : hits.length === 0 ? (
          <EmptyState title="No artists match" message="Try fewer filters, another city, or a different word." iconName="search-outline" iconColor="#857374" />
        ) : (
          <>
            <Text style={styles.count}>
              {total} {total === 1 ? 'artist' : 'artists'}
            </Text>
            {hits.map((artist) => (
              <SearchHitRow key={artist.id} artist={artist} onPress={() => navigate(`/artist/${artist.id}`)} />
            ))}
            <LoadMore hasNext={results.hasNextPage} loading={results.isFetchingNextPage} onMore={() => results.fetchNextPage()} />
          </>
        )}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.96} onPress={onPress} style={cx(styles.chip, active && styles.chipActive)}>
      <Text style={cx(styles.chipText, active && styles.chipTextActive)}>{label}</Text>
    </PressableScale>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  top: { paddingHorizontal: 20, gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1e7e3' },
  searchBox: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.5)', borderRadius: 30, paddingHorizontal: 16, height: 48, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  filterLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, color: '#857374', letterSpacing: 1.5, marginTop: 4 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: '#884952', borderColor: '#884952' },
  chipText: { fontSize: 12.5, color: '#524344', fontFamily: 'HankenGrotesk_600SemiBold', whiteSpace: 'nowrap' },
  chipTextActive: { color: '#FFFFFF' },
  cityRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#efe6e2', borderRadius: 12, paddingHorizontal: 14, height: 44, marginBottom: 8 },
  cityInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  results: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  count: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#524344', letterSpacing: 0.5, marginBottom: 10 },
});
