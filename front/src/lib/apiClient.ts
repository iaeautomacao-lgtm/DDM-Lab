// Substitui o cliente Supabase. Fala com a API propria (server/routes.js) via
// cookies httpOnly — nenhum token fica acessivel a JavaScript no navegador.
//
// Local dev / self-host: VITE_API_BASE aponta para a origem que serve /api
// quando o React roda em porta diferente do Express.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

interface RequestOptions extends RequestInit {
  /** Reenvia automaticamente apos um refresh de sessao bem-sucedido em caso de 401. Default: true. */
  retryOn401?: boolean;
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { retryOn401 = true, headers, ...init } = options;
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  });

  if (res.status === 401 && retryOn401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, retryOn401: false });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.message || `Erro na requisicao (${res.status}).`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
};

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
