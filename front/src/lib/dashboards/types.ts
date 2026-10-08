// Contrato central do DDM Dashboards (portado do protótipo "DASHBOARD CREATOR").
// A IA gera um DashboardConfig; o frontend renderiza a partir dele.

export type DataType = 'date' | 'number' | 'currency' | 'category' | 'id' | 'text';
export type ColumnRole = 'metric' | 'dimension' | 'date' | 'ignore';

export interface ColumnProfile {
  originalName: string;
  semanticName?: string;
  dataType: DataType;
  role: ColumnRole;
  sampleValues: string[];
  nullCount: number;
  distinctCount: number;
  issues: string[];
}

export type KpiFormat = 'number' | 'currency' | 'percentage';

export type KpiIcon =
  | 'money' | 'users' | 'time' | 'percent' | 'alert' | 'cart'
  | 'target' | 'trend' | 'count' | 'activity' | 'chart' | 'check' | 'calendar';

export interface Kpi {
  id: string;
  title: string;
  /** Expressão sobre colunas existentes. Ex: "sum(valor_acordo)", "count()", "acordos / cliques" */
  metric: string;
  format: KpiFormat;
  icon?: KpiIcon;
  subtitle?: string;
  /** Direção "boa" da métrica: "up" (maior melhor) ou "down" (menor melhor, ex: FPD/inadimplência). */
  goodDirection?: 'up' | 'down';
  target?: number;
  comparison?: 'previous_month' | 'previous_period';
  confidence?: number;
}

export type WidgetType = 'kpi_card' | 'line' | 'bar' | 'donut' | 'funnel' | 'table' | 'ranking' | 'heatmap' | 'insight';

export interface WidgetQuery {
  x?: string;
  y?: string;
  dimension?: string;
  metric?: string;
  agg?: 'sum' | 'count' | 'avg';
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  query: WidgetQuery;
  layout: WidgetLayout;
  style?: { color?: string; showLabels?: boolean; showVariation?: boolean };
  value?: string;
}

export interface Filter {
  field: string;
  label?: string;
  type: 'date_range' | 'select' | 'multi_select';
}

export type DashboardTheme = 'ddm_dark' | 'ddm_light' | 'executive' | 'custom';

export interface DashboardConfig {
  id: string;
  name: string;
  objective: string;
  audience: string;
  theme: DashboardTheme;
  brand: { logoUrl?: string; primary?: string; accent?: string };
  dataSourceId: string;
  filters: Filter[];
  kpis: Kpi[];
  widgets: Widget[];
  insights?: string[];
}

/** Linha genérica de um dataset carregado. */
export type DataRow = Record<string, string | number | null>;
