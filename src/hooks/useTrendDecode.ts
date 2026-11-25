import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { trendDecodeApi } from '@/api';
import { Paginated, TrendDecodeItem } from '@/types';

export function useTrendDecodeFeed() {
  return useInfiniteQuery<Paginated<TrendDecodeItem>, Error, InfiniteData<Paginated<TrendDecodeItem>>, any[], number>({
    queryKey: ['trendDecode', 'feed'],
    queryFn: ({ pageParam = 1 }) => trendDecodeApi.feed({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}
