import { api } from '../../lib/apiClient';
import type { Solution } from './types';

export interface SolutionStats {
  totals: {
    total: number;
    publicados: number;
    desenvolvimento: number;
    planejados: number;
  };
  bySector: Array<{ sector: string; total: number }>;
}

export interface SolutionFilters {
  search?: string;
  sector?: string;
  status?: string;
  type?: string;
}

const buildQuery = (filters: SolutionFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const fetchSolutions = async (filters: SolutionFilters = {}): Promise<Solution[]> => {
  const { solutions } = await api.get<{ solutions: Solution[] }>(`/solutions${buildQuery(filters)}`);
  return solutions;
};

export const fetchSolutionStats = async (): Promise<SolutionStats> => api.get<SolutionStats>('/solutions/stats');

export type SolutionInput = {
  title: string;
  summary: string;
  sector: string;
  type?: string;
  status?: string;
  url?: string;
  ownerName?: string;
  ownerEmail?: string;
  technologies?: string[];
};

export const createSolution = async (input: SolutionInput): Promise<Solution> => {
  const { solution } = await api.post<{ solution: Solution }>('/solutions', input);
  return solution;
};

export const updateSolution = async (id: string, input: Partial<SolutionInput>): Promise<Solution> => {
  const { solution } = await api.put<{ solution: Solution }>(`/solutions/${id}`, input);
  return solution;
};
