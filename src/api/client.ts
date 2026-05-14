import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

/// Resolve the backend base URL.
/// - Dev (no env): `/api` so Vite's proxy hits the local NestJS on :3000.
/// - Prod (Vercel): set `VITE_API_BASE_URL=https://bikebeach-api-production.up.railway.app`
///   in the Vercel project; Vite inlines it at build time.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = RAW_BASE && RAW_BASE.length > 0 ? RAW_BASE : '/api';

/// Returns the resolved API base URL — exposed so non-axios callers (e.g.
/// raw `fetch` for multipart uploads where the instance default
/// `Content-Type: application/json` would fight the multipart boundary) can
/// build URLs that match what the axios instance hits.
export function apiBaseUrl(): string {
  return BASE_URL;
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/// Resolves a static-asset path returned by the API (e.g. `/uploads/...`) to
/// a fully-qualified URL.
/// - In dev (`/api` base) → returns the path as-is; Vite's `/uploads` proxy
///   forwards to the backend.
/// - In prod (full base URL like `https://bikebeach-api-production.up.railway.app`)
///   → strips the `/api` segment if present and prefixes the asset path with
///   the API origin so the browser can fetch it directly.
export function assetUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  // Local dev — Vite proxies /uploads transparently.
  if (BASE_URL === '/api') return relativePath;
  // Prod — use the API origin (without the `/api` suffix if it's there).
  try {
    const url = new URL(BASE_URL);
    return `${url.origin}${relativePath}`;
  } catch {
    return relativePath;
  }
}

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
        // Use the same base URL as the main client — refresh has to hit the
        // backend directly (we can't recurse through `api` since that would
        // loop on its own 401 interceptor).
        const r = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${BASE_URL}/auth/refresh`,
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
