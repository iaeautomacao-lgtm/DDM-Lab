import { callOpenAI } from './openai';
import { findPattern } from './presentationPatterns';
import type { Slide } from './presentationsData';

const BASE_SYSTEM_PROMPT = `Você é um consultor sênior de apresentações corporativas do Grupo DDM (educação financeira, cobrança humanizada, gestão de carteiras e contact center).

Monte uma apresentação profissional a partir do título e objetivo que o usuário der.

Regras de conteúdo:
- Português do Brasil, tom executivo, direto, sem enrolação
- Nunca escreva parágrafos longos dentro de um slide — é apresentação, não documento
- Nada de placeholders como [Nome] ou [Data] — invente um valor plausível ou omita
- Números/percentuais/valores em KPI, gráfico e tabela devem ser plausíveis e coerentes com o objetivo descrito (o usuário não deu números reais, então estime com bom senso e deixe claro no texto que são estimativas quando for o caso)

Tipos de slide disponíveis e o formato JSON exato de cada um:
{ "type": "capa", "title": "...", "subtitle": "..." }
{ "type": "topicos", "title": "...", "bullets": ["...", "..."] }  // ate 5 bullets, ate 14 palavras cada
{ "type": "duas_colunas", "title": "...", "columnLeft": { "heading": "...", "bullets": ["..."] }, "columnRight": { "heading": "...", "bullets": ["..."] } }
{ "type": "citacao", "quote": "...", "quoteAuthor": "..." }
{ "type": "kpi_grid", "title": "...", "subtitle": "...", "kpiItems": [{ "value": "R$ 1,8 mi", "label": "Recuperado no período", "sublabel": "opcional" }] }  // 3 a 4 itens
{ "type": "insight_cards", "title": "...", "subtitle": "...", "insightItems": [{ "number": "1", "title": "...", "body": "frase ou paragrafo curto" }] }  // 2 a 4 itens
{ "type": "funil", "title": "...", "subtitle": "...", "funnelStages": [{ "label": "...", "value": "...", "sublabel": "opcional" }] }  // 3 a 5 etapas, em ordem decrescente de volume
{ "type": "grafico", "title": "...", "subtitle": "...", "chartType": "bar" | "line" | "pie", "chartCategories": ["Jan", "Fev", "Mar"], "chartSeries": [{ "name": "...", "values": [10, 20, 30] }] }  // 1 a 3 series
{ "type": "tabela", "title": "...", "subtitle": "...", "tableColumns": ["Indicador", "Mês 1", "Mês 2"], "tableRows": [["Taxa de contato", "22%", "27%"]] }  // ate 6 colunas, ate 6 linhas
{ "type": "fechamento", "title": "...", "bullets": ["..."] }

Responda SOMENTE com este JSON (sem markdown, sem texto fora do JSON):
{
  "title": "Título final da apresentação",
  "subtitle": "Subtítulo curto para a capa",
  "slides": [ ... ]
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

const VALID_TYPES = new Set([
  'capa',
  'topicos',
  'duas_colunas',
  'citacao',
  'fechamento',
  'kpi_grid',
  'insight_cards',
  'funil',
  'grafico',
  'tabela',
]);

export const generatePresentationDeck = async (
  title: string,
  objective: string,
  slideCount?: number,
  patternId?: string | null,
): Promise<GeneratedDeck> => {
  const countInstruction = slideCount
    ? `A apresentação deve ter exatamente ${slideCount} slides no total (contando capa e fechamento) — ajuste a quantidade de slides de conteúdo pra bater nesse número.`
    : 'Use entre 6 e 9 slides no total (contando capa e fechamento).';

  const pattern = findPattern(patternId ?? null);
  let patternInstruction = `Sem padrão fixo: alterne "topicos" e "duas_colunas" pros slides de conteúdo, use "citacao" no máximo uma vez se agregar valor, e sempre feche com "fechamento".`;

  if (pattern) {
    const exampleLines = pattern.slideSequence
      .filter((type, idx, arr) => arr.indexOf(type) === idx) // tipos unicos, na ordem
      .map((type) => {
        const ex = pattern.examples[type]?.[0];
        return ex ? `- ${type}: estilo de referência (NÃO copie o conteúdo, só o jeito de escrever) — "${ex}"` : null;
      })
      .filter(Boolean)
      .join('\n');

    patternInstruction = `Siga o padrão "${pattern.label}" (${pattern.description}). Sequência de slides de referência (adapte a quantidade de slides repetidos — ex. "kpi_grid" ou "insight_cards" — pra bater com o total pedido, mas mantenha a ORDEM e os TIPOS dessa sequência): ${pattern.slideSequence.join(' → ')}.\n\nExemplos de estilo de cada tipo nesse padrão (são de OUTRAS empresas — nunca repita os números ou nomes, só o tom e o formato):\n${exampleLines}`;
  }

  const userMessage = `Título da apresentação: "${title}"\nObjetivo / contexto: "${objective || 'Não especificado — use o bom senso a partir do título.'}"\n${countInstruction}\n\n${patternInstruction}\n\nRetorne apenas o JSON pedido.`;

  const { text } = await callOpenAI(
    [
      { role: 'system', content: BASE_SYSTEM_PROMPT },
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
