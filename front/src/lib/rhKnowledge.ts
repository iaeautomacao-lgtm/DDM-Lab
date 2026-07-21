import { supabase } from './supabaseClient';

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
  const { data, error } = await supabase
    .from('rh_knowledge')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const createArticle = async (
  article: Pick<RHKnowledgeArticle, 'title' | 'category' | 'content' | 'tags' | 'status'>,
  userId: string,
): Promise<RHKnowledgeArticle> => {
  const { data, error } = await supabase
    .from('rh_knowledge')
    .insert({ ...article, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateArticle = async (
  id: string,
  updates: Partial<Pick<RHKnowledgeArticle, 'title' | 'category' | 'content' | 'tags' | 'status'>>,
): Promise<void> => {
  const { error } = await supabase
    .from('rh_knowledge')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const deleteArticle = async (id: string): Promise<void> => {
  const { error } = await supabase.from('rh_knowledge').delete().eq('id', id);
  if (error) throw error;
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
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length >= 4)
    .slice(0, 5);

  if (terms.length === 0) {
    const { data } = await supabase
      .from('rh_knowledge')
      .select('*')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  const conditions = terms
    .flatMap(term => [`title.ilike.%${term}%`, `content.ilike.%${term}%`])
    .join(',');

  const { data } = await supabase
    .from('rh_knowledge')
    .select('*')
    .eq('status', 'published')
    .or(conditions)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data ?? [];
};
