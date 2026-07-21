import { supabase } from './supabaseClient';

export type SugestaoStatus = 'pendente' | 'lida' | 'arquivada';

export interface Sugestao {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  content: string;
  categoria: string | null;
  status: SugestaoStatus;
  created_at: string;
}

export const submitSugestao = async (
  userId: string,
  userEmail: string,
  userName: string,
  content: string,
  categoria: string = 'outro',
): Promise<void> => {
  const { error } = await supabase.from('sugestoes').insert({
    user_id: userId,
    user_email: userEmail,
    user_name: userName,
    content,
    categoria,
    status: 'pendente',
  });

  if (error) throw error;
};

export const fetchAllSugestoes = async (): Promise<Sugestao[]> => {
  const { data, error } = await supabase
    .from('sugestoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: String(row.id),
    user_id: row.user_id ?? null,
    user_email: row.user_email ?? null,
    user_name: row.user_name ?? null,
    content: String(row.content),
    categoria: row.categoria ?? null,
    status: (row.status as SugestaoStatus) ?? 'pendente',
    created_at: String(row.created_at),
  }));
};

export const updateSugestaoStatus = async (
  id: string,
  status: SugestaoStatus,
): Promise<void> => {
  const { error } = await supabase
    .from('sugestoes')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
};
