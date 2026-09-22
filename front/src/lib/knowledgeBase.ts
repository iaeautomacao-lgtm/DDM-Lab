import { api } from './apiClient';
import { openaiFetch } from './aiProxy';

const VS_BETA_HEADER = { 'OpenAI-Beta': 'assistants=v2' };

export interface KBDoc {
  id: string;
  file_name: string;
  openai_file_id: string;
  size_bytes: number | null;
  created_at: string;
}

// ── App config (id do vector store) ─────────────────────────────────────────

export const getVectorStoreId = async (): Promise<string | null> => {
  const { value } = await api.get<{ value: string | null }>('/app-config/vector_store_id');
  return value;
};

const saveVectorStoreId = async (id: string): Promise<void> => {
  await api.put('/app-config/vector_store_id', { value: id });
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

  // 3. Salva na API
  const { doc } = await api.post<{ doc: Record<string, unknown> }>('/knowledge-base/docs', {
    fileName: file.name,
    openaiFileId: fileId,
    sizeBytes: file.size,
  });

  return {
    id: String(doc.id),
    file_name: String(doc.file_name),
    openai_file_id: String(doc.openai_file_id),
    size_bytes: (doc.size_bytes as number | null) ?? null,
    created_at: String(doc.created_at),
  };
};

export const listDocuments = async (): Promise<KBDoc[]> => {
  const { docs } = await api.get<{ docs: Array<Record<string, unknown>> }>('/knowledge-base/docs');

  return docs.map((row) => ({
    id: String(row.id),
    file_name: String(row.file_name),
    openai_file_id: String(row.openai_file_id),
    size_bytes: (row.size_bytes as number | null) ?? null,
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

  // Delete from API
  await api.delete(`/knowledge-base/docs/${doc.id}`).catch(() => {});
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
