import { useQuery } from '@tanstack/react-query';
import { homeLayoutApi } from '@/api';
import { HomeLayoutSection } from '@/types';

// The home layout changes rarely (an admin edit, occasionally), so this is
// cached generously — a stale layout for a few minutes is far better than a
// blank Home while a request is in flight.
// The admin-managed service categories. Falls back to the app's bundled list
// only if the server can't be reached or has none set up yet.
export function useServiceCategories() {
  return useQuery<{ title: string; imageUrl: string | null }[], Error>({
    queryKey: ['service-categories'],
    queryFn: homeLayoutApi.categories,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useHomeLayout() {
  return useQuery<HomeLayoutSection[], Error>({
    queryKey: ['home', 'layout'],
    queryFn: homeLayoutApi.get,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Home must still render if this fails — the screen falls back to its
    // built-in defaults, so there's no point blocking on retries.
    retry: 1,
  });
}
