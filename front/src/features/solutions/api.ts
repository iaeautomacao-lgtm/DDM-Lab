import { api } from '../../lib/apiClient';
import type { Project, Solution } from './types';

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

const buildQuery = (filters: SolutionFilters | ProjectFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
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
  problemSolved?: string;
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

// ── Projetos ─────────────────────────────────────────────────────────────────

export interface ProjectFilters {
  sector?: string;
  status?: string;
  search?: string;
}

export const fetchProjects = async (filters: ProjectFilters = {}): Promise<Project[]> => {
  const { projects } = await api.get<{ projects: Project[] }>(`/projects${buildQuery(filters)}`);
  return projects;
};

export type ProjectInput = {
  title: string;
  description: string;
  sector: string;
  status?: string;
  priority?: string;
  solutionId?: string | null;
  ownerName?: string;
  ownerEmail?: string;
  progress?: number;
  startedAt?: string;
  dueDate?: string;
};

export const createProject = async (input: ProjectInput): Promise<Project> => {
  const { project } = await api.post<{ project: Project }>('/projects', input);
  return project;
};

export const updateProject = async (id: string, input: Partial<ProjectInput>): Promise<Project> => {
  const { project } = await api.put<{ project: Project }>(`/projects/${id}`, input);
  return project;
};
