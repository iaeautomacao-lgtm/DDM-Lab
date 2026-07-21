import { createClient } from '@supabase/supabase-js';

const normalizeEnvValue = (value: string | undefined) => value?.trim().replace(/^['"]|['"]$/g, '') || '';

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

if (!supabaseUrl || !isValidHttpUrl(supabaseUrl)) {
  throw new Error(
    'VITE_SUPABASE_URL esta ausente ou invalida. Verifique a env no servidor ou em backend/.env.local sem aspas e com https:// completo.',
  );
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY esta ausente ou invalida. Verifique a env no servidor ou em backend/.env.local.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
