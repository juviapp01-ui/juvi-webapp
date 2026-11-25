import { api } from './client';
import { Paginated, Reel } from '@/types';

export interface CreateReelPayload {
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  durationSeconds?: number;
}

function normalizeReel(raw: any): Reel {
  if (!raw) return raw;
  const artistRaw = raw.artist ?? raw.artistProfile;
  const artist = artistRaw || raw.artistName || raw.artistPhotoUrl
    ? {
        id: artistRaw?.id ?? raw.artistId ?? '',
        // artist_profiles.userId (the users.id FK) — needed for report/block,
        // which operate on users.id rather than the artist_profiles.id above.
        userId: artistRaw?.userId ?? artistRaw?.user?.id ?? raw.artistUserId,
        name: artistRaw?.name ?? artistRaw?.user?.name ?? raw.artistName ?? 'Unknown Artist',
        photoUrl: artistRaw?.photoUrl ?? artistRaw?.user?.profileImage ?? raw.artistPhotoUrl,
        rating: artistRaw?.rating ?? raw.artistRating,
      }
    : undefined;

  return {
    id: raw.id,
    videoUrl: raw.videoUrl,
    thumbnailUrl: raw.thumbnailUrl,
    caption: raw.caption,
    durationSeconds: raw.durationSeconds ?? raw.duration,
    viewCount: raw.viewCount ?? raw.views ?? 0,
    createdAt: raw.createdAt,
    artistId: raw.artistId ?? artistRaw?.id,
    artist,
    isLiked: raw.isLiked ?? raw.liked ?? false,
    isSaved: raw.isSaved ?? raw.saved ?? false,
    likeCount: raw.likeCount ?? raw.likesCount ?? raw.likes ?? 0,
    saveCount: raw.saveCount ?? raw.savesCount ?? 0,
  };
}

// Same defensive shape-handling as artistsApi/bookingsApi — the live backend's
// exact envelope for these two new endpoints hasn't been battle-tested yet,
// so accept the common variants rather than assuming one exact shape.
async function fetchReelsPage(url: string, params: { page?: number; limit?: number }): Promise<Paginated<Reel>> {
  const res = await api.get<any>(url, { params });
  const raw = res.data;
  const items = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.reels)
      ? raw.reels
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
  return {
    items: items.map(normalizeReel),
    page: raw?.page ?? params.page ?? 1,
    pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
    total: raw?.total ?? items.length,
  };
}

export const reelsApi = {
  presignVideo: (contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string; requiredHeaders?: Record<string, string> }>(
      '/reels/presign-video',
      { contentType }
    ),
  presignThumbnail: (contentType: string) =>
    api.post<{ uploadUrl: string; fileUrl: string; requiredHeaders?: Record<string, string> }>(
      '/reels/presign-thumbnail',
      { contentType }
    ),
  create: async (payload: CreateReelPayload) => {
    const res = await api.post<any>('/reels', payload);
    res.data = normalizeReel(res.data?.reel ?? res.data?.data ?? res.data);
    return res as { data: Reel };
  },
  remove: (id: string) => api.delete(`/reels/${id}`),
  mine: (params: { page?: number; limit?: number }) => fetchReelsPage('/reels/mine', params),
  feed: (params: { page?: number; limit?: number }) => fetchReelsPage('/reels/feed', params),
  adminCurated: (params: { page?: number; limit?: number }) => fetchReelsPage('/reels/admin-curated', params),
  saved: (params: { page?: number; limit?: number }) => fetchReelsPage('/reels/saved', params),
  recordView: (id: string) => api.post(`/reels/${id}/view`),
  toggleLike: (id: string) => api.post(`/reels/${id}/like`),
  toggleSave: (id: string) => api.post(`/reels/${id}/save`),
};
