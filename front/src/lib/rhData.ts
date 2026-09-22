import { api } from './apiClient';

export interface Resposta {
  id: string;
  conteudo: string;
  autor_nome: string;
  created_at: string;
}

export interface Anexo {
  nome: string;
  url: string;
  tipo: 'image' | 'document';
}

export interface Informativo {
  id: string;
  titulo: string;
  conteudo: string;
  autor_nome: string;
  created_at: string;
  ativo: boolean;
  anexos: Anexo[];
  respostas: Resposta[];
}

export interface Visualizacao {
  id: string;
  informativo_id: string;
  user_uid: string;
  user_nome: string | null;
  viewed_at: string;
}

export const uploadAnexo = async (file: File): Promise<Anexo> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<Anexo>('/rh/anexos', form);
};

export const updateInformativo = async (id: string, updates: { titulo?: string; conteudo?: string }): Promise<void> => {
  await api.patch(`/rh/informativos/${id}`, updates);
};

export const addResposta = async (informativo_id: string, conteudo: string, autor_nome: string): Promise<Resposta> => {
  const { resposta } = await api.post<{ resposta: Resposta }>(`/rh/informativos/${informativo_id}/respostas`, {
    conteudo,
    autorNome: autor_nome,
  });
  return resposta;
};

// terceiro parametro mantido por compatibilidade com o call site em
// RHBalloon.tsx — o servidor agora le a lista atual direto do banco.
export const deleteResposta = async (
  informativo_id: string,
  resposta_id: string,
  _respostas_atuais?: Resposta[],
): Promise<void> => {
  await api.delete(`/rh/informativos/${informativo_id}/respostas/${resposta_id}`);
};

export const getInformativos = async (): Promise<Informativo[]> => {
  const { informativos } = await api.get<{ informativos: Informativo[] }>('/rh/informativos');
  return informativos;
};

export const getAllInformativos = async (): Promise<Informativo[]> => {
  const { informativos } = await api.get<{ informativos: Informativo[] }>('/rh/informativos/all');
  return informativos;
};

export const createInformativo = async (
  titulo: string,
  conteudo: string,
  autor_nome: string,
  anexos: Anexo[] = [],
): Promise<Informativo> => {
  const { informativo } = await api.post<{ informativo: Informativo }>('/rh/informativos', {
    titulo,
    conteudo,
    autorNome: autor_nome,
    anexos,
  });
  return informativo;
};

export const deactivateInformativo = async (id: string): Promise<void> => {
  await api.post(`/rh/informativos/${id}/deactivate`);
};

export const reactivateInformativo = async (id: string): Promise<void> => {
  await api.post(`/rh/informativos/${id}/reactivate`);
};

export const markAsViewed = async (informativo_id: string, _user_uid: string, user_nome: string | null): Promise<void> => {
  await api.post(`/rh/informativos/${informativo_id}/viewed`, { userNome: user_nome });
};

export const getViewedIds = async (_user_uid: string): Promise<string[]> => {
  const { ids } = await api.get<{ ids: string[] }>('/rh/informativos/viewed-ids');
  return ids;
};

export const getVisualizacoes = async (informativo_id: string): Promise<Visualizacao[]> => {
  const { visualizacoes } = await api.get<{ visualizacoes: Visualizacao[] }>(`/rh/informativos/${informativo_id}/visualizacoes`);
  return visualizacoes;
};

export const getViewCountsForIds = async (ids: string[]): Promise<Record<string, number>> => {
  if (!ids.length) return {};
  const { counts } = await api.post<{ counts: Record<string, number> }>('/rh/informativos/view-counts', { ids });
  return counts;
};
