import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Boxes, Code2, Loader2, Plus, Search, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SolutionCard } from './SolutionCard';
import { createSolution, fetchSolutionStats, fetchSolutions, updateSolution, type SolutionStats } from './api';
import { SECTOR_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, type Solution } from './types';

const SECTOR_FILTERS = [{ value: 'all', label: 'Todos' }, ...SECTOR_OPTIONS];

export const SolutionsPage = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [stats, setStats] = useState<SolutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [status, setStatus] = useState('all');

  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const [solutionsData, statsData] = await Promise.all([fetchSolutions(), fetchSolutionStats()]);
      setSolutions(solutionsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as solucoes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return solutions.filter((solution) => {
      const matchesSearch =
        !term ||
        solution.title.toLowerCase().includes(term) ||
        solution.summary.toLowerCase().includes(term) ||
        solution.owner_name?.toLowerCase().includes(term);
      const matchesSector = sector === 'all' || solution.sector === sector;
      const matchesStatus = status === 'all' || solution.status === status;
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [solutions, search, sector, status]);

  const openCreate = () => {
    setEditingSolution(null);
    setShowForm(true);
  };

  const openEdit = (solution: Solution) => {
    setEditingSolution(solution);
    setShowForm(true);
  };

  const handleSaved = async () => {
    setShowForm(false);
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-20 md:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">DDM Lab</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Soluções da empresa</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Dashboards, sistemas, automações e projetos de IA construídos pelos setores do Grupo DDM — consulte antes de
            começar algo do zero.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={17} />
          Nova solução
        </Button>
      </header>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Total de soluções" value={stats?.totals.total ?? 0} icon={<Boxes size={19} />} />
        <Metric label="Publicadas" value={stats?.totals.publicados ?? 0} icon={<Code2 size={19} />} />
        <Metric label="Em desenvolvimento" value={stats?.totals.desenvolvimento ?? 0} icon={<Bot size={19} />} highlighted />
        <Metric label="Planejadas" value={stats?.totals.planejados ?? 0} icon={<Plus size={19} />} />
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar solução, ferramenta ou responsável..."
            className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm outline-none placeholder:text-text-secondary/50 focus:border-primary/40"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-12 rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none"
        >
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {SECTOR_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSector(opt.value)}
            className={`whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
              sector === opt.value
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-secondary hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Todas as soluções</h2>
        <span className="text-xs text-text-secondary">
          {filtered.length} resultado{filtered.length !== 1 && 's'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filtered.length ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((solution) => (
            <SolutionCard key={solution.id} solution={solution} onSelect={openEdit} />
          ))}
        </section>
      ) : (
        <div className="py-20 text-center">
          <Boxes size={30} className="mx-auto mb-3 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">Nenhuma solução encontrada.</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <SolutionFormModal
            solution={editingSolution}
            onClose={() => setShowForm(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Metric = ({
  label,
  value,
  icon,
  highlighted = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlighted?: boolean;
}) => (
  <Card className={`p-5 ${highlighted ? 'border-primary/25 bg-primary/5' : ''}`}>
    <div className="mb-4 flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">{label}</span>
      <div className="text-primary">{icon}</div>
    </div>
    <strong className="text-3xl font-extrabold text-foreground">{value}</strong>
  </Card>
);

// ── Formulario de criacao/edicao ─────────────────────────────────────────────

interface SolutionFormModalProps {
  solution: Solution | null;
  onClose: () => void;
  onSaved: () => void;
}

const SolutionFormModal = ({ solution, onClose, onSaved }: SolutionFormModalProps) => {
  const [title, setTitle] = useState(solution?.title || '');
  const [summary, setSummary] = useState(solution?.summary || '');
  const [sector, setSector] = useState(solution?.sector || SECTOR_OPTIONS[0].value);
  const [type, setType] = useState(solution?.type || TYPE_OPTIONS[0].value);
  const [status, setStatus] = useState(solution?.status || STATUS_OPTIONS[0].value);
  const [url, setUrl] = useState(solution?.url || '');
  const [ownerName, setOwnerName] = useState(solution?.owner_name || '');
  const [ownerEmail, setOwnerEmail] = useState(solution?.owner_email || '');
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
        sector,
        type,
        status,
        url: url.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim() || undefined,
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

          <Field label="Resumo *">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              placeholder="O que essa solução faz, em 1-2 frases"
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

            <Field label="Tipo">
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
          </div>

          <Field label="Status">
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

          <Field label="Link da ferramenta">
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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-secondary/70">{label}</span>
    {children}
  </label>
);
