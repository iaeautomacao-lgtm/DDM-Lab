import { motion } from 'framer-motion';
import { ArrowUpRight, Bot, Gauge, Globe, LayoutDashboard, Settings2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SECTOR_OPTIONS, type Solution, type SolutionType } from './types';

// Mostra o link sem "https://" e sem barra final: meeting.grupoddm.ia.br/app
const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

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
  publicado: 'bg-emerald-500/10 text-emerald-600',
  em_desenvolvimento: 'bg-primary/10 text-primary',
  homologacao: 'bg-purple-500/10 text-purple-600',
  planejado: 'bg-blue-500/10 text-blue-600',
  pausado: 'bg-yellow-500/10 text-yellow-700',
  arquivado: 'bg-zinc-500/10 text-zinc-500',
};

interface Props {
  solution: Solution;
  onSelect?: (solution: Solution) => void;
}

export const SolutionCard = ({ solution, onSelect }: Props) => {
  const Icon = TYPE_ICONS[solution.type] ?? Settings2;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="group">
      <Card
        hoverable
        onClick={() => onSelect?.(solution)}
        className="flex min-h-[290px] flex-col rounded-2xl p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-border/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon size={20} />
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASSES[solution.status]}`}>
            {STATUS_LABEL[solution.status]}
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary/70">
            {SECTOR_OPTIONS.find((s) => s.value === solution.sector)?.label ?? solution.sector}
          </div>

          <h3 className="text-lg font-semibold tracking-tight text-foreground">{solution.title}</h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{solution.summary}</p>
        </div>

        {solution.problem_solved && (
          <div className="mt-4 rounded-xl border border-border bg-surface-hover/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">O que resolve</div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{solution.problem_solved}</p>
          </div>
        )}

        {solution.url && (
          <a
            href={solution.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-4 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            title={solution.url}
          >
            <Globe size={14} className="shrink-0" />
            <span className="truncate">{displayUrl(solution.url)}</span>
          </a>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-text-secondary/70">Responsável</span>
            <span className="text-sm font-medium text-foreground">{solution.owner_name || 'Não definido'}</span>
          </div>

          {solution.url && (
            <a
              href={solution.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-text-secondary transition-colors group-hover:bg-foreground group-hover:text-background"
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
