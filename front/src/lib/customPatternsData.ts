import { api } from './apiClient';
import type { SlideType } from './presentationsData';
import type { PresentationPattern } from './presentationPatterns';

interface CustomPatternRow {
  id: string;
  label: string;
  description: string | null;
  slide_sequence: SlideType[];
  suggested_primary_color: string | null;
  author_name: string | null;
  created_by: string | null;
  created_at: string;
}

const toPattern = (row: CustomPatternRow): PresentationPattern => ({
  id: row.id,
  label: row.label,
  description: row.description || `Modelo enviado por ${row.author_name || 'alguém do time'}`,
  suggestedPrimaryColor: row.suggested_primary_color || '#FF5100',
  slideSequence: row.slide_sequence,
});

export const fetchCustomPatterns = async (): Promise<PresentationPattern[]> => {
  const { patterns } = await api.get<{ patterns: CustomPatternRow[] }>('/presentation-patterns');
  return patterns.map(toPattern);
};

export interface CreateCustomPatternInput {
  label: string;
  description?: string;
  slideSequence: SlideType[];
  suggestedPrimaryColor?: string | null;
}

export const createCustomPattern = async (input: CreateCustomPatternInput): Promise<PresentationPattern> => {
  const { pattern } = await api.post<{ pattern: CustomPatternRow }>('/presentation-patterns', input);
  return toPattern(pattern);
};

export const deleteCustomPattern = async (id: string): Promise<void> => {
  await api.delete(`/presentation-patterns/${id}`);
};

export interface TemplateAnalysis {
  slideCount: number;
  slideSequence: SlideType[];
  suggestedPrimaryColor: string;
}

export const analyzeTemplate = async (file: File): Promise<TemplateAnalysis> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<TemplateAnalysis>('/presentations/analyze-template', form);
};

export const extractDocumentText = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const { text } = await api.post<{ text: string }>('/presentations/extract-document', form);
  return text;
};
