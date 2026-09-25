export type SolutionSector =
  | 'financeiro'
  | 'planejamento'
  | 'rh'
  | 'juridico'
  | 'backoffice'
  | 'comercial'
  | 'marketing'
  | 'ti_ia'
  | 'operacao'
  | 'qualidade'
  | 'outros';

export type SolutionType = 'dashboard' | 'sistema' | 'automacao' | 'ia' | 'skill' | 'portal' | 'outro';

export type SolutionStatus = 'planejado' | 'em_desenvolvimento' | 'homologacao' | 'publicado' | 'pausado' | 'arquivado';

export interface Solution {
  id: string;
  title: string;
  summary: string;
  problem_solved: string | null;
  sector: SolutionSector;
  type: SolutionType;
  status: SolutionStatus;
  url: string | null;
  owner_name: string | null;
  owner_email: string | null;
  technologies: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'ideia' | 'planejado' | 'em_andamento' | 'bloqueado' | 'concluido' | 'cancelado';
export type ProjectPriority = 'baixa' | 'media' | 'alta' | 'critica';

export interface Project {
  id: string;
  title: string;
  description: string;
  sector: SolutionSector;
  status: ProjectStatus;
  priority: ProjectPriority;
  solution_id: string | null;
  solution_title?: string | null;
  owner_name: string | null;
  owner_email: string | null;
  progress: number;
  started_at: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SECTOR_OPTIONS: Array<{ value: SolutionSector; label: string }> = [
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'rh', label: 'RH' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'backoffice', label: 'Backoffice' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ti_ia', label: 'TI / IA' },
  { value: 'operacao', label: 'Operação' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'outros', label: 'Outros' },
];

export const TYPE_OPTIONS: Array<{ value: SolutionType; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'automacao', label: 'Automação' },
  { value: 'ia', label: 'IA' },
  { value: 'skill', label: 'Skill' },
  { value: 'portal', label: 'Portal' },
  { value: 'outro', label: 'Outro' },
];

export const STATUS_OPTIONS: Array<{ value: SolutionStatus; label: string }> = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_desenvolvimento', label: 'Em desenvolvimento' },
  { value: 'homologacao', label: 'Homologação' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'arquivado', label: 'Arquivado' },
];

export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'ideia', label: 'Ideia' },
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const PROJECT_PRIORITY_OPTIONS: Array<{ value: ProjectPriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];
