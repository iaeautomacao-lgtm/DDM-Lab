import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Check, Download, Loader2, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  CATEGORY_OPTIONS,
  VISIBILITY_LABEL,
  deleteSkill,
  moderateSkill,
  skillDownloadUrl,
  submitSkillForReview,
  formatFileSize,
  type Skill,
} from '../../lib/skillsData';

interface Props {
  skill: Skill;
  onClose: () => void;
  onChanged: () => void;
}

const VISIBILITY_CLASSES: Record<Skill['visibility'], string> = {
  publicada: 'bg-emerald-500/10 text-emerald-600',
  em_revisao: 'bg-blue-500/10 text-blue-600',
  privada: 'bg-surface-hover text-text-secondary',
  rejeitada: 'bg-red-500/10 text-red-500',
};

export const SkillDetailsModal = ({ skill, onClose, onChanged }: Props) => {
  const { profile, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [moderationNote, setModerationNote] = useState('');

  const isOwner = skill.created_by === profile?.uid;
  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === skill.category)?.label ?? skill.category ?? 'Outro';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!confirm(`Excluir a skill "${skill.name}"? Essa ação não pode ser desfeita.`)) return;
    run(async () => {
      await deleteSkill(skill.id);
      onClose();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{skill.name}</h3>
              <p className="text-xs text-text-secondary">
                {categoryLabel} · v{skill.version} · {skill.compatibility}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${VISIBILITY_CLASSES[skill.visibility]}`}>
            {VISIBILITY_LABEL[skill.visibility]}
          </span>
          <span className="text-xs text-text-secondary">
            Por {skill.author_name || 'Alguém do time'} · {skill.download_count} downloads · {formatFileSize(skill.file_size)}
          </span>
        </div>

        <p className="text-sm leading-6 text-text-secondary">{skill.description}</p>

        {skill.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skill.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-text-secondary">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {skill.visibility === 'rejeitada' && skill.moderation_note && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Motivo da recusa</p>
            <p className="mt-1 text-xs text-text-secondary">{skill.moderation_note}</p>
          </div>
        )}

        {error && <p className="mt-4 text-xs font-medium text-red-400">{error}</p>}

        {/* Moderacao (admin, skill em revisao) */}
        {isAdmin && skill.visibility === 'em_revisao' && (
          <div className="mt-5 space-y-3 rounded-xl border border-border bg-surface-hover/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Moderação</p>
            <textarea
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              rows={2}
              placeholder="Motivo (obrigatório se recusar)"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => moderateSkill(skill.id, 'publicada'))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                <Check size={15} />
                Publicar
              </button>
              <button
                disabled={busy || !moderationNote.trim()}
                onClick={() => run(() => moderateSkill(skill.id, 'rejeitada', moderationNote))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                <X size={15} />
                Recusar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <a
            href={skillDownloadUrl(skill.id)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            <Download size={15} />
            Baixar .zip
          </a>

          {isOwner && ['privada', 'rejeitada'].includes(skill.visibility) && (
            <button
              disabled={busy}
              onClick={() => run(() => submitSkillForReview(skill.id))}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-border-hover hover:text-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar para revisão
            </button>
          )}

          {(isOwner || isAdmin) && (
            <button
              disabled={busy}
              onClick={handleDelete}
              className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
