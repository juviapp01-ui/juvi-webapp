import { api } from './client';
import { HomeFeatureItem, PageContent } from '@/types';

function normalizeItems(raw: any): HomeFeatureItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i && typeof i.title === 'string' && i.title.length > 0)
    .map((i) => ({
      icon: typeof i.icon === 'string' ? i.icon : null,
      title: i.title,
      subtitle: typeof i.subtitle === 'string' ? i.subtitle : null,
    }));
}

export const contentApi = {
  // Resolves to null when the block hasn't been seeded — callers fall back to
  // their built-in defaults rather than rendering an empty banner.
  get: async (slug: string): Promise<PageContent | null> => {
    const res = await api.get<any>(`/content/${slug}`);
    const raw = res.data?.content;
    if (!raw) return null;
    return {
      slug: raw.slug ?? slug,
      imageUrl: raw.imageUrl ?? null,
      heading: raw.heading ?? null,
      subtitle: raw.subtitle ?? null,
      body: raw.body ?? null,
      ctaText: raw.ctaText ?? null,
      mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls : [],
      items: normalizeItems(raw.items),
    };
  },
};
