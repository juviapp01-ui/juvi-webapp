import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { EmptyState, Icon, Pressable, PressableScale, Spinner, Text, View } from '@/components/ui';
import { ArtistResultCard } from '@/components/discovery';
import { placesApi, PlaceSuggestion } from '@/api';
import { useDiscovery } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';

// Port of frontend/src/screens/customer/ArtistsInCityScreen.tsx: type a city
// (backend suggestions) or a 6-digit pincode (resolved by the backend) and
// see every artist there.
const PINCODE_RE = /^[1-9]\d{5}$/;

export default function ArtistsInCityScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const myCity = params.get('city')?.trim() || user?.city?.trim() || '';

  const [query, setQuery] = useState(myCity);
  const [city, setCity] = useState(myCity);
  const [resolvedFrom, setResolvedFrom] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [resolving, setResolving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const showCity = (next: string, fromPincode: string | null = null) => {
    setCity(next);
    setResolvedFrom(fromPincode);
    setSuggestions([]);
    setLookupError(null);
  };

  const resolvePincode = async (code: string) => {
    const requestId = ++requestIdRef.current;
    setResolving(true);
    setLookupError(null);
    try {
      const { data } = await placesApi.pincode(code);
      if (requestId !== requestIdRef.current) return;
      if (data.city) {
        setQuery(data.city);
        showCity(data.city, code);
      } else {
        setLookupError(`We couldn't find a city for pincode ${code}`);
      }
    } catch (e) {
      if (requestId === requestIdRef.current) setLookupError(getErrorMessage(e, `We couldn't find a city for pincode ${code}`));
    } finally {
      if (requestId === requestIdRef.current) setResolving(false);
    }
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    setLookupError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (/^\d+$/.test(trimmed)) {
      setSuggestions([]);
      if (PINCODE_RE.test(trimmed)) resolvePincode(trimmed);
      return;
    }
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await placesApi.autocomplete(trimmed);
        if (requestId === requestIdRef.current) setSuggestions(data.results);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      }
    }, 350);
  };

  const onSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (/^\d+$/.test(trimmed)) {
      if (PINCODE_RE.test(trimmed)) resolvePincode(trimmed);
      else setLookupError('Enter a valid 6-digit pincode');
      return;
    }
    showCity(trimmed);
  };

  const clear = () => {
    requestIdRef.current++;
    setQuery('');
    setSuggestions([]);
    setLookupError(null);
    setResolving(false);
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <PressableScale onPress={() => navigate(-1)} style={styles.backBtn} ariaLabel="Back">
          <Icon name="arrow-back" size={24} color="#1e1b18" />
        </PressableScale>
        <Text style={styles.headerTitle}>Artists in your city</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchArea}>
        <form
          style={styles.searchBox}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Icon name="search" size={18} color="#857374" />
          <input
            className="rn-input"
            value={query}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Enter city name or pincode"
            style={styles.searchInput}
            maxLength={60}
            autoCorrect="off"
            aria-label="City name or pincode"
          />
          {resolving ? (
            <Spinner />
          ) : query.length > 0 ? (
            <Pressable onPress={clear} ariaLabel="Clear">
              <Icon name="close-circle" size={18} color="#A8A29E" />
            </Pressable>
          ) : null}
        </form>

        {suggestions.length > 0 && (
          <View style={styles.dropdown}>
            {suggestions.map((s) => (
              <PressableScale
                key={s.placeId}
                onPress={() => {
                  setQuery(s.city);
                  showCity(s.city);
                }}
                style={styles.suggestion}
              >
                <Icon name="location-outline" size={16} color="#884952" />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {s.city}
                  {s.state ? <Text style={styles.suggestionState}>{`, ${s.state}`}</Text> : null}
                </Text>
              </PressableScale>
            ))}
          </View>
        )}

        {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}
        {resolvedFrom && city ? <Text style={styles.resolvedText}>Pincode {resolvedFrom} · {city}</Text> : null}

        {!!myCity && myCity.toLowerCase() !== city.toLowerCase() && (
          <PressableScale
            onPress={() => {
              setQuery(myCity);
              showCity(myCity);
            }}
            style={styles.myCityChip}
          >
            <Icon name="navigate" size={14} color="#884952" />
            <Text style={styles.myCityText}>See artists in my city ({myCity})</Text>
          </PressableScale>
        )}
      </View>

      {city ? (
        <CityArtistList city={city} onOpenArtist={(id) => navigate(`/artist/${id}`)} />
      ) : (
        <EmptyState title="Find artists near you" message="Type your city or 6-digit pincode to see every artist there." iconName="location-outline" />
      )}
    </View>
  );
}

function CityArtistList({ city, onOpenArtist }: { city: string; onOpenArtist: (id: string) => void }) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useDiscovery({ city });
  const artists = data?.pages.flatMap((p) => p?.items ?? []) ?? [];
  const total = data?.pages[0]?.total ?? artists.length;

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <Spinner size="large" />
      </View>
    );
  }
  if (error) {
    return <EmptyState title="Could not load artists" message={getErrorMessage(error)} iconName="alert-circle-outline" iconColor="#C0392B" />;
  }
  if (artists.length === 0) {
    return <EmptyState title={`No artists in ${city} yet`} message="Try a nearby city or another pincode." iconName="search-outline" />;
  }
  return (
    <View style={styles.listContent}>
      <Text style={styles.countText}>
        {total} {total === 1 ? 'artist' : 'artists'} in {city}
      </Text>
      {/* Two to a row on the web column — the app's 168px card. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
        {artists.map((item) => (
          <div key={item.id} style={{ minWidth: 0 }}>
            <ArtistResultCard artist={item} onPress={() => onOpenArtist(item.id)} featured />
          </div>
        ))}
      </div>
      {hasNextPage && (
        <PressableScale onPress={() => fetchNextPage()} disabled={isFetchingNextPage} style={styles.moreBtn}>
          {isFetchingNextPage ? <Spinner /> : <Text style={styles.moreText}>Show more artists</Text>}
        </PressableScale>
      )}
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(215, 193, 195, 0.3)' },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18' },
  searchArea: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8, zIndex: 1 },
  searchBox: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.5)', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1e1b18' },
  dropdown: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.5)', borderRadius: 12, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f6eeeb', width: '100%' },
  suggestionText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1e1b18' },
  suggestionState: { fontFamily: 'Inter_400Regular', color: '#857374' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#C0392B' },
  resolvedText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#524344' },
  myCityChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 1, borderColor: '#884952', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  myCityText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#884952' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  listContent: { padding: 20, gap: 16, paddingBottom: 100 },
  countText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#524344', letterSpacing: 0.5 },
  moreBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF' },
  moreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952' },
});
