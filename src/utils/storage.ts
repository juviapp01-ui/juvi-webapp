// Web counterpart of the app's SecureStore wrapper (frontend/src/utils/storage.ts):
// same keys, same get/set/remove shape, backed by localStorage. Synchronous
// in the browser, so there's no boot-time hydration step to get wrong.
//
// localStorage is readable by any script on the page — fine for a site that
// loads no third-party script beyond Firebase/Google, but it's why nothing
// else (no secrets) is ever stored here.

export const Keys = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  FAVORITE_ARTIST_IDS: 'favoriteArtistIds',
  // Outlives a logout on purpose: lets the login screen skip the
  // Customer/Partner choice for someone already approved as an artist.
  LAST_ROLE: 'lastRole',
} as const;

const PREFIX = 'juvi.';

export const persist = {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Private mode / storage full: the session just won't survive a reload.
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
