import { callOpenAI } from '../openai';
import { isValidMetric, repairMetric } from './aggregate';
import { guessIcon, guessGoodDirection, coerceIcon } from './kpiMeta';
import { buildMockConfig } from './mockConfig';
import type { ColumnProfile, DashboardConfig } from './types';

// Geração do JSON de dashboard via IA (proxy /api/openai — a chave nunca
// fica no navegador). Se a IA falhar, cai num dashboard determinístico a
// partir do perfil das colunas, pra nunca deixar o fluxo morrer.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GenStatus = { message: string };

interface GenerateArgs {
  prompt: string;
  profile: ColumnProfile[];
  dashboardType?: string;
  brand?: { primary?: string; accent?: string; logoUrl?: string };
  onStatus?: (s: GenStatus) => void;
}

const SYSTEM_PROMPT = `Você é um especialista em dashboards, análise de dados e visualização executiva.
A partir do objetivo do usuário e do PERFIL das colunas da base, gere a configuração de um dashboard.

REGRAS OBRIGATÓRIAS:
1. Use SOMENTE nomes de coluna EXATAMENTE como aparecem no perfil. Nunca invente colunas nem crie "filtros" que não sejam colunas reais.
2. GRAMÁTICA DE MÉTRICA (não use SQL, não use WHERE/SELECT/CASE):
   - Contagem total: count()
   - Contagem condicional: count(COLUNA='VALOR')   ex: count(status='Pago')
   - Agregações: sum(COLUNA), avg(COLUNA), min(COLUNA), max(COLUNA)
   - Razão/percentual: "EXPR / EXPR"   ex: "count(status='FPD') / count()"
   - VALOR deve ser um dos "exemplos" listados para aquela coluna. COLUNA nunca leva aspas duplas nem prefixo "*".
   - PROIBIDO: WHERE, SELECT, CASE, aspas duplas na coluna, colunas inexistentes, nomes de filtro no lugar de coluna.
3. Em "query" dos widgets, "x" é o nome EXATO de uma coluna (dimensão/data) e "y" é uma métrica na gramática acima.
4. "filters[].field" deve ser o nome EXATO de uma coluna existente.
5. Sugira de 4 a 6 KPIs e de 3 a 5 widgets relevantes ao objetivo.
6. Escolha o gráfico adequado (linha p/ evolução temporal, barra/ranking p/ comparação por categoria, donut p/ composição).
7. Para cada KPI: "icon" é uma palavra da lista; "subtitle" é uma legenda curta (ex: "vs mês anterior"); "goodDirection" é "up" quando MAIOR é melhor e "down" quando MENOR é melhor (ex: FPD, inadimplência, custo, churn = "down").
8. Responda APENAS com JSON válido no schema indicado. Sem texto fora do JSON.`;

function buildUserPrompt(args: GenerateArgs): string {
  const cols = args.profile
    .map((c) => {
      const ex = c.sampleValues?.length ? ` | exemplos: ${c.sampleValues.slice(0, 4).join(', ')}` : '';
      return `- ${c.originalName} (${c.dataType}, papel: ${c.role})${ex}`;
    })
    .join('\n');
  return `OBJETIVO DO USUÁRIO:
"${args.prompt}"

TIPO DE DASHBOARD: ${args.dashboardType ?? 'Customizado'}

PERFIL DAS COLUNAS:
${cols}

Gere um JSON com este formato (campos obrigatórios):
{
  "name": string,
  "objective": string,
  "audience": string,
  "kpis": [{ "title": string, "metric": string, "format": "number"|"currency"|"percentage", "icon": "money"|"users"|"time"|"percent"|"alert"|"cart"|"target"|"count", "subtitle": string, "goodDirection": "up"|"down" }],
  "widgets": [{ "type": "line"|"bar"|"donut"|"ranking"|"table", "title": string, "query": { "x": string, "y": string } }],
  "filters": [{ "field": string, "type": "date_range"|"select" }],
  "insights": [string]
}

Retorne apenas o JSON pedido.`;
}

// Converte a resposta "crua" da IA no DashboardConfig completo (preenche ids/layout/tema).
// Descarta KPIs/widgets que referenciam colunas fora do perfil (anti-alucinação): sem isso,
// uma coluna inventada vira KPI zerado/gráfico vazio silenciosamente.
function normalize(raw: any, args: GenerateArgs): DashboardConfig {
  const id = `dash_${Date.now()}`;
  const validCols = new Set(args.profile.map((c) => c.originalName));

  const kpis = (raw.kpis ?? [])
    .map((k: any) => ({
      title: String(k.title ?? 'KPI'),
      metric: repairMetric(String(k.metric ?? 'count()')),
      format: k.format,
      icon: k.icon,
      subtitle: k.subtitle,
      goodDirection: k.goodDirection,
    }))
    .filter((k: any) => isValidMetric(k.metric, validCols))
    .slice(0, 6)
    .map((k: any, i: number) => {
      const format = (['number', 'currency', 'percentage'].includes(k.format) ? k.format : 'number') as any;
      return {
        id: `kpi_${i}`,
        title: k.title,
        metric: k.metric,
        format,
        icon: coerceIcon(k.icon) ?? guessIcon(k.title, k.metric, format),
        subtitle: typeof k.subtitle === 'string' && k.subtitle.trim() ? k.subtitle.trim() : undefined,
        goodDirection: k.goodDirection === 'down' || k.goodDirection === 'up' ? k.goodDirection : guessGoodDirection(k.title, k.metric),
      };
    });

  const widgets = (raw.widgets ?? [])
    .map((w: any) => ({ ...w, __y: repairMetric(String(w.query?.y ?? '')) }))
    .filter((w: any) => {
      const x = w.query?.x;
      if (x && !validCols.has(String(x))) return false;
      if (w.__y && !isValidMetric(w.__y, validCols)) return false;
      return true;
    })
    .slice(0, 6)
    .map((w: any, i: number) => ({
      id: `w_${i}`,
      type: (['line', 'bar', 'donut', 'ranking', 'table', 'funnel', 'heatmap'].includes(w.type) ? w.type : 'bar') as any,
      title: String(w.title ?? `Gráfico ${i + 1}`),
      query: { x: w.query?.x, y: w.__y || w.query?.y },
      layout: { x: (i % 2) * 6, y: Math.floor(i / 2) * 4, w: 6, h: 4 },
    }));

  if (kpis.length === 0) kpis.push({ id: 'kpi_0', title: 'Total de registros', metric: 'count()', format: 'number' as any });

  return {
    id,
    name: String(raw.name ?? 'Dashboard'),
    objective: String(raw.objective ?? args.prompt),
    audience: String(raw.audience ?? 'Gestores'),
    theme: 'ddm_dark',
    brand: { primary: args.brand?.primary, accent: args.brand?.accent, logoUrl: args.brand?.logoUrl },
    dataSourceId: 'mock',
    filters: (raw.filters ?? [])
      .filter((f: any) => validCols.has(String(f.field)))
      .map((f: any) => ({ field: String(f.field), type: f.type === 'date_range' ? 'date_range' : 'select' })),
    kpis,
    widgets,
    insights: Array.isArray(raw.insights) ? raw.insights.map(String) : [],
  };
}

const extractJsonObject = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
};

function parseJsonFromText(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(extractJsonObject(cleaned));
  }
}

async function callAI(args: GenerateArgs): Promise<DashboardConfig> {
  args.onStatus?.({ message: 'Consultando a IA para montar o dashboard...' });
  const { text } = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(args) },
    ],
    false,
  );
  return normalize(parseJsonFromText(text), args);
}

export async function generateDashboard(args: GenerateArgs): Promise<DashboardConfig> {
  args.onStatus?.({ message: 'Analisando seu pedido e o perfil dos dados...' });
  try {
    return await callAI(args);
  } catch (e) {
    console.warn('IA falhou, usando dashboard de exemplo:', e);
    args.onStatus?.({ message: 'IA indisponível no momento, gerando uma versão de exemplo...' });
    await sleep(300);
    return buildMockConfig(args.prompt, args.profile, args.brand);
  }
}
