import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bot, Boxes, Code2, FolderKanban, Loader2, Plus, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SolutionCard } from './SolutionCard';
import { ProjectRow } from './ProjectRow';
import { SolutionFormModal } from './SolutionFormModal';
import { ProjectFormModal } from './ProjectFormModal';
import { fetchProjects, fetchSolutionStats, fetchSolutions, type SolutionStats } from './api';
import { SECTOR_OPTIONS, type Project, type Solution, type SolutionSector } from './types';

type SectorFilter = 'all' | SolutionSector;
type SectorTab = 'solutions' | 'projects';

export const SolutionsPage = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<SolutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sector, setSector] = useState<SectorFilter>('all');
  const [tab, setTab] = useState<SectorTab>('solutions');
  const [search, setSearch] = useState('');

  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [showSolutionForm, setShowSolutionForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const load = async () => {
    try {
      const [solutionsData, projectsData, statsData] = await Promise.all([
        fetchSolutions(),
        fetchProjects(),
        fetchSolutionStats(),
      ]);
      setSolutions(solutionsData);
      setProjects(projectsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as soluções.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sectorSolutions = useMemo(
    () => (sector === 'all' ? solutions : solutions.filter((s) => s.sector === sector)),
    [solutions, sector],
  );
  const sectorProjects = useMemo(
    () => (sector === 'all' ? [] : projects.filter((p) => p.sector === sector)),
    [projects, sector],
  );
  const activeSectorProjects = useMemo(
    () => sectorProjects.filter((p) => p.status === 'em_andamento' || p.status === 'planejado' || p.status === 'bloqueado'),
    [sectorProjects],
  );

  const filteredOverview = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return solutions;
    return solutions.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.summary.toLowerCase().includes(term) ||
        s.owner_name?.toLowerCase().includes(term),
    );
  }, [solutions, search]);

  const handleSaved = async () => {
    setShowSolutionForm(false);
    setShowProjectForm(false);
    await load();
  };

  const sectorLabel = sector === 'all' ? null : SECTOR_OPTIONS.find((s) => s.value === sector)?.label;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-20 md:px-0">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">DDM Lab</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Soluções da empresa</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Dashboards, sistemas, automações e projetos de IA construídos pelos setores do Grupo DDM — consulte antes de
          começar algo do zero.
        </p>
      </header>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Selecao de setor: Visao Geral + cada setor. Quebra linha em vez de
          scroll horizontal — a barra de rolagem cinza embaixo ficava feia. */}
      <nav className="flex flex-wrap gap-2">
        <SectorButton label="Visão Geral" active={sector === 'all'} onClick={() => setSector('all')} />
        {SECTOR_OPTIONS.map((opt) => (
          <SectorButton key={opt.value} label={opt.label} active={sector === opt.value} onClick={() => setSector(opt.value)} />
        ))}
      </nav>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : sector === 'all' ? (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Total de soluções" value={stats?.totals.total ?? 0} icon={<Boxes size={19} />} />
            <Metric label="Publicadas" value={stats?.totals.publicados ?? 0} icon={<Code2 size={19} />} />
            <Metric label="Em desenvolvimento" value={stats?.totals.desenvolvimento ?? 0} icon={<Bot size={19} />} highlighted />
            <Metric label="Planejadas" value={stats?.totals.planejados ?? 0} icon={<Plus size={19} />} />
          </section>

          <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-surface px-4 shadow-[var(--shadow-card)] transition focus-within:border-primary/40">
            <Search size={17} className="shrink-0 text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar solução, ferramenta ou responsável..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            />
          </label>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Todas as soluções</h2>
            <span className="text-xs text-text-secondary">
              {filteredOverview.length} resultado{filteredOverview.length !== 1 && 's'}
            </span>
          </div>

          {filteredOverview.length ? (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOverview.map((solution) => (
                <SolutionCard key={solution.id} solution={solution} onSelect={(s) => { setEditingSolution(s); setShowSolutionForm(true); }} />
              ))}
            </section>
          ) : (
            <EmptyState text="Nenhuma solução encontrada." />
          )}
        </>
      ) : (
        <>
          {/* Cabecalho do setor selecionado */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Portal do setor</span>
              <h2 className="mt-2 text-2xl font-bold text-foreground">{sectorLabel}</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {sectorSolutions.length} soluções · {activeSectorProjects.length} projetos ativos
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingProject(null);
                  setShowProjectForm(true);
                }}
              >
                <FolderKanban size={16} />
                Novo projeto
              </Button>
              <Button
                onClick={() => {
                  setEditingSolution(null);
                  setShowSolutionForm(true);
                }}
              >
                <Plus size={16} />
                Nova solução
              </Button>
            </div>
          </header>

          {/* Abas Solucoes / Projetos */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <TabButton label="Soluções" active={tab === 'solutions'} onClick={() => setTab('solutions')} />
            <TabButton label="Projetos em andamento" active={tab === 'projects'} onClick={() => setTab('projects')} />
          </div>

          {tab === 'solutions' ? (
            sectorSolutions.length ? (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sectorSolutions.map((solution) => (
                  <SolutionCard key={solution.id} solution={solution} onSelect={(s) => { setEditingSolution(s); setShowSolutionForm(true); }} />
                ))}
              </section>
            ) : (
              <EmptyState text="Nenhuma solução cadastrada neste setor ainda." />
            )
          ) : sectorProjects.length ? (
            <div className="space-y-3">
              {sectorProjects.map((project) => (
                <ProjectRow key={project.id} project={project} onSelect={(p) => { setEditingProject(p); setShowProjectForm(true); }} />
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum projeto em andamento neste setor ainda." />
          )}
        </>
      )}

      <AnimatePresence>
        {showSolutionForm && (
          <SolutionFormModal
            solution={editingSolution}
            defaultSector={sector === 'all' ? undefined : sector}
            onClose={() => setShowSolutionForm(false)}
            onSaved={handleSaved}
          />
        )}
        {showProjectForm && (
          <ProjectFormModal
            project={editingProject}
            defaultSector={sector === 'all' ? undefined : sector}
            sectorSolutions={sector === 'all' ? solutions : sectorSolutions}
            onClose={() => setShowProjectForm(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SectorButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-border bg-surface text-text-secondary hover:border-border/60 hover:text-foreground'
    }`}
  >
    {label}
  </button>
);

const TabButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-foreground'
    }`}
  >
    {label}
  </button>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-20 text-center">
    <Boxes size={30} className="mx-auto mb-3 text-text-secondary/40" />
    <p className="text-sm text-text-secondary">{text}</p>
  </div>
);

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
  <Card className="rounded-2xl p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-border-hover">
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{label}</span>
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${highlighted ? 'bg-primary/10 text-primary' : 'bg-surface-hover text-text-secondary'}`}>
        {icon}
      </div>
    </div>
    <strong className="mt-6 block text-3xl font-semibold tracking-tight text-foreground">{value}</strong>
  </Card>
);
