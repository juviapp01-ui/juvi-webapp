import { useEffect, useRef, useState } from 'react';
import { placesApi, PlaceSuggestion } from '@/api';
import { sheet } from '@/lib/rn';
import { PressableScale, Spinner, Text, View } from './primitives';

// Port of the app's CitySearchInput: types a city, suggestions come from the
// backend (/places/autocomplete, which holds the Google key server-side),
// picking one fills city + state.
interface Props {
  label?: string;
  city: string;
  state: string;
  onChange: (city: string, state: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CitySearchInput({ label = 'CITY', city, state, onChange, placeholder = 'Search your city', autoFocus }: Props) {
  const [query, setQuery] = useState(city);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQuery((prev) => (prev === city ? prev : city));
  }, [city]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (text !== city) onChange('', '');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await placesApi.autocomplete(text.trim());
        if (requestId !== requestIdRef.current) return;
        setSuggestions(data.results);
        setShowDropdown(true);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 350);
  };

  const select = (s: PlaceSuggestion) => {
    setQuery(s.city);
    onChange(s.city, s.state);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <input
          className="rn-input"
          value={query}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          style={styles.textInput}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          autoComplete="address-level2"
          autoFocus={autoFocus}
          aria-label={label}
        />
        {loading && <span style={{ marginLeft: 8 }}><Spinner /></span>}
      </View>
      {!!state && !!city && query === city && <Text style={styles.stateHint}>{state}</Text>}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <PressableScale key={s.placeId} onPress={() => select(s)} style={styles.suggestionItem}>
              <Text style={styles.suggestionCity}>{s.city}</Text>
              <Text style={styles.suggestionState}>{s.state}</Text>
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = sheet({
  container: { marginBottom: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', borderRadius: 12, paddingHorizontal: 16 },
  textInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: 'HankenGrotesk_400Regular', color: '#1e1b18' },
  stateHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374', marginTop: 6 },
  dropdown: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', borderRadius: 12, marginTop: 8, maxHeight: 220, overflowY: 'auto' },
  suggestionItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#fff8f5', width: '100%' },
  suggestionCity: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: '#1e1b18' },
  suggestionState: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#857374', marginTop: 2 },
});
