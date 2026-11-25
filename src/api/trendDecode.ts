import { api } from './client';
import { Paginated, TrendDecodeItem } from '@/types';

function normalizeTrendDecodeItem(raw: any): TrendDecodeItem {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    videoUrl: raw.videoUrl,
    thumbnailUrl: raw.thumbnailUrl,
    createdAt: raw.createdAt,
  };
}

// Same defensive shape-handling as reelsApi's fetchReelsPage — mirrors the
// same pagination/response envelope convention as the reels feed endpoints.
async function fetchTrendDecodePage(params: { page?: number; limit?: number }): Promise<Paginated<TrendDecodeItem>> {
  const res = await api.get<any>('/trend-decode', { params });
  const raw = res.data;
  const items = Array.isArray(raw?.trendDecodes)
    ? raw.trendDecodes
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
  return {
    items: items.map(normalizeTrendDecodeItem),
    page: raw?.page ?? params.page ?? 1,
    pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
    total: raw?.total ?? items.length,
  };
}

export const trendDecodeApi = {
  feed: (params: { page?: number; limit?: number }) => fetchTrendDecodePage(params),
};
