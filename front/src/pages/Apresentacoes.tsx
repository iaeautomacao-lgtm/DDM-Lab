import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Download, FileText, History, Loader2,
  Presentation as PresentationIcon, Save, Sparkles, Trash2, Wand2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { generatePresentationDeck } from '../lib/presentationGenerator';
import { exportPresentationToPptx } from '../lib/pptxExport';
import {
  createPresentation, deletePresentation, fetchPresentation, fetchPresentations, updatePresentation,
  THEME_OPTIONS, type Presentation, type PresentationSummary, type PresentationTheme, type Slide,
} from '../lib/presentationsData';
import { SlideRenderer } from '../features/presentations/SlideRenderer';

type Tab = 'criar' | 'historico';

export const Apresentacoes = () => {
  const [activeTab, setActiveTab] = useState<Tab>('criar');

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [theme, setTheme] = useState<PresentationTheme>('ddm');

  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<PresentationSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = () => {
    setIsLoadingHistory(true);
    fetchPresentations()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setIsLoadingHistory(false));
  };

  useEffect(() => {
    if (activeTab === 'historico') loadHistory();
  }, [activeTab]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Digite um título para a apresentação.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const deck = await generatePresentationDeck(title.trim(), objective.trim());
      setDeckTitle(deck.title);
      setSlides(deck.slides);
      setSlideIndex(0);
      setPresentationId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar a apresentação agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!slides) return;
    setIsSaving(true);
    setError('');
    try {
      if (presentationId) {
        await updatePresentation(presentationId, { title: deckTitle, objective, theme, slides });
      } else {
        const saved = await createPresentation({ title: deckTitle, objective, theme, slides });
        setPresentationId(saved.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a apresentação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!slides) return;
    setIsExporting(true);
    setError('');
    try {
      await exportPresentationToPptx({ title: deckTitle, theme, slides });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o arquivo .pptx.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadFromHistory = async (item: PresentationSummary) => {
    setActiveTab('criar');
    setError('');
    try {
      const full = await fetchPresentation(item.id);
      setPresentationId(full.id);
      setDeckTitle(full.title);
      setTitle(full.title);
      setObjective(full.objective || '');
      setTheme(full.theme);
      setSlides(full.slides);
      setSlideIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir essa apresentação.');
    }
  };

  const handleDeleteFromHistory = async (item: PresentationSummary) => {
    if (!confirm(`Excluir "${item.title}"? Essa ação não pode ser desfeita.`)) return;
    await deletePresentation(item.id).catch(() => {});
    if (presentationId === item.id) {
      setPresentationId(null);
      setSlides(null);
    }
    loadHistory();
  };

  const currentSlide = slides?.[slideIndex] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20 md:px-0">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">DDM Lab</div>
        <h1 className="text-3xl font-extrabold tracking-tight">DDM Apresentações</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Descreva o assunto e a IA monta uma apresentação profissional — visualize aqui e baixe em .pptx pronta pra
          reunião.
        </p>
      </header>

      <div className="inline-flex rounded-xl border border-border bg-surface p-1">
        <TabButton label="Criar" icon={<Wand2 size={14} />} active={activeTab === 'criar'} onClick={() => setActiveTab('criar')} />
        <TabButton label="Histórico" icon={<History size={14} />} active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} />
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {activeTab === 'criar' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Painel de configuracao */}
          <Card className="h-fit space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Título *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Resultados do trimestre"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Objetivo / contexto
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                placeholder="Pra quem é, o que precisa convencer ou explicar, dados importantes..."
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Tema visual
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    title={opt.hint}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                      theme === opt.value
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-text-secondary hover:border-border-hover hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full justify-center">
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? 'Gerando apresentação...' : slides ? 'Gerar de novo' : 'Gerar apresentação'}
            </Button>

            {slides && (
              <div className="space-y-2 border-t border-border pt-4">
                <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="w-full justify-center">
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {presentationId ? 'Salvar alterações' : 'Salvar apresentação'}
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={isExporting} className="w-full justify-center">
                  {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Baixar .pptx
                </Button>
              </div>
            )}
          </Card>

          {/* Pre-visualizacao */}
          <div className="space-y-4">
            {!slides ? (
              <Card className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-10 text-center">
                <PresentationIcon size={32} className="text-text-secondary/40" />
                <p className="text-sm text-text-secondary">
                  Preencha o título e o objetivo ao lado e clique em <span className="text-foreground">Gerar apresentação</span>.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="truncate text-lg font-bold text-foreground">{deckTitle}</h2>
                  <span className="shrink-0 text-xs text-text-secondary">
                    Slide {slideIndex + 1} de {slides.length}
                  </span>
                </div>

                {currentSlide && <SlideRenderer slide={currentSlide} theme={theme} index={slideIndex} total={slides.length} />}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        className={`h-1.5 w-5 rounded-full transition-colors ${
                          i === slideIndex ? 'bg-primary' : 'bg-surface-hover hover:bg-border-hover'
                        }`}
                        title={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                    disabled={slideIndex === slides.length - 1}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground disabled:opacity-30"
                  >
                    Próximo
                    <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key="historico" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {isLoadingHistory ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={28} />
              </div>
            ) : history.length === 0 ? (
              <Card className="p-10 text-center text-text-secondary">
                <FileText size={30} className="mx-auto mb-3 text-text-secondary/40" />
                <p className="text-sm">Nenhuma apresentação salva ainda.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((item) => (
                  <Card key={item.id} hoverable onClick={() => handleLoadFromHistory(item)} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFromHistory(item);
                        }}
                        className="shrink-0 text-text-secondary hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Tema {THEME_OPTIONS.find((t) => t.value === item.theme)?.label} · {new Date(item.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

const TabButton = ({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-foreground'
    }`}
  >
    {icon}
    {label}
  </button>
);
