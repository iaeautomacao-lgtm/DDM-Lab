import { api } from '../apiClient';
import type { ColumnProfile, DashboardConfig, DataRow } from './types';

export interface ParsedSpreadsheet {
  fileName: string;
  rows: DataRow[];
  columns: string[];
  truncated: boolean;
  sheetName?: string;
  profile: ColumnProfile[];
}

/** Envia o arquivo (csv/xlsx/xls/json) pro servidor: ele parseia e perfila as colunas. */
export const parseSpreadsheetFile = async (file: File): Promise<ParsedSpreadsheet> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ParsedSpreadsheet>('/dashboards/parse-file', form);
};

/** Persiste a fonte de dados (linhas + perfil já confirmado pelo usuário). */
export const createDataSource = async (
  fileName: string,
  rows: DataRow[],
  profile: ColumnProfile[],
): Promise<{ dataSourceId: string; rowCount: number; columnCount: number }> =>
  api.post('/dashboards/data-sources', { fileName, rows, profile });

export interface StoredDataSource {
  id: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  profile: ColumnProfile[];
  rows: DataRow[];
  createdAt: string;
}

export const fetchDataSource = async (id: string): Promise<StoredDataSource> => {
  const { dataSource } = await api.get<{ dataSource: StoredDataSource }>(`/dashboards/data-sources/${id}`);
  return dataSource;
};

export interface DashboardSummary {
  id: string;
  name: string;
  objective: string | null;
  data_source_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardRow extends DashboardSummary {
  config: DashboardConfig;
}

export const fetchDashboards = async (): Promise<DashboardSummary[]> =>
  (await api.get<{ dashboards: DashboardSummary[] }>('/dashboards')).dashboards;

export const fetchDashboard = async (id: string): Promise<DashboardRow> =>
  (await api.get<{ dashboard: DashboardRow }>(`/dashboards/${id}`)).dashboard;

export const createDashboard = async (input: {
  name: string;
  objective?: string;
  config: DashboardConfig;
  dataSourceId?: string;
}): Promise<DashboardRow> => (await api.post<{ dashboard: DashboardRow }>('/dashboards', input)).dashboard;

export const updateDashboard = async (
  id: string,
  input: { name?: string; objective?: string; config?: DashboardConfig },
): Promise<DashboardRow> => (await api.put<{ dashboard: DashboardRow }>(`/dashboards/${id}`, input)).dashboard;

export const deleteDashboard = async (id: string): Promise<void> => {
  await api.delete(`/dashboards/${id}`);
};
