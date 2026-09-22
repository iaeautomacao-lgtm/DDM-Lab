// Client-side helpers that route every AI call through our server-side proxies
// (/api/openai, /api/gemini) instead of hitting the providers directly. The
// provider keys never reach the browser — the proxy injects them and
// autoriza o chamador pelo cookie httpOnly de sessao (nao mais um token
// Supabase enviado a mao).
//
// Local dev / self-host: set VITE_API_BASE to the origin that serves these
// proxy routes when the React app is served from a different port or host.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';

export const openaiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    'x-openai-path': path,
  };
  return fetch(`${API_BASE}/api/openai`, { ...init, headers, credentials: 'include' });
};

export const geminiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    'x-gemini-path': path,
  };
  return fetch(`${API_BASE}/api/gemini`, { ...init, headers, credentials: 'include' });
};
