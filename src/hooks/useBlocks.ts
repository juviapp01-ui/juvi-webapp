import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blocksApi } from '@/api';
import { BlockedUser } from '@/api/blocks';

export function useBlockedUsers() {
  return useQuery<BlockedUser[]>({
    queryKey: ['blocks'],
    queryFn: () => blocksApi.list().then((r) => r.data),
  });
}

// The backend filters blocked users' content server-side going forward, but
// every list already sitting in cache (reels feed/saved, Explore's discovery
// grid, both search screens, and the artist's own detail query) was fetched
// before the block took effect — invalidate all of them so the blocked
// user's content disappears immediately instead of on next app restart.
function invalidateContentCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['blocks'] });
  qc.invalidateQueries({ queryKey: ['reels'] });
  qc.invalidateQueries({ queryKey: ['artists'] });
  qc.invalidateQueries({ queryKey: ['artist'] });
  qc.invalidateQueries({ queryKey: ['search'] });
  qc.invalidateQueries({ queryKey: ['home-search'] });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksApi.block(userId),
    onSuccess: () => invalidateContentCaches(qc),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksApi.unblock(userId),
    onSuccess: () => invalidateContentCaches(qc),
  });
}
