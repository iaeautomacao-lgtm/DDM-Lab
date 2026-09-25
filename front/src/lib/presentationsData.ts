import { api } from './apiClient';

export type SlideType = 'capa' | 'topicos' | 'duas_colunas' | 'citacao' | 'fechamento';
export type PresentationTheme = 'claro' | 'escuro' | 'ddm';

export interface SlideColumn {
  heading?: string;
  bullets: string[];
}

export interface Slide {
  type: SlideType;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  columnLeft?: SlideColumn;
  columnRight?: SlideColumn;
  quote?: string;
  quoteAuthor?: string;
  notes?: string;
}

export interface Presentation {
  id: string;
  title: string;
  objective: string | null;
  theme: PresentationTheme;
  primary_color: string | null;
  accent_color: string | null;
  logo_data_url: string | null;
  slides: Slide[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// A listagem (historico) nao traz o logo — pode ser pesado e nao e usado ali.
export type PresentationSummary = Omit<Presentation, 'slides' | 'logo_data_url'>;

export const SLIDE_COUNT_OPTIONS = [5, 7, 9, 12] as const;
export type SlideCount = (typeof SLIDE_COUNT_OPTIONS)[number];

export const THEME_OPTIONS: Array<{ value: PresentationTheme; label: string; hint: string }> = [
  { value: 'ddm', label: 'DDM', hint: 'Escuro com identidade da marca' },
  { value: 'escuro', label: 'Escuro', hint: 'Neutro, alto contraste' },
  { value: 'claro', label: 'Claro', hint: 'Fundo branco, formal' },
];

export const fetchPresentations = async (): Promise<PresentationSummary[]> => {
  const { presentations } = await api.get<{ presentations: PresentationSummary[] }>('/presentations');
  return presentations;
};

export const fetchPresentation = async (id: string): Promise<Presentation> => {
  const { presentation } = await api.get<{ presentation: Presentation }>(`/presentations/${id}`);
  return presentation;
};

export interface PresentationInput {
  title: string;
  objective?: string;
  theme: PresentationTheme;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUrl?: string | null;
  slides: Slide[];
}

export const createPresentation = async (input: PresentationInput): Promise<Presentation> => {
  const { presentation } = await api.post<{ presentation: Presentation }>('/presentations', input);
  return presentation;
};

export const updatePresentation = async (id: string, input: Partial<PresentationInput>): Promise<Presentation> => {
  const { presentation } = await api.put<{ presentation: Presentation }>(`/presentations/${id}`, input);
  return presentation;
};

export const deletePresentation = async (id: string): Promise<void> => {
  await api.delete(`/presentations/${id}`);
};
