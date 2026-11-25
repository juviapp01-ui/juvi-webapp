import { api } from './client';
import { HOME_SECTION_SLUGS, HomeLayoutSection, HomeSectionSlug } from '@/types';

// Taken from the shared list rather than repeated here. A local copy went
// stale the moment the screen learned to render more sections, and silently
// filtered six of them out of every response.
const KNOWN_SLUGS: readonly string[] = HOME_SECTION_SLUGS;

// Drops sections this build doesn't know how to render. Lets the backend add a
// new section type without crashing older app versions still in the wild —
// they just ignore it until they update.
function normalizeSections(raw: any): HomeLayoutSection[] {
  const list = Array.isArray(raw?.sections) ? raw.sections : Array.isArray(raw) ? raw : [];
  return list
    .filter((s: any) => KNOWN_SLUGS.includes(s?.slug))
    .map((s: any) => ({
      slug: s.slug as HomeSectionSlug,
      order: typeof s.order === 'number' ? s.order : 0,
      data: s.data ?? null,
    }))
    .sort((a: HomeLayoutSection, b: HomeLayoutSection) => a.order - b.order);
}

export const homeLayoutApi = {
  get: async (): Promise<HomeLayoutSection[]> => {
    const res = await api.get<any>('/home-layout');
    return normalizeSections(res.data);
  },
  // The service categories — the category tiles admins manage, in Home order.
  // What the artist's service form offers.
  categories: async (): Promise<{ title: string; imageUrl: string | null }[]> => {
    const res = await api.get<any>('/home-layout/categories');
    return Array.isArray(res.data?.categories) ? res.data.categories : [];
  },
};
