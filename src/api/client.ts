import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '@/config/env';
import { persist, Keys } from '@/utils/storage';
import { useAuthStore } from '@/store/authStore';

// Same API client as the app (frontend/src/api/client.ts): bearer token on
// every request, single-flight refresh on 401, retry with the new token.

// What this client can show. The backend hides PDF lessons from clients that
// don't send it; the website will read them once courses come to the web.
export const CLIENT_FEATURES = 'pdf-lessons';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // A retry after a refresh carries the new token itself.
  const token =
    (config as InternalAxiosRequestConfig & { _accessToken?: string })._accessToken ??
    persist.get<string>(Keys.ACCESS_TOKEN);

  config.headers = { ...config.headers, 'X-Client-Features': CLIENT_FEATURES } as any;

  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` } as any;
  } else {
    // Never send "Bearer undefined"/"Bearer null" — omit the header entirely.
    if (config.headers) delete (config.headers as any).Authorization;
    (config as InternalAxiosRequestConfig & { _noAuthToken?: boolean })._noAuthToken = true;
  }
  return config;
});

// Single-flight token refresh: when several requests 401 at once, only one
// refresh call is made and every caller retries with the new token.
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = persist.get<string>(Keys.REFRESH_TOKEN);
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return null;
        }
        const { data } = await axios.post(`${ENV.API_URL}/auth/refresh-token`, { refreshToken });
        const newToken = data.accessToken || data.token || data.data?.accessToken || data.data?.token;
        const newRefresh = data.refreshToken || data.data?.refreshToken;
        if (!newToken) throw new Error('Invalid refresh response shape');
        persist.set(Keys.ACCESS_TOKEN, newToken);
        if (newRefresh) persist.set(Keys.REFRESH_TOKEN, newRefresh);
        return newToken as string;
      } catch (e) {
        // Sign out only when the server says the session is over (401). No
        // network, a timeout or a server error keeps the user signed in.
        if ((e as AxiosError)?.response?.status === 401) useAuthStore.getState().logout();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _noAuthToken?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        (original as InternalAxiosRequestConfig & { _accessToken?: string })._accessToken = newToken;
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` } as any;
        return api(original);
      }
      if (original._noAuthToken) {
        return Promise.reject(
          Object.assign(new Error('No auth token was available for this request.'), { code: 'NO_AUTH_TOKEN' })
        );
      }
    }
    return Promise.reject(error);
  }
);
