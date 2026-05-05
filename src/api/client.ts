import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

/// All HTTP traffic goes through this client. Vite dev server proxies `/api`
/// to the NestJS backend on :3000 (see vite.config.ts). In production the
/// reverse proxy / CDN will need the same prefix wiring.
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/// On 401 we attempt a single refresh. If the refresh itself fails the user
/// is signed out. Multiple in-flight 401s share the same refresh promise.
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    if (
      err.response?.status !== 401 ||
      !original ||
      original._retried ||
      original.url?.includes('/auth/')
    ) {
      throw err;
    }
    original._retried = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clear();
      throw err;
    }

    try {
      refreshPromise ??= (async () => {
        const r = await axios.post<{ accessToken: string; refreshToken: string }>(
          '/api/auth/refresh',
          { refreshToken },
        );
        useAuthStore
          .getState()
          .setTokens(r.data.accessToken, r.data.refreshToken);
        return r.data.accessToken;
      })();
      const fresh = await refreshPromise;
      original.headers.set('Authorization', `Bearer ${fresh}`);
      return api(original);
    } catch (refreshErr) {
      useAuthStore.getState().clear();
      throw refreshErr;
    } finally {
      refreshPromise = null;
    }
  },
);
