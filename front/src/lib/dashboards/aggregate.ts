import type { DataRow } from './types';
import { parseNumber } from './number';

// Motor de agregação que transforma expressões de métrica + dataset em números.
// Suporta: sum(col), count(), count(col), avg(col), min(col), max(col)
// e razões simples: "<expr> / <expr>" (ex: "count(status='pago') / count()").
// Mantido propositalmente pequeno — sem eval.

type Agg = 'sum' | 'count' | 'avg' | 'min' | 'max';

const num = (v: unknown): number => parseNumber(v) ?? 0;

function matchInline(row: DataRow, filter?: { field: string; value: string }): boolean {
  if (!filter) return true;
  return String(row[filter.field]) === filter.value;
}

// Repara variações comuns que a IA às vezes produz fora da gramática:
//  - count(*)                         -> count()
//  - agg() WHERE "col" = 'val'        -> agg(col='val')
//  - (expr)                           -> expr   (parênteses externos supérfluos)
// Não valida existência de coluna — só normaliza a forma. Ver isValidMetric().
export function repairMetric(expr: string): string {
  let s = String(expr ?? '').trim();
  s = s.replace(/\bcount\s*\(\s*\*\s*\)/gi, 'count()');
  while (/^\(([\s\S]*)\)$/.test(s)) {
    const inner = s.replace(/^\(([\s\S]*)\)$/, '$1');
    let depth = 0;
    let ok = true;
    for (const ch of inner) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth < 0) {
          ok = false;
          break;
        }
      }
    }
    if (ok && depth === 0) s = inner.trim();
    else break;
  }
  s = s.replace(
    /\b(sum|count|avg|min|max)\s*\(\s*\)\s*where\s+["'[`]?(.+?)["'\]`]?\s*=\s*['"]?([^'"]+?)['"]?\s*$/gi,
    (_m, agg: string, col: string, val: string) => `${agg}(${col.trim()}='${val.trim()}')`,
  );
  return s;
}

function parseTerm(term: string): { agg: Agg; field?: string; filter?: { field: string; value: string } } | null {
  const m = repairMetric(term).match(/^(sum|count|avg|min|max)\s*\(\s*([\s\S]*?)\s*\)$/i);
  if (!m) return null;
  const agg = m[1].toLowerCase() as Agg;
  const inner = m[2].trim();
  if (!inner) return { agg };
  const fm = inner.match(/^(.+?)\s*=\s*['"]?([^'"]*)['"]?$/);
  if (fm) return { agg, field: fm[1].trim(), filter: { field: fm[1].trim(), value: fm[2] } };
  return { agg, field: inner };
}

function evalTerm(rows: DataRow[], term: string): number {
  const parsed = parseTerm(term);
  if (!parsed) {
    const n = parseFloat(term);
    return isNaN(n) ? 0 : n;
  }
  const { agg, field, filter } = parsed;
  const filtered = filter ? rows.filter((r) => matchInline(r, filter)) : rows;

  if (agg === 'count') return filtered.length;
  if (!field) return 0;

  const values = filtered.map((r) => num(r[field]));
  switch (agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case 'min':
      return values.length ? Math.min(...values) : 0;
    case 'max':
      return values.length ? Math.max(...values) : 0;
    default:
      return 0;
  }
}

/** Avalia uma expressão de métrica (suporta uma razão "a / b"). */
export function evalMetric(rows: DataRow[], expr: string): number {
  if (!expr) return 0;
  const ratio = repairMetric(expr).split('/');
  if (ratio.length === 2) {
    const numr = evalTerm(rows, ratio[0]);
    const den = evalTerm(rows, ratio[1]);
    return den === 0 ? 0 : numr / den;
  }
  return evalTerm(rows, expr);
}

/** Série agrupada por dimensão x, agregando a métrica y. Retorna [{name, value}]. */
export function groupSeries(rows: DataRow[], x: string, y: string): Array<{ name: string; value: number }> {
  const groups = new Map<string, DataRow[]>();
  for (const r of rows) {
    const key = String(r[x] ?? '—');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out = Array.from(groups.entries()).map(([name, gr]) => ({
    name,
    value: Math.round(evalMetric(gr, y) * 100) / 100,
  }));
  const looksDate = out.every((o) => /^\d{4}-\d{2}/.test(o.name));
  return looksDate ? out.sort((a, b) => a.name.localeCompare(b.name)) : out.sort((a, b) => b.value - a.value);
}

/** Agrupa por mês (YYYY-MM) quando x é uma coluna de data YYYY-MM-DD. */
export function groupByMonth(rows: DataRow[], dateField: string, y: string): Array<{ name: string; value: number }> {
  const monthRows = rows.map((r) => ({ ...r, __month: String(r[dateField] ?? '').slice(0, 7) }));
  return groupSeries(monthRows, '__month', y);
}

/** Extrai os nomes de coluna referenciados numa expressão de métrica. */
export function metricColumns(expr: string): string[] {
  if (!expr) return [];
  const cols: string[] = [];
  for (const part of repairMetric(expr).split('/')) {
    const parsed = parseTerm(part);
    if (parsed?.field) cols.push(parsed.field);
  }
  return cols;
}

/** Valida que a métrica está dentro da gramática E só usa colunas existentes.
 *  Rejeita SQL/WHERE não-reparável, agg desconhecida e colunas inventadas.
 *  Usado para descartar alucinações da IA antes de renderizar. */
export function isValidMetric(expr: string, validCols: Set<string>): boolean {
  const repaired = repairMetric(expr);
  if (!repaired) return false;
  const parts = repaired.split('/');
  if (parts.length > 2) return false;
  return parts.every((raw) => {
    const t = raw.trim();
    if (!t) return false;
    if (/^\d+(\.\d+)?$/.test(t)) return true;
    const parsed = parseTerm(t);
    if (!parsed) return false;
    if (parsed.agg === 'count' && !parsed.field) return true;
    if (!parsed.field) return false;
    return validCols.has(parsed.field);
  });
}

/** Acha a 1ª coluna com cara de data (YYYY-MM-DD) nas linhas. */
export function findDateField(rows: DataRow[]): string | undefined {
  if (!rows.length) return undefined;
  const keys = Object.keys(rows[0]);
  for (const k of keys) {
    const sample = rows.find((r) => r[k] != null)?.[k];
    if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) return k;
  }
  return undefined;
}

export interface Trend {
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
}

/** Compara a métrica no último mês vs mês anterior (variação relativa). null se não der. */
export function metricTrend(rows: DataRow[], metric: string, dateField?: string): Trend | null {
  const df = dateField ?? findDateField(rows);
  if (!df) return null;
  const months = new Set<string>();
  for (const r of rows) {
    const m = String(r[df] ?? '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
  }
  const sorted = Array.from(months).sort();
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const cur = evalMetric(rows.filter((r) => String(r[df] ?? '').slice(0, 7) === last), metric);
  const old = evalMetric(rows.filter((r) => String(r[df] ?? '').slice(0, 7) === prev), metric);
  if (old === 0) return null;
  const deltaPct = (cur - old) / Math.abs(old);
  const direction = Math.abs(deltaPct) < 0.005 ? 'flat' : deltaPct > 0 ? 'up' : 'down';
  return { deltaPct, direction };
}

export function formatValue(value: number, format: 'number' | 'currency' | 'percentage'): string {
  if (format === 'currency') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  if (format === 'percentage') return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
