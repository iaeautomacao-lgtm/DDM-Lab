import { api } from './apiClient';

export type SkillCategory =
  | 'produtividade' | 'rh' | 'financeiro' | 'juridico' | 'comercial'
  | 'marketing' | 'backoffice' | 'planejamento' | 'ti_ia' | 'outro';

export type SkillVisibility = 'privada' | 'em_revisao' | 'publicada' | 'rejeitada';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory | null;
  tags: string[];
  compatibility: string;
  version: string;
  visibility: SkillVisibility;
  moderation_note: string | null;
  file_id: string;
  file_name: string | null;
  file_size: number | null;
  download_count: number;
  author_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_OPTIONS: Array<{ value: SkillCategory; label: string }> = [
  { value: 'produtividade', label: 'Produtividade' },
  { value: 'rh', label: 'RH' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'backoffice', label: 'Backoffice' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'ti_ia', label: 'TI / IA' },
  { value: 'outro', label: 'Outro' },
];

export const VISIBILITY_LABEL: Record<SkillVisibility, string> = {
  privada: 'Privada',
  em_revisao: 'Em revisão',
  publicada: 'Publicada',
  rejeitada: 'Rejeitada',
};

export interface SkillFilters {
  search?: string;
  category?: string;
  mine?: boolean;
}

const buildQuery = (filters: SkillFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.mine) params.set('mine', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const fetchSkills = async (filters: SkillFilters = {}): Promise<Skill[]> => {
  const { skills } = await api.get<{ skills: Skill[] }>(`/skills${buildQuery(filters)}`);
  return skills;
};

export const fetchSkill = async (id: string): Promise<Skill> => {
  const { skill } = await api.get<{ skill: Skill }>(`/skills/${id}`);
  return skill;
};

export interface SkillUploadInput {
  file: File;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  compatibility?: string;
  version?: string;
}

export const uploadSkill = async (input: SkillUploadInput): Promise<Skill> => {
  const form = new FormData();
  form.append('file', input.file);
  form.append('name', input.name);
  form.append('description', input.description);
  if (input.category) form.append('category', input.category);
  if (input.tags) form.append('tags', JSON.stringify(input.tags));
  if (input.compatibility) form.append('compatibility', input.compatibility);
  if (input.version) form.append('version', input.version);

  const { skill } = await api.post<{ skill: Skill }>('/skills', form);
  return skill;
};

export type SkillMetadataInput = Partial<
  Pick<Skill, 'name' | 'description' | 'category' | 'tags' | 'compatibility' | 'version'>
>;

export const updateSkill = async (id: string, input: SkillMetadataInput): Promise<Skill> => {
  const { skill } = await api.patch<{ skill: Skill }>(`/skills/${id}`, input);
  return skill;
};

export const submitSkillForReview = async (id: string): Promise<void> => {
  await api.patch(`/skills/${id}/submit`);
};

export const moderateSkill = async (
  id: string,
  visibility: 'publicada' | 'rejeitada',
  moderationNote?: string,
): Promise<void> => {
  await api.patch(`/skills/${id}/moderate`, { visibility, moderationNote });
};

export const deleteSkill = async (id: string): Promise<void> => {
  await api.delete(`/skills/${id}`);
};

/** Caminho same-origin: cookie httpOnly vai junto na navegacao normal do navegador. */
export const skillDownloadUrl = (id: string): string => `/api/skills/${id}/download`;

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
