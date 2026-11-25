import { create } from 'zustand';
import { persist, Keys } from '@/utils/storage';

// Followed ("hearted") artists, remembered on this browser — same as the
// app's favoritesStore. The follow itself is saved on the backend too.
interface FavoritesState {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: persist.get<string[]>(Keys.FAVORITE_ARTIST_IDS) ?? [],
  add: (id) => {
    const ids = Array.from(new Set([...get().ids, id]));
    persist.set(Keys.FAVORITE_ARTIST_IDS, ids);
    set({ ids });
  },
  remove: (id) => {
    const ids = get().ids.filter((x) => x !== id);
    persist.set(Keys.FAVORITE_ARTIST_IDS, ids);
    set({ ids });
  },
}));
