import { motion } from 'framer-motion';
import { Bot, Download, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { CATEGORY_OPTIONS, VISIBILITY_LABEL, type Skill } from '../../lib/skillsData';

const VISIBILITY_CLASSES: Record<Skill['visibility'], string> = {
  publicada: 'bg-emerald-500/10 text-emerald-600',
  em_revisao: 'bg-blue-500/10 text-blue-600',
  privada: 'bg-surface-hover text-text-secondary',
  rejeitada: 'bg-red-500/10 text-red-500',
};

interface Props {
  skill: Skill;
  isOwner: boolean;
  onSelect: (skill: Skill) => void;
}

export const SkillCard = ({ skill, isOwner, onSelect }: Props) => {
  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === skill.category)?.label ?? skill.category ?? 'Outro';

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
      <Card
        hoverable
        onClick={() => onSelect(skill)}
        className="flex min-h-[240px] flex-col rounded-2xl p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-border-hover"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot size={20} />
          </div>
          {(isOwner || skill.visibility !== 'privada') && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${VISIBILITY_CLASSES[skill.visibility]}`}>
              {VISIBILITY_LABEL[skill.visibility]}
            </span>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <span>{categoryLabel}</span>
            <span className="text-text-tertiary/60">·</span>
            <span>v{skill.version}</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{skill.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{skill.description}</p>
        </div>

        {skill.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wider text-text-tertiary">Por</span>
            <span className="truncate text-sm font-medium text-foreground">{skill.author_name || 'Alguém do time'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1" title="Downloads">
              <Download size={13} />
              {skill.download_count}
            </span>
            <span className="flex items-center gap-1 font-medium text-primary">
              <Eye size={13} />
              Ver detalhes
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
