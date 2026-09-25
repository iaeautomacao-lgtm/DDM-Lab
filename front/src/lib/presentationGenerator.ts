import { callOpenAI } from './openai';
import type { Slide } from './presentationsData';

const SYSTEM_PROMPT = `Você é um consultor sênior de apresentações corporativas do Grupo DDM (educação financeira, cobrança humanizada, gestão de carteiras).

Monte uma apresentação profissional a partir do título e objetivo que o usuário der. Estrutura obrigatória:
1. Um slide "capa" (abertura, com subtítulo)
2. Entre 4 e 7 slides de conteúdo, alternando "topicos" (lista de pontos) e "duas_colunas" (comparação, antes/depois, prós/contras) quando fizer sentido
3. No máximo 1 slide "citacao" (frase de efeito ou dado marcante), se agregar valor
4. Um slide final "fechamento" (conclusão + próximos passos ou chamada para ação)

Regras de conteúdo:
- Português do Brasil, tom executivo, direto, sem enrolação
- Cada slide de "topicos" tem no máximo 5 bullets, cada bullet com no máximo 14 palavras
- Nunca escreva parágrafos longos dentro de um slide — é apresentação, não documento
- Nada de placeholders como [Nome] ou [Data]

Responda SOMENTE com este JSON (sem markdown, sem texto fora do JSON):
{
  "title": "Título final da apresentação",
  "subtitle": "Subtítulo curto para a capa",
  "slides": [
    { "type": "capa", "title": "...", "subtitle": "..." },
    { "type": "topicos", "title": "...", "bullets": ["...", "..."] },
    { "type": "duas_colunas", "title": "...", "columnLeft": { "heading": "...", "bullets": ["..."] }, "columnRight": { "heading": "...", "bullets": ["..."] } },
    { "type": "citacao", "quote": "...", "quoteAuthor": "..." },
    { "type": "fechamento", "title": "...", "bullets": ["..."] }
  ]
}`;

export interface GeneratedDeck {
  title: string;
  subtitle?: string;
  slides: Slide[];
}

const extractJsonObject = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
};

const parseJsonSafe = <T>(raw: string): T => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(extractJsonObject(cleaned)) as T;
};

const VALID_TYPES = new Set(['capa', 'topicos', 'duas_colunas', 'citacao', 'fechamento']);

export const generatePresentationDeck = async (
  title: string,
  objective: string,
  slideCount?: number,
): Promise<GeneratedDeck> => {
  const countInstruction = slideCount
    ? `A apresentação deve ter exatamente ${slideCount} slides no total (contando capa e fechamento) — ajuste a quantidade de slides de conteúdo pra bater nesse número.`
    : 'Use entre 6 e 9 slides no total (contando capa e fechamento).';

  const userMessage = `Título da apresentação: "${title}"\nObjetivo / contexto: "${objective || 'Não especificado — use o bom senso a partir do título.'}"\n${countInstruction}\n\nRetorne apenas o JSON pedido.`;

  const { text } = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    false,
  );

  const parsed = parseJsonSafe<{ title?: string; subtitle?: string; slides?: unknown[] }>(text);
  const slides = (parsed.slides || []).filter(
    (s): s is Slide => typeof s === 'object' && s !== null && VALID_TYPES.has((s as Slide).type),
  );

  if (slides.length === 0) throw new Error('A IA não retornou nenhum slide válido. Tente reformular o objetivo.');

  return {
    title: parsed.title?.trim() || title,
    subtitle: parsed.subtitle?.trim(),
    slides,
  };
};
