import { useCallback, useEffect, useState } from 'react';
import { ENV } from '@/config/env';

// Browser version of the app's useDeviceLocation (expo-location).
// Coordinates come from the browser's geolocation (asks permission, needs
// https or localhost). The place name needs a geocoder: the app uses the
// phone's own, a browser has none, so it's looked up with Google's Geocoding
// API only when VITE_GOOGLE_MAPS_KEY is set — otherwise the header shows
// "Near You", exactly as the app does when its lookup fails.

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

type Coords = { lat: number; lng: number };

// One lookup per page load, shared by every screen that asks.
let cached: { coords: Coords; place: string | null } | null = null;

async function placeName({ lat, lng }: Coords): Promise<string | null> {
  if (!ENV.GOOGLE_MAPS_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|administrative_area_level_3&key=${encodeURIComponent(ENV.GOOGLE_MAPS_KEY)}`;
    const res = await fetch(url);
    const data = await res.json();
    const parts: { long_name: string; types: string[] }[] = data?.results?.[0]?.address_components ?? [];
    const pick = (type: string) => parts.find((p) => p.types.includes(type))?.long_name;
    // Same preference as the app: the district/locality over the state.
    return pick('locality') || pick('administrative_area_level_3') || pick('administrative_area_level_2') || null;
  } catch {
    return null;
  }
}

export function useDeviceLocation() {
  const [status, setStatus] = useState<LocationStatus>(cached ? 'granted' : 'idle');
  const [coords, setCoords] = useState<Coords | null>(cached?.coords ?? null);
  const [place, setPlace] = useState<string | null>(cached?.place ?? null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(next);
        setStatus('granted');
        const name = await placeName(next);
        setPlace(name);
        cached = { coords: next, place: name };
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (!cached) requestLocation();
  }, [requestLocation]);

  return { status, coords, place, requestLocation };
}
