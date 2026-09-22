import { supabase } from './supabaseClient';
import { openaiFetch } from './aiProxy';

const VS_BETA_HEADER = { 'OpenAI-Beta': 'assistants=v2' };

export interface KBDoc {
  id: string;
  file_name: string;
  openai_file_id: string;
  size_bytes: number | null;
  created_at: string;
}

// ── Supabase helpers ────────────────────────────────────────────────────────

export const getVectorStoreId = async (): Promise<string | null> => {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'vector_store_id')
    .maybeSingle();
  return data?.value ?? null;
};

const saveVectorStoreId = async (id: string): Promise<void> => {
  await supabase.from('app_config').upsert({
    key: 'vector_store_id',
    value: id,
    updated_at: new Date().toISOString(),
  });
};

// ── OpenAI vector store ─────────────────────────────────────────────────────

const getOrCreateVectorStore = async (): Promise<string> => {
  const existing = await getVectorStoreId();
  if (existing) return existing;

  const res = await openaiFetch('vector_stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...VS_BETA_HEADER },
    body: JSON.stringify({ name: 'DDM Lab — Base de Conhecimento' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao criar vector store na OpenAI.');
  }

  const data = await res.json();
  await saveVectorStoreId(data.id);
  return data.id as string;
};

// ── Public API ──────────────────────────────────────────────────────────────

export const uploadDocument = async (file: File): Promise<KBDoc> => {
  // 1. Upload file to OpenAI
  const form = new FormData();
  form.append('file', file);
  form.append('purpose', 'assistants');

  // No Content-Type header here — the browser sets the multipart boundary and
  // the proxy forwards it byte-for-byte.
  const uploadRes = await openaiFetch('files', {
    method: 'POST',
    body: form,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao enviar arquivo para OpenAI.');
  }

  const uploadData = await uploadRes.json();
  const fileId: string = uploadData.id;

  // 2. Add to vector store
  const vsId = await getOrCreateVectorStore();

  const addRes = await openaiFetch(`vector_stores/${vsId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...VS_BETA_HEADER },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!addRes.ok) {
    const err = await addRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao adicionar arquivo ao vector store.');
  }

  // 3. Save to Supabase
  const { data, error } = await supabase
    .from('knowledge_base_docs')
    .insert({ file_name: file.name, openai_file_id: fileId, size_bytes: file.size })
    .select()
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    file_name: String(data.file_name),
    openai_file_id: String(data.openai_file_id),
    size_bytes: data.size_bytes ?? null,
    created_at: String(data.created_at),
  };
};

export const listDocuments = async (): Promise<KBDoc[]> => {
  const { data, error } = await supabase
    .from('knowledge_base_docs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: String(row.id),
    file_name: String(row.file_name),
    openai_file_id: String(row.openai_file_id),
    size_bytes: row.size_bytes ?? null,
    created_at: String(row.created_at),
  }));
};

export const deleteDocument = async (doc: KBDoc): Promise<void> => {
  const vsId = await getVectorStoreId();

  // Remove from vector store
  if (vsId) {
    await openaiFetch(`vector_stores/${vsId}/files/${doc.openai_file_id}`, {
      method: 'DELETE',
      headers: { ...VS_BETA_HEADER },
    }).catch(() => {});
  }

  // Delete file from OpenAI
  await openaiFetch(`files/${doc.openai_file_id}`, {
    method: 'DELETE',
  }).catch(() => {});

  // Delete from Supabase
  await supabase.from('knowledge_base_docs').delete().eq('id', doc.id);
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
