import { api } from './apiClient';

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
  _userId: string,
  _userEmail: string,
  _userName: string,
  content: string,
  categoria: string = 'outro',
): Promise<void> => {
  await api.post('/sugestoes', { content, categoria });
};

export const fetchAllSugestoes = async (): Promise<Sugestao[]> => {
  const { sugestoes } = await api.get<{ sugestoes: Sugestao[] }>('/sugestoes');
  return sugestoes;
};

export const updateSugestaoStatus = async (id: string, status: SugestaoStatus): Promise<void> => {
  await api.patch(`/sugestoes/${id}`, { status });
};
