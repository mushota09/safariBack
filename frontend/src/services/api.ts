/**
 * Couche d'accès HTTP centralisée pour le backend FastAPI Safari.
 *
 * - Gère automatiquement le token JWT (localStorage).
 * - Sérialise/désérialise le JSON.
 * - Remonte les erreurs `HTTPException` du backend dans un format exploitable.
 */

const ENV_API_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL: string = (ENV_API_BASE && ENV_API_BASE.replace(/\/$/, '')) || 'http://localhost:8000';

const ACCESS_KEY = 'safari_access_token';
const REFRESH_KEY = 'safari_refresh_token';
const USER_KEY = 'safari_current_user';
const ADMIN_API_KEY_KEY = 'safari_admin_api_key';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ADMIN_API_KEY_KEY);
  },
  getUser<T = any>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
  setUser(user: any) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getAdminApiKey(): string {
    return localStorage.getItem(ADMIN_API_KEY_KEY) || 'admin_api_key_changez_moi';
  },
  setAdminApiKey(key: string) {
    localStorage.setItem(ADMIN_API_KEY_KEY, key);
  },
};

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    super(typeof detail === 'string' ? detail : (detail?.detail || `HTTP ${status}`));
    this.status = status;
    this.detail = detail;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  query?: Record<string, any>;
  auth?: boolean;
  adminApiKey?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, any>): string {
  const base = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  if (!query) return base;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.append(k, String(v));
  });
  const queryStr = qs.toString();
  return queryStr ? `${base}${base.includes('?') ? '&' : '?'}${queryStr}` : base;
}

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, adminApiKey = false, headers = {}, signal } = options;
  const url = buildUrl(path, query);

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (auth) {
    const token = tokenStorage.getAccess();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (adminApiKey) {
    finalHeaders['X-API-Key'] = tokenStorage.getAdminApiKey();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err: any) {
    throw new ApiError(0, `Network error: ${err?.message || err}`);
  }

  // Gestion automatique du rafraîchissement JWT en cas de 401
  if (res.status === 401 && auth && tokenStorage.getRefresh()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      finalHeaders['Authorization'] = `Bearer ${tokenStorage.getAccess()}`;
      res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    }
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refresh = tokenStorage.getRefresh();
      if (!refresh) return false;
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        tokenStorage.clear();
        return false;
      }
      const data = await res.json();
      tokenStorage.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      tokenStorage.clear();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Raccourcis HTTP
export const api = {
  get: <T = any>(path: string, opts: Omit<ApiOptions, 'method' | 'body'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, body?: any, opts: Omit<ApiOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  put: <T = any>(path: string, body?: any, opts: Omit<ApiOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T = any>(path: string, body?: any, opts: Omit<ApiOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T = any>(path: string, opts: Omit<ApiOptions, 'method' | 'body'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};
