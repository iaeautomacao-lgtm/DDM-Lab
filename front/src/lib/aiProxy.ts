import { supabase } from './supabaseClient';

// Client-side helpers that route every AI call through our server-side proxies
// (/api/openai, /api/gemini) instead of hitting the providers directly. The
// provider keys never reach the browser anymore — the proxy injects them and
// authorizes the caller via the Supabase session token below.
//
// Local dev / self-host: set VITE_API_BASE to the origin that serves these
// proxy routes when the React app is served from a different port or host.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';

const getAuthHeader = async (): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessao expirada. Entre novamente para usar a IA.');
  return `Bearer ${token}`;
};

export const openaiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    'x-openai-path': path,
    Authorization: await getAuthHeader(),
  };
  return fetch(`${API_BASE}/api/openai`, { ...init, headers });
};

export const geminiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    'x-gemini-path': path,
    Authorization: await getAuthHeader(),
  };
  return fetch(`${API_BASE}/api/gemini`, { ...init, headers });
};
