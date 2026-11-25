import { api } from './client';
import { Artist, Paginated, PortfolioItem, Service } from '@/types';

export interface DiscoveryParams {
  lat?: number;
  lng?: number;
  city?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface SearchParams {
  q: string;
  city?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

// The live backend replies with { success, page, limit, total, artists }
// instead of the { items, page, pageSize, total } shape the app expects,
// so normalize it here rather than at every call site.
function normalizePaginated<T>(raw: any, fallbackPage: number): Paginated<T> {
  const items = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.artists)
      ? raw.artists
      : [];
      
  const mappedItems = items.map((item: any) => {
    if (item && typeof item === 'object' && (item.user || item.services || item.userId)) {
      return {
        ...item,
        name: item.name || item.user?.name,
        userId: item.userId ?? item.user?.id,
        photoUrl: item.photoUrl || item.user?.profileImage,
        services: Array.isArray(item.services) ? item.services.map((s: any) => ({
          ...s,
          title: s.title || s.name,
          durationMin: s.durationMin || s.duration
        })) : []
      };
    }
    return item;
  });

  return {
    items: mappedItems as unknown as T[],
    page: raw?.page ?? fallbackPage,
    pageSize: raw?.pageSize ?? raw?.limit ?? items.length,
    total: raw?.total ?? items.length,
  };
}

async function fetchPaginated<T>(url: string, params: { page?: number }): Promise<Paginated<T>> {
  const res = await api.get(url, { params });
  return normalizePaginated<T>(res.data, params.page ?? 1);
}

// Confirmed shape: { success, artistProfile: { user: {...}, services, portfolioItems } } —
// everything lives under the artistProfile wrapper, not at the response root.
// Shared by getById and getMyProfile since both endpoints return the same envelope.
function normalizeArtistDetail(raw: any): any {
  const item = raw?.artistProfile;
  if (!item || typeof item !== 'object') return item;

  const portfolio = Array.isArray(item.portfolioItems)
    ? item.portfolioItems.map((p: any) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        caption: p.caption,
        order: p.order,
        category: p.category ?? null,
        isApproved: p.isApproved,
      }))
    : [];

  return {
    ...item,
    name: item.name || item.user?.name,
    userId: item.userId ?? item.user?.id,
    email: item.email || item.user?.email,
    phone: item.phone || item.user?.phone,
    photoUrl: item.user?.profileImage,
    portfolio,
    services: Array.isArray(item.services) ? item.services.map((s: any) => ({
      ...s,
      title: s.title || s.name,
      durationMin: s.durationMin || s.duration
    })) : []
  };
}

export const artistsApi = {
  discover: (params: DiscoveryParams) => fetchPaginated<Artist>('/discovery', params),
  search: (params: SearchParams) => fetchPaginated<Artist>('/search', params),
  // Editorial picks first, then whoever the numbers favour. Not
  // distance-filtered — see the backend.
  trending: (limit = 10) =>
    api.get<{ success: boolean; artists: Artist[] }>('/discovery/trending', { params: { limit } }),
  // lat/lng (the customer's own location, if known) let the backend compute
  // distanceKm/inReach for this specific artist — same reach check discovery
  // uses, just for one artist instead of filtering a whole feed.
  getById: async (id: string, coords?: { lat?: number; lng?: number }) => {
    const res = await api.get<any>(`/artist/${id}`, { params: coords });
    res.data = normalizeArtistDetail(res.data);
    return res as { data: Artist };
  },
  // Own artist profile, used to prefill the onboarding-as-edit-profile flow
  // for already-onboarded artists — same envelope shape as getById.
  getMyProfile: async () => {
    const res = await api.get<any>('/artist/profile');
    res.data = normalizeArtistDetail(res.data);
    return res as { data: any };
  },
  services: async (id: string) => {
    const res = await api.get<any>(`/services/artist/${id}`);
    const data = res.data;
    let servicesList = Array.isArray(data) ? data : (Array.isArray(data?.services) ? data.services : (Array.isArray(data?.data) ? data.data : []));
    res.data = servicesList.map((s: any) => ({
      ...s,
      title: s.title || s.name,
      durationMin: s.durationMin || s.duration
    }));
    return res as { data: Service[] };
  },
  // Existing portfolio images for an artist, used to prefill the
  // onboarding-as-edit-portfolio flow for already-onboarded artists.
  portfolio: async (id: string) => {
    const res = await api.get<any>(`/portfolio/artist/${id}`);
    const data = res.data;
    const rawItems = Array.isArray(data) ? data : (Array.isArray(data?.portfolioItems) ? data.portfolioItems : (Array.isArray(data?.data) ? data.data : []));
    res.data = rawItems.map((p: any) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      order: p.order,
      category: p.category ?? null,
    }));
    return res as { data: PortfolioItem[] };
  },
  follow: (id: string) => api.post(`/follow/${id}`),
  unfollow: (id: string) => api.delete(`/follow/${id}`),
  updateProfile: (payload: {
    bio?: string;
    title?: string;
    maxTravelDistance?: number;
    isAvailable?: boolean;
    studioAddress?: string | null;
    latitude?: number;
    longitude?: number;
    offersHomeService?: boolean;
  }) => api.put('/artist/profile', payload),
};
