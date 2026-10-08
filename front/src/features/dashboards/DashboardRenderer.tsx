import { useMemo, useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import {
  DollarSign, Users, Clock, Percent, AlertTriangle, ShoppingCart,
  Target, TrendingUp, TrendingDown, Hash, Activity, BarChart3, CheckCircle2, Calendar, Minus,
} from 'lucide-react';
import type { DashboardConfig, DataRow, Widget, Kpi, KpiIcon } from '../../lib/dashboards/types';
import { evalMetric, groupSeries, groupByMonth, formatValue, metricTrend, findDateField } from '../../lib/dashboards/aggregate';
import { lineOption, barOption, donutOption } from '../../lib/dashboards/echartsOptions';

const ICONS: Record<KpiIcon, typeof DollarSign> = {
  money: DollarSign, users: Users, time: Clock, percent: Percent, alert: AlertTriangle,
  cart: ShoppingCart, target: Target, trend: TrendingUp, count: Hash, activity: Activity,
  chart: BarChart3, check: CheckCircle2, calendar: Calendar,
};

// Wrapper leve sobre ECharts: cria/atualiza/redimensiona/descarta a instância.
function EChart({ option, height = 240 }: { option: any; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => chart.current?.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);
  useEffect(() => { chart.current?.setOption(option, true); }, [option]);
  return <div ref={ref} style={{ width: '100%', height }} />;
}

function isDateField(rows: DataRow[], field?: string): boolean {
  if (!field) return false;
  const sample = rows.find((r) => r[field] != null)?.[field];
  return typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample);
}

function KpiCard({ kpi, rows, dateField }: { kpi: Kpi; rows: DataRow[]; dateField?: string }) {
  const { value, trend } = useMemo(() => ({
    value: evalMetric(rows, kpi.metric),
    trend: metricTrend(rows, kpi.metric, dateField),
  }), [kpi, rows, dateField]);

  const Icon = ICONS[kpi.icon ?? 'count'] ?? Hash;
  const good = kpi.goodDirection ?? 'up';
  const isGood = trend ? (trend.direction === 'up' ? good === 'up' : good === 'down') : false;
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = !trend || trend.direction === 'flat' ? 'text-text-secondary' : isGood ? 'text-emerald-400' : 'text-red-400';

  return (
    <div data-export-block="kpi" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs uppercase tracking-wider text-text-secondary">{kpi.title}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-bold leading-none text-foreground">{formatValue(value, kpi.format)}</p>
      <div className="flex min-h-[16px] items-center gap-2">
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.direction !== 'flat' && `${(Math.abs(trend.deltaPct) * 100).toFixed(1)}%`}
          </span>
        )}
        <span className="truncate text-[11px] text-text-secondary">{kpi.subtitle ?? (trend ? 'vs mês anterior' : kpi.metric)}</span>
      </div>
    </div>
  );
}

function WidgetCard({ widget, rows, primary }: { widget: Widget; rows: DataRow[]; primary?: string }) {
  const series = useMemo(() => {
    const { x, y } = widget.query;
    if (!x || !y) return [];
    if (widget.type === 'line' && isDateField(rows, x)) return groupByMonth(rows, x, y);
    return groupSeries(rows, x, y);
  }, [widget, rows]);

  const option = useMemo(() => {
    if (!series.length) return null;
    if (widget.type === 'line') return lineOption(series, primary);
    if (widget.type === 'donut') return donutOption(series);
    if (widget.type === 'ranking' || widget.type === 'table') return null;
    return barOption(series, primary);
  }, [series, widget.type, primary]);

  const isList = widget.type === 'ranking' || widget.type === 'table';
  const maxVal = isList ? Math.max(...series.map((s) => s.value), 1) : 0;

  return (
    <div data-export-block="widget" className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{widget.title}</h3>
      <div className="min-h-[240px] flex-1">
        {series.length === 0 ? (
          <p className="text-xs text-text-secondary">Sem dados para exibir.</p>
        ) : isList ? (
          <div className="space-y-2.5">
            {series.slice(0, 8).map((s, i) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate text-foreground">
                    <span className="w-4 shrink-0 text-xs text-text-secondary">{i + 1}.</span>
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 font-medium text-foreground">{s.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(s.value / maxVal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EChart option={option} height={240} />
        )}
      </div>
    </div>
  );
}

export const DashboardRenderer = ({ config, rows }: { config: DashboardConfig; rows: DataRow[] }) => {
  const dateField = useMemo(() => findDateField(rows), [rows]);
  return (
    <div className="w-full space-y-6">
      <div data-export-block="header" className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{config.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{config.objective}</p>
        </div>
        {config.filters.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {config.filters.map((f) => (
              <span key={f.field} className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs text-text-secondary">
                {f.label ?? f.field}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {config.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} rows={rows} dateField={dateField} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {config.widgets.map((w) => (
          <WidgetCard key={w.id} widget={w} rows={rows} primary={config.brand?.primary} />
        ))}
      </div>

      {config.insights && config.insights.length > 0 && (
        <div data-export-block="insights" className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Insights da IA</h3>
          <ul className="space-y-1.5">
            {config.insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="text-primary">•</span>
                {ins}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
