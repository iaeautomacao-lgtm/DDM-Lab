import type { ColumnProfile, DashboardConfig, Kpi } from './types';
import { guessIcon, guessGoodDirection } from './kpiMeta';

// Config determinística usada quando a IA falha/está indisponível — nunca
// deixa o usuário sem um dashboard, mesmo que genérico.

export function buildMockConfig(
  prompt: string,
  profile: ColumnProfile[],
  brand?: { primary?: string; accent?: string; logoUrl?: string },
): DashboardConfig {
  const dateCol = profile.find((c) => c.role === 'date')?.originalName;
  const currencyCol = profile.find((c) => c.dataType === 'currency')?.originalName;
  const metricCol = currencyCol ?? profile.find((c) => c.role === 'metric')?.originalName;
  const dims = profile.filter((c) => c.role === 'dimension' && c.dataType === 'category').map((c) => c.originalName);

  const kpis: DashboardConfig['kpis'] = [];
  const mkKpi = (id: string, title: string, metric: string, format: Kpi['format'], subtitle?: string): Kpi => ({
    id, title, metric, format, subtitle,
    icon: guessIcon(title, metric, format),
    goodDirection: guessGoodDirection(title, metric),
  });
  if (metricCol) kpis.push(mkKpi('kpi_0', `Total de ${metricCol}`, `sum(${metricCol})`, currencyCol ? 'currency' : 'number', 'vs mês anterior'));
  kpis.push(mkKpi('kpi_1', 'Total de registros', 'count()', 'number', 'vs mês anterior'));
  if (metricCol) kpis.push(mkKpi('kpi_2', `Média de ${metricCol}`, `avg(${metricCol})`, currencyCol ? 'currency' : 'number'));
  if (dims[0]) kpis.push(mkKpi('kpi_3', `Categorias em ${dims[0]}`, 'count()', 'number'));

  const widgets: DashboardConfig['widgets'] = [];
  let wi = 0;
  const push = (w: Omit<DashboardConfig['widgets'][number], 'id' | 'layout'>) => {
    widgets.push({ ...w, id: `w_${wi}`, layout: { x: (wi % 2) * 6, y: Math.floor(wi / 2) * 4, w: 6, h: 4 } });
    wi++;
  };
  const y = metricCol ? `sum(${metricCol})` : 'count()';
  if (dateCol) push({ type: 'line', title: 'Evolução por mês', query: { x: dateCol, y } });
  if (dims[0]) push({ type: 'bar', title: `Por ${dims[0]}`, query: { x: dims[0], y } });
  if (dims[1]) push({ type: 'donut', title: `Distribuição por ${dims[1]}`, query: { x: dims[1], y } });
  if (dims[2]) push({ type: 'ranking', title: `Ranking por ${dims[2]}`, query: { x: dims[2], y } });

  const filters: DashboardConfig['filters'] = [];
  if (dateCol) filters.push({ field: dateCol, type: 'date_range' });
  dims.slice(0, 3).forEach((d) => filters.push({ field: d, type: 'select' }));

  return {
    id: `dash_${Date.now()}`,
    name: prompt.slice(0, 48) || 'Dashboard de Exemplo',
    objective: prompt || 'Visão geral dos dados enviados.',
    audience: 'Gestores',
    theme: 'ddm_dark',
    brand: { primary: brand?.primary, accent: brand?.accent, logoUrl: brand?.logoUrl },
    dataSourceId: 'mock',
    filters,
    kpis,
    widgets,
    insights: [
      'Dashboard gerado automaticamente a partir do perfil dos dados (a IA não respondeu desta vez).',
      metricCol ? `A métrica principal considerada foi "${metricCol}".` : 'Nenhuma métrica numérica detectada; usando contagens.',
    ],
  };
}
