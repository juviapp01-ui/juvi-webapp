import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { reelsApi } from '@/api';
import { Paginated, Reel } from '@/types';

// The reel hooks the website uses so far — copied from the app's useReels.ts.

const nextPage = (last: Paginated<Reel>) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined);

export function useReelsFeed() {
  return useInfiniteQuery<Paginated<Reel>, Error, InfiniteData<Paginated<Reel>>, any[], number>({
    queryKey: ['reels', 'feed'],
    queryFn: ({ pageParam = 1 }) => reelsApi.feed({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useSavedReels(enabled = true) {
  return useInfiniteQuery<Paginated<Reel>, Error, InfiniteData<Paginated<Reel>>, any[], number>({
    queryKey: ['reels', 'saved'],
    queryFn: ({ pageParam = 1 }) => reelsApi.saved({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });
}

// A reel can be cached under several lists at once, so a save toggle flips
// it everywhere it appears.
function flipReelInCaches(qc: ReturnType<typeof useQueryClient>, id: string, flip: (reel: Reel) => Reel) {
  const matches = qc.getQueriesData<InfiniteData<Paginated<Reel>>>({ queryKey: ['reels'] });
  matches.forEach(([key, data]) => {
    if (!data) return;
    qc.setQueryData<InfiniteData<Paginated<Reel>>>(key, {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: page.items.map((r) => (r.id === id ? flip(r) : r)) })),
    });
  });
  return matches;
}

export function useRecordReelView() {
  return useMutation({ mutationFn: (id: string) => reelsApi.recordView(id) });
}

export function useToggleReelLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reelsApi.toggleLike(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['reels'] });
      const previous = flipReelInCaches(qc, id, (r) => ({
        ...r,
        isLiked: !r.isLiked,
        likeCount: Math.max(0, (r.likeCount ?? 0) + (r.isLiked ? -1 : 1)),
      }));
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
  });
}

export function useToggleReelSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reelsApi.toggleSave(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['reels'] });
      const previous = flipReelInCaches(qc, id, (r) => ({
        ...r,
        isSaved: !r.isSaved,
        saveCount: Math.max(0, (r.saveCount ?? 0) + (r.isSaved ? -1 : 1)),
      }));
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reels', 'saved'] }),
  });
}

// The artist's own reels (partner area).
export function useMyReels() {
  return useInfiniteQuery<Paginated<Reel>, Error, InfiniteData<Paginated<Reel>>, any[], number>({
    queryKey: ['reels', 'mine'],
    queryFn: ({ pageParam = 1 }) => reelsApi.mine({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

export function useDeleteReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reelsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reels', 'mine'] }),
  });
}
