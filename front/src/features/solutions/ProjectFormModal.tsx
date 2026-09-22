import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from './Field';
import { createProject, updateProject } from './api';
import { PROJECT_PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS, SECTOR_OPTIONS, type Project, type Solution, type SolutionSector } from './types';

interface Props {
  project: Project | null;
  defaultSector?: SolutionSector;
  sectorSolutions: Solution[];
  onClose: () => void;
  onSaved: () => void;
}

export const ProjectFormModal = ({ project, defaultSector, sectorSolutions, onClose, onSaved }: Props) => {
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [sector, setSector] = useState(project?.sector || defaultSector || SECTOR_OPTIONS[0].value);
  const [status, setStatus] = useState(project?.status || PROJECT_STATUS_OPTIONS[0].value);
  const [priority, setPriority] = useState(project?.priority || 'media');
  const [solutionId, setSolutionId] = useState(project?.solution_id || '');
  const [ownerName, setOwnerName] = useState(project?.owner_name || '');
  const [ownerEmail, setOwnerEmail] = useState(project?.owner_email || '');
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [dueDate, setDueDate] = useState(project?.due_date ? project.due_date.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Titulo e descricao sao obrigatorios.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        sector,
        status,
        priority,
        solutionId: solutionId || null,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim() || undefined,
        progress: Number(progress),
        dueDate: dueDate || undefined,
      };
      if (project) {
        await updateProject(project.id, payload);
      } else {
        await createProject(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o projeto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{project ? 'Editar projeto' : 'Novo projeto'}</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Título *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="Ex.: Automação de acordos"
            />
          </Field>

          <Field label="Descrição *">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="O que esta sendo construido"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Setor *">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as typeof sector)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {SECTOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioridade">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {PROJECT_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Progresso (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>
          </div>

          <Field label="Vincular a uma solução já publicada (opcional)">
            <select
              value={solutionId}
              onChange={(e) => setSolutionId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
            >
              <option value="">Nenhuma</option>
              {sectorSolutions.map((sol) => (
                <option key={sol.id} value={sol.id}>
                  {sol.title}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável">
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>
            <Field label="Prazo">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>
          </div>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {project ? 'Salvar alterações' : 'Cadastrar projeto'}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};
