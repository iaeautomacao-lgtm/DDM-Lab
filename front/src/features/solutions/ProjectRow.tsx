import { Card } from '../../components/ui/Card';
import type { Project } from './types';

const STATUS_LABEL: Record<Project['status'], string> = {
  ideia: 'Ideia',
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_CLASSES: Record<Project['status'], string> = {
  ideia: 'bg-zinc-500/10 text-zinc-400',
  planejado: 'bg-blue-500/10 text-blue-400',
  em_andamento: 'bg-primary/10 text-primary',
  bloqueado: 'bg-red-500/10 text-red-400',
  concluido: 'bg-emerald-500/10 text-emerald-400',
  cancelado: 'bg-zinc-500/10 text-zinc-500 line-through',
};

const PRIORITY_CLASSES: Record<Project['priority'], string> = {
  baixa: 'text-text-secondary',
  media: 'text-blue-400',
  alta: 'text-orange-400',
  critica: 'text-red-400',
};

interface Props {
  project: Project;
  onSelect?: (project: Project) => void;
}

export const ProjectRow = ({ project, onSelect }: Props) => (
  <Card hoverable onClick={() => onSelect?.(project)} className="p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{project.title}</h3>
          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_CLASSES[project.status]}`}>
            {STATUS_LABEL[project.status]}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_CLASSES[project.priority]}`}>
            {project.priority}
          </span>
        </div>

        <p className="mt-2 max-w-3xl text-sm text-text-secondary">{project.description}</p>

        {project.solution_title && (
          <p className="mt-3 text-xs text-text-secondary/70">
            Solução vinculada: <span className="text-foreground">{project.solution_title}</span>
          </p>
        )}
      </div>

      <div className="w-full shrink-0 md:w-52">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-text-secondary">Progresso</span>
          <span className="text-foreground">{project.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-text-secondary">{project.owner_name || 'Sem responsável'}</p>
        {project.due_date && (
          <p className="mt-1 text-xs text-text-secondary/70">
            Prazo: {new Date(project.due_date).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  </Card>
);
