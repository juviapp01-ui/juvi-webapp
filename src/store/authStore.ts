import axios from 'axios';
import { create } from 'zustand';
import { ENV } from '@/config/env';
import { Role, User } from '@/types';
import { persist, Keys } from '@/utils/storage';

// Web version of the app's auth store (frontend/src/store/authStore.ts).
// localStorage is synchronous, so the state is read once at load — no
// separate hydrate step or splash screen needed.

const rememberRole = (user: User | null) => {
  if (user?.role) persist.set(Keys.LAST_ROLE, user.role);
};

const usable = (t: string | null) => !!t && t !== 'undefined' && t !== 'null';

const initial = () => {
  const access = persist.get<string>(Keys.ACCESS_TOKEN);
  const refresh = persist.get<string>(Keys.REFRESH_TOKEN);
  // Signed in while a refresh token exists — an expired access token is
  // renewed on the first request.
  if (!usable(access) && !usable(refresh)) return { user: null, isAuthenticated: false };
  return { user: persist.get<User>(Keys.USER), isAuthenticated: true };
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setSession: (tokens: { accessToken: string; refreshToken: string }, user: User | null) => void;
  setUser: (user: User) => void;
  setRole: (role: Role) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initial(),
  setSession: (tokens, user) => {
    persist.set(Keys.ACCESS_TOKEN, tokens.accessToken);
    persist.set(Keys.REFRESH_TOKEN, tokens.refreshToken);
    if (user) persist.set(Keys.USER, user);
    rememberRole(user);
    set({ user, isAuthenticated: !!user });
  },
  setUser: (user) => {
    persist.set(Keys.USER, user);
    rememberRole(user);
    set({ user, isAuthenticated: true });
  },
  setRole: (role) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, role };
    persist.set(Keys.USER, updated);
    rememberRole(updated);
    set({ user: updated });
  },
  logout: () => {
    // Ends this browser's session on the server as well. Best-effort.
    const refreshToken = persist.get<string>(Keys.REFRESH_TOKEN);
    if (refreshToken && ENV.API_URL) {
      axios.post(`${ENV.API_URL}/auth/logout`, { refreshToken }, { timeout: 10000 }).catch(() => {});
    }
    persist.remove(Keys.ACCESS_TOKEN);
    persist.remove(Keys.REFRESH_TOKEN);
    persist.remove(Keys.USER);
    set({ user: null, isAuthenticated: false });
  },
}));
