import { motion } from 'framer-motion';
import { ArrowUpRight, Bot, Gauge, LayoutDashboard, Settings2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import type { Solution, SolutionType } from './types';

const TYPE_ICONS: Record<SolutionType, React.ElementType> = {
  dashboard: LayoutDashboard,
  sistema: Settings2,
  automacao: Gauge,
  ia: Bot,
  skill: Bot,
  portal: LayoutDashboard,
  outro: Settings2,
};

const STATUS_LABEL: Record<Solution['status'], string> = {
  planejado: 'Planejado',
  em_desenvolvimento: 'Em desenvolvimento',
  homologacao: 'Homologação',
  publicado: 'Publicado',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
};

const STATUS_CLASSES: Record<Solution['status'], string> = {
  publicado: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  em_desenvolvimento: 'border-primary/20 bg-primary/10 text-primary',
  homologacao: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
  planejado: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  pausado: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  arquivado: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
};

interface Props {
  solution: Solution;
  onSelect?: (solution: Solution) => void;
}

export const SolutionCard = ({ solution, onSelect }: Props) => {
  const Icon = TYPE_ICONS[solution.type] ?? Settings2;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
      <Card
        hoverable
        onClick={() => onSelect?.(solution)}
        className="p-5 transition-colors hover:border-primary/30"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Icon size={20} />
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASSES[solution.status]}`}>
            {STATUS_LABEL[solution.status]}
          </span>
        </div>

        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          {solution.sector.replace('_', ' ')}
        </div>

        <h3 className="mb-2 text-lg font-bold text-foreground">{solution.title}</h3>

        <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-text-secondary">{solution.summary}</p>

        {solution.problem_solved && (
          <div className="mt-4 rounded-xl border border-border bg-surface-hover/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">O que resolve</div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{solution.problem_solved}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-text-secondary/70">Responsável</span>
            <span className="text-xs text-foreground">{solution.owner_name || 'Não definido'}</span>
          </div>

          {solution.url && (
            <a
              href={solution.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-text-secondary transition-colors hover:bg-primary hover:text-white"
              title="Abrir ferramenta"
            >
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
