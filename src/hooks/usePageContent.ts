import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/api';
import { PageContent } from '@/types';

// Standalone editable block (e.g. the Learn with Annalia page banner). Same
// caching posture as useHomeLayout: edits are rare, and a stale banner beats a
// blank one.
export function usePageContent(slug: string) {
  return useQuery<PageContent | null, Error>({
    queryKey: ['content', slug],
    queryFn: () => contentApi.get(slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
