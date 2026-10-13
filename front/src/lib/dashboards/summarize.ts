import type { ColumnProfile, DataRow } from './types';
import { groupSeries } from './aggregate';

// Resume uma planilha enviada (perfil + linhas) num texto curto pra IA usar
// como dados REAIS ao montar kpi_grid/grafico/tabela/funil — em vez de
// inventar números plausíveis. Nunca manda as linhas cruas pro prompt (custo
// de token e ruído); só agregados (soma/média/top categorias).

const MAX_SUMMARY_LENGTH = 6000;

const fmtNum = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function summarizeDatasetForPresentation(profile: ColumnProfile[], rows: DataRow[]): string {
  const lines: string[] = [];
  lines.push(`Total de linhas: ${rows.length.toLocaleString('pt-BR')}`);

  const dateCol = profile.find((c) => c.role === 'date');
  if (dateCol) {
    const values = rows.map((r) => String(r[dateCol.originalName] ?? '')).filter(Boolean).sort();
    if (values.length) lines.push(`Período ("${dateCol.originalName}"): ${values[0]} até ${values[values.length - 1]}`);
  }

  const metrics = profile.filter((c) => c.role === 'metric');
  for (const m of metrics) {
    const values = rows.map((r) => Number(r[m.originalName])).filter((v) => !isNaN(v));
    if (!values.length) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    lines.push(
      `"${m.originalName}" (${m.dataType}): soma=${fmtNum(sum)}, média=${fmtNum(avg)}, mín=${fmtNum(Math.min(...values))}, máx=${fmtNum(Math.max(...values))}`,
    );
  }

  const dims = profile.filter((c) => c.role === 'dimension' && c.dataType === 'category');
  const metricForBreakdown = metrics[0]?.originalName;
  for (const d of dims.slice(0, 4)) {
    const y = metricForBreakdown ? `sum(${metricForBreakdown})` : 'count()';
    const series = groupSeries(rows, d.originalName, y).slice(0, 6);
    if (series.length) {
      const label = metricForBreakdown ? `soma de "${metricForBreakdown}"` : 'contagem';
      lines.push(`Top "${d.originalName}" por ${label}: ${series.map((s) => `${s.name}=${fmtNum(s.value)}`).join(', ')}`);
    }
  }

  return lines.join('\n').slice(0, MAX_SUMMARY_LENGTH);
}
