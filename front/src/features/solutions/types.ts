export type SolutionSector =
  | 'financeiro'
  | 'planejamento'
  | 'rh'
  | 'juridico'
  | 'backoffice'
  | 'comercial'
  | 'marketing'
  | 'ti_ia'
  | 'outros';

export type SolutionType = 'dashboard' | 'sistema' | 'automacao' | 'ia' | 'skill' | 'outro';

export type SolutionStatus = 'planejado' | 'em_desenvolvimento' | 'publicado' | 'pausado' | 'arquivado';

export interface Solution {
  id: string;
  title: string;
  summary: string;
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

export const SECTOR_OPTIONS: Array<{ value: SolutionSector; label: string }> = [
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'rh', label: 'RH' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'backoffice', label: 'Backoffice' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ti_ia', label: 'TI / IA' },
  { value: 'outros', label: 'Outros' },
];

export const TYPE_OPTIONS: Array<{ value: SolutionType; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'automacao', label: 'Automação' },
  { value: 'ia', label: 'IA' },
  { value: 'skill', label: 'Skill' },
  { value: 'outro', label: 'Outro' },
];

export const STATUS_OPTIONS: Array<{ value: SolutionStatus; label: string }> = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_desenvolvimento', label: 'Em desenvolvimento' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'arquivado', label: 'Arquivado' },
];
