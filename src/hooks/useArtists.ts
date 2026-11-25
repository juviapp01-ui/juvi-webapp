import { useInfiniteQuery, useMutation, useQuery, InfiniteData } from '@tanstack/react-query';
import { artistsApi, DiscoveryParams } from '@/api';
import { Artist, Paginated } from '@/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useUIStore } from '@/store/uiStore';
import { getErrorMessage } from '@/utils/errors';

// Copied from the app's useArtists.ts.

export function useDiscovery(params: DiscoveryParams) {
  return useInfiniteQuery<Paginated<Artist>, Error, InfiniteData<Paginated<Artist>>, any[], number>({
    queryKey: ['artists', 'discovery', params],
    queryFn: ({ pageParam = 1 }) => artistsApi.discover({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Artist>) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

export function useArtist(id: string, coords?: { lat?: number; lng?: number }) {
  return useQuery<Artist>({
    // coords in the key so a location fix that arrives later re-fetches with
    // it (for the "may not travel to your area" notice).
    queryKey: ['artist', id, coords?.lat, coords?.lng],
    queryFn: () => artistsApi.getById(id, coords).then((r) => r.data),
    enabled: !!id,
  });
}

/** Follow/unfollow on the backend and in this browser (optimistic, rolls back with a toast on failure). */
export function useFollowArtist() {
  const add = useFavoritesStore((s) => s.add);
  const remove = useFavoritesStore((s) => s.remove);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async ({ id, follow }: { id: string; follow: boolean }) => {
      if (follow) {
        add(id);
        await artistsApi.follow(id);
      } else {
        remove(id);
        await artistsApi.unfollow(id);
      }
    },
    onError: (error, variables) => {
      if (variables.follow) remove(variables.id);
      else add(variables.id);
      showToast(getErrorMessage(error, 'Could not update follow status.'), 'error');
    },
  });
}
