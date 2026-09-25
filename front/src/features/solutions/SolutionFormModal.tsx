import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from './Field';
import { createSolution, updateSolution } from './api';
import { SECTOR_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, type Solution, type SolutionSector } from './types';

interface Props {
  solution: Solution | null;
  defaultSector?: SolutionSector;
  onClose: () => void;
  onSaved: () => void;
}

export const SolutionFormModal = ({ solution, defaultSector, onClose, onSaved }: Props) => {
  const [title, setTitle] = useState(solution?.title || '');
  const [summary, setSummary] = useState(solution?.summary || '');
  const [problemSolved, setProblemSolved] = useState(solution?.problem_solved || '');
  const [sector, setSector] = useState(solution?.sector || defaultSector || SECTOR_OPTIONS[0].value);
  const [type, setType] = useState(solution?.type || TYPE_OPTIONS[0].value);
  const [status, setStatus] = useState(solution?.status || STATUS_OPTIONS[0].value);
  const [url, setUrl] = useState(solution?.url || '');
  const [ownerName, setOwnerName] = useState(solution?.owner_name || '');
  const [ownerEmail, setOwnerEmail] = useState(solution?.owner_email || '');
  const [restricted, setRestricted] = useState(solution?.restricted ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      setError('Titulo e resumo sao obrigatorios.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        problemSolved: problemSolved.trim() || undefined,
        sector,
        type,
        status,
        url: url.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim() || undefined,
        restricted,
      };
      if (solution) {
        await updateSolution(solution.id, payload);
      } else {
        await createSolution(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar a solucao.');
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
          <h3 className="text-lg font-bold text-foreground">{solution ? 'Editar solução' : 'Nova solução'}</h3>
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
              placeholder="Ex.: DRE 2026"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
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

            <Field label="Tipo *">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status *">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Resumo *">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="O que essa solução faz, em 1-2 frases"
            />
          </Field>

          <Field label="O que essa solução resolve?">
            <textarea
              value={problemSolved}
              onChange={(e) => setProblemSolved(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="Qual problema do setor essa solução resolve"
            />
          </Field>

          <Field label="Domínio / URL da solução">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="https://..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável">
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>
            <Field label="E-mail do responsável">
              <input
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-hover/40 p-3">
            <input
              type="checkbox"
              checked={restricted}
              onChange={(e) => setRestricted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Lock size={13} />
                Solução restrita
              </span>
              <span className="mt-0.5 block text-xs text-text-secondary">
                Contém dados sensíveis (login/senha, informações financeiras etc.). Só diretores, admins e quem criou
                conseguem ver esta solução no painel.
              </span>
            </span>
          </label>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {solution ? 'Salvar alterações' : 'Cadastrar solução'}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};
