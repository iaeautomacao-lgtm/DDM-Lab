import { supabase } from './supabaseClient';

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
  const ext = file.name.split('.').pop() || '';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('rh-arquivos')
    .upload(safeName, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`);

  const { data } = supabase.storage.from('rh-arquivos').getPublicUrl(safeName);

  return {
    nome: file.name,
    url: data.publicUrl,
    tipo: file.type.startsWith('image/') ? 'image' : 'document',
  };
};

export const updateInformativo = async (
  id: string,
  updates: { titulo?: string; conteudo?: string },
): Promise<void> => {
  const { error } = await supabase.from('rh_informativos').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
};

export const addResposta = async (
  informativo_id: string,
  conteudo: string,
  autor_nome: string,
): Promise<Resposta> => {
  const { data: current, error: fetchError } = await supabase
    .from('rh_informativos')
    .select('respostas')
    .eq('id', informativo_id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nova: Resposta = {
    id: crypto.randomUUID(),
    conteudo,
    autor_nome,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('rh_informativos')
    .update({ respostas: [...(current.respostas || []), nova] })
    .eq('id', informativo_id);
  if (error) throw new Error(error.message);

  return nova;
};

export const deleteResposta = async (
  informativo_id: string,
  resposta_id: string,
  respostas_atuais: Resposta[],
): Promise<void> => {
  const { error } = await supabase
    .from('rh_informativos')
    .update({ respostas: respostas_atuais.filter((r) => r.id !== resposta_id) })
    .eq('id', informativo_id);
  if (error) throw new Error(error.message);
};

export const getInformativos = async (): Promise<Informativo[]> => {
  const { data, error } = await supabase
    .from('rh_informativos')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((d) => ({ ...d, anexos: d.anexos || [], respostas: d.respostas || [] }));
};

export const getAllInformativos = async (): Promise<Informativo[]> => {
  const { data, error } = await supabase
    .from('rh_informativos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((d) => ({ ...d, anexos: d.anexos || [], respostas: d.respostas || [] }));
};

export const createInformativo = async (
  titulo: string,
  conteudo: string,
  autor_nome: string,
  anexos: Anexo[] = [],
): Promise<Informativo> => {
  const { data, error } = await supabase
    .from('rh_informativos')
    .insert({ titulo, conteudo, autor_nome, anexos })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...data, anexos: data.anexos || [], respostas: data.respostas || [] };
};

export const deactivateInformativo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('rh_informativos')
    .update({ ativo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
};

export const reactivateInformativo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('rh_informativos')
    .update({ ativo: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
};

export const markAsViewed = async (
  informativo_id: string,
  user_uid: string,
  user_nome: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from('rh_visualizacoes')
    .upsert({ informativo_id, user_uid, user_nome }, { onConflict: 'informativo_id,user_uid' });
  if (error) throw new Error(error.message);
};

export const getViewedIds = async (user_uid: string): Promise<string[]> => {
  const { data } = await supabase
    .from('rh_visualizacoes')
    .select('informativo_id')
    .eq('user_uid', user_uid);
  return (data || []).map((v) => v.informativo_id);
};

export const getVisualizacoes = async (informativo_id: string): Promise<Visualizacao[]> => {
  const { data, error } = await supabase
    .from('rh_visualizacoes')
    .select('*')
    .eq('informativo_id', informativo_id)
    .order('viewed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const getViewCountsForIds = async (ids: string[]): Promise<Record<string, number>> => {
  if (!ids.length) return {};
  const { data } = await supabase
    .from('rh_visualizacoes')
    .select('informativo_id')
    .in('informativo_id', ids);
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.informativo_id] = (counts[row.informativo_id] || 0) + 1;
  }
  return counts;
};
