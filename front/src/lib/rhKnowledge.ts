import { api } from './apiClient';

export interface RHKnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  status: 'published' | 'draft';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const RH_CATEGORIES = [
  'Benefícios',
  'Férias',
  'Banco de Horas',
  'Home Office',
  'Treinamentos',
  'Procedimentos',
  'Políticas Internas',
  'Comunicados',
] as const;

export type RHCategory = (typeof RH_CATEGORIES)[number];

export const getAllArticles = async (): Promise<RHKnowledgeArticle[]> => {
  const { articles } = await api.get<{ articles: RHKnowledgeArticle[] }>('/rh/knowledge');
  return articles;
};

export const createArticle = async (
  article: Pick<RHKnowledgeArticle, 'title' | 'category' | 'content' | 'tags' | 'status'>,
  _userId: string,
): Promise<RHKnowledgeArticle> => {
  const { article: created } = await api.post<{ article: RHKnowledgeArticle }>('/rh/knowledge', article);
  return created;
};

export const updateArticle = async (
  id: string,
  updates: Partial<Pick<RHKnowledgeArticle, 'title' | 'category' | 'content' | 'tags' | 'status'>>,
): Promise<void> => {
  await api.patch(`/rh/knowledge/${id}`, updates);
};

export const deleteArticle = async (id: string): Promise<void> => {
  await api.delete(`/rh/knowledge/${id}`);
};

const RH_SEARCH_KEYWORDS = [
  'férias', 'ferias', 'banco de horas', 'benefício', 'beneficio', 'benefícios',
  'home office', 'treinamento', 'política', 'politica', 'políticas', 'politicas',
  'procedimento', 'folha', 'salário', 'salario', 'holerite', 'ponto', 'jornada',
  'rescisão', 'rescisao', 'clt', 'plano de saúde', 'plano de saude', 'vale',
  'licença', 'licenca', 'afastamento', 'inss', 'fgts', '13°', 'décimo', 'decimo',
  'rh', 'recursos humanos', 'admissão', 'admissao', 'demissão', 'demissao',
  'remuneração', 'remuneracao', 'bonificação', 'bonificacao', 'sindicato',
  'convenção coletiva', 'convencao coletiva', 'cipa', 'epi', 'segurança do trabalho',
  'comunicado rh', 'aviso', 'uniforme', 'plano de carreira', 'pdv', 'pdi',
];

export const isRHQuery = (text: string): boolean => {
  const lower = text.toLowerCase();
  return RH_SEARCH_KEYWORDS.some(kw => lower.includes(kw));
};

export const searchKnowledge = async (query: string, limit = 4): Promise<RHKnowledgeArticle[]> => {
  if (!query.trim()) return [];
  const { articles } = await api.get<{ articles: RHKnowledgeArticle[] }>(
    `/rh/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return articles;
};
