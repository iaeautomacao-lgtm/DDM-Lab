import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, FileText, History, Loader2,
  Plus, Presentation as PresentationIcon, Save, Sparkles, Trash2, Upload, Wand2, X, ZoomIn,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { generatePresentationDeck } from '../lib/presentationGenerator';
import { exportPresentationToPptx } from '../lib/pptxExport';
import {
  createPresentation, deletePresentation, fetchPresentation, fetchPresentations, updatePresentation,
  SLIDE_COUNT_OPTIONS, THEME_OPTIONS,
  type Presentation, type PresentationSummary, type PresentationTheme, type Slide, type SlideType,
} from '../lib/presentationsData';
import { SlideRenderer } from '../features/presentations/SlideRenderer';

type Tab = 'criar' | 'historico';

const SLIDE_TYPE_OPTIONS: Array<{ value: SlideType; label: string }> = [
  { value: 'capa', label: 'Capa' },
  { value: 'topicos', label: 'Tópicos' },
  { value: 'duas_colunas', label: 'Duas colunas' },
  { value: 'citacao', label: 'Citação' },
  { value: 'fechamento', label: 'Fechamento' },
];

const blankSlide = (type: SlideType): Slide => {
  switch (type) {
    case 'capa':
      return { type, title: 'Título da capa', subtitle: 'Subtítulo' };
    case 'duas_colunas':
      return {
        type,
        title: 'Título do slide',
        columnLeft: { heading: 'Coluna A', bullets: ['Ponto 1'] },
        columnRight: { heading: 'Coluna B', bullets: ['Ponto 1'] },
      };
    case 'citacao':
      return { type, quote: 'Frase de efeito aqui.', quoteAuthor: 'Autor' };
    case 'fechamento':
      return { type, title: 'Obrigado', bullets: ['contato@grupoddm.com.br'] };
    default:
      return { type: 'topicos', title: 'Título do slide', bullets: ['Ponto 1', 'Ponto 2'] };
  }
};

const linesToBullets = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export const Apresentacoes = () => {
  const [activeTab, setActiveTab] = useState<Tab>('criar');

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [theme, setTheme] = useState<PresentationTheme>('ddm');
  const [slideCount, setSlideCount] = useState<number>(7);

  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Digite um título para a apresentação.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const deck = await generatePresentationDeck(title.trim(), objective.trim(), slideCount);
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

  const handleStartFromScratch = () => {
    if (!title.trim()) {
      setError('Digite um título para a apresentação.');
      return;
    }
    setError('');
    setDeckTitle(title.trim());
    setSlides([blankSlide('capa'), blankSlide('topicos'), blankSlide('fechamento')]);
    setSlideIndex(0);
    setPresentationId(null);
  };

  const handleSave = async () => {
    if (!slides) return;
    setIsSaving(true);
    setError('');
    try {
      const input = { title: deckTitle, objective, theme, primaryColor, accentColor, logoDataUrl, slides };
      if (presentationId) {
        await updatePresentation(presentationId, input);
      } else {
        const saved = await createPresentation(input);
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
      await exportPresentationToPptx({ title: deckTitle, theme, slides, primaryColor, accentColor, logoDataUrl });
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
      setPrimaryColor(full.primary_color);
      setAccentColor(full.accent_color);
      setLogoDataUrl(full.logo_data_url);
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

  // ── Edicao de slide (texto por IA ou escrito pela pessoa — os dois casos
  // caem aqui: depois de gerado, qualquer slide pode ser ajustado a mao) ──

  const updateSlide = (index: number, patch: Partial<Slide>) => {
    setSlides((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as Slide;
      return next;
    });
  };

  const addSlide = (type: SlideType) => {
    setSlides((prev) => {
      const next = [...(prev || []), blankSlide(type)];
      setSlideIndex(next.length - 1);
      return next;
    });
    setShowAddMenu(false);
  };

  const removeCurrentSlide = () => {
    setSlides((prev) => {
      if (!prev || prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== slideIndex);
      setSlideIndex((i) => Math.min(i, next.length - 1));
      return next;
    });
  };

  const moveCurrentSlide = (direction: -1 | 1) => {
    setSlides((prev) => {
      if (!prev) return prev;
      const target = slideIndex + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[slideIndex], next[target]] = [next[target], next[slideIndex]];
      setSlideIndex(target);
      return next;
    });
  };

  const currentSlide = slides?.[slideIndex] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20 md:px-0">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">DDM Lab</div>
        <h1 className="text-3xl font-extrabold tracking-tight">DDM Apresentações</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Descreva o assunto e a IA monta uma apresentação profissional — ajuste texto, cores e logo, visualize aqui
          e baixe em .pptx pronta pra reunião.
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
                Quantidade de slides
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SLIDE_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlideCount(n)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      slideCount === n
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-text-secondary hover:border-border-hover hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
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

            {/* Cores da marca */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Cores da marca
              </label>
              <div className="flex gap-4">
                <ColorSwatch label="Primária" color={primaryColor} onChange={setPrimaryColor} inputRef={primaryColorRef} />
                <ColorSwatch label="Destaque" color={accentColor} onChange={setAccentColor} inputRef={accentColorRef} />
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Identidade da marca
              </label>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="relative flex min-h-[70px] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border p-3 transition-colors hover:bg-surface-hover"
              >
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Logo" className="h-12 w-full object-contain" />
                ) : (
                  <>
                    <Upload size={16} className="text-text-secondary" />
                    <span className="text-xs text-text-secondary">Upload logo</span>
                  </>
                )}
                <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" />
              </div>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl(null)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-red-400"
                >
                  <X size={12} />
                  Remover logo
                </button>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full justify-center">
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Gerando apresentação...' : slides ? 'Gerar de novo com IA' : 'Gerar com IA'}
              </Button>
              {!slides && (
                <button
                  type="button"
                  onClick={handleStartFromScratch}
                  className="w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-text-secondary hover:border-border-hover hover:text-foreground"
                >
                  ou começar do zero e escrever eu mesmo
                </button>
              )}
            </div>

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

          {/* Pre-visualizacao + edicao */}
          <div className="space-y-4">
            {!slides ? (
              <Card className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-10 text-center">
                <PresentationIcon size={32} className="text-text-secondary/40" />
                <p className="text-sm text-text-secondary">
                  Preencha o título ao lado e clique em <span className="text-foreground">Gerar com IA</span>, ou comece do
                  zero pra escrever você mesmo.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="truncate text-lg font-bold text-foreground">{deckTitle}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Slide {slideIndex + 1} de {slides.length}
                    </span>
                    <button
                      onClick={() => setZoomOpen(true)}
                      title="Visualizar em tela cheia"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-foreground"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>

                {currentSlide && (
                  <SlideRenderer
                    slide={currentSlide}
                    theme={theme}
                    index={slideIndex}
                    total={slides.length}
                    brand={{ primaryColor, accentColor }}
                    logoDataUrl={logoDataUrl}
                  />
                )}

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

                {/* Barra de acoes do slide atual */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowAddMenu((v) => !v)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground"
                    >
                      <Plus size={13} />
                      Adicionar slide
                    </button>
                    {showAddMenu && (
                      <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-xl">
                        {SLIDE_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => addSlide(opt.value)}
                            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-foreground"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => moveCurrentSlide(-1)}
                    disabled={slideIndex === 0}
                    title="Mover pra cima"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveCurrentSlide(1)}
                    disabled={slideIndex === slides.length - 1}
                    title="Mover pra baixo"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={removeCurrentSlide}
                    disabled={slides.length <= 1}
                    title="Excluir este slide"
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                    Excluir slide
                  </button>
                </div>

                {/* Edicao de texto do slide atual */}
                {currentSlide && <SlideEditForm slide={currentSlide} onChange={(patch) => updateSlide(slideIndex, patch)} />}
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

      {/* Visualizacao em tela cheia */}
      {zoomOpen && currentSlide && slides && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute top-6 right-6 rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:text-white"
            onClick={() => setZoomOpen(false)}
          >
            <X size={22} />
          </button>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <SlideRenderer
              slide={currentSlide}
              theme={theme}
              index={slideIndex}
              total={slides.length}
              brand={{ primaryColor, accentColor }}
              logoDataUrl={logoDataUrl}
            />
          </div>
        </div>
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

const ColorSwatch = ({
  label,
  color,
  onChange,
  inputRef,
}: {
  label: string;
  color: string | null;
  onChange: (color: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="relative">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
        style={{ background: color || 'transparent' }}
      >
        {!color && <Plus size={14} className="text-text-secondary" />}
      </div>
      {color && (
        <button
          onClick={() => onChange(null)}
          className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-surface p-0.5 transition-colors hover:bg-red-500 hover:text-white"
        >
          <X size={9} />
        </button>
      )}
      <input
        type="color"
        ref={inputRef}
        value={color || '#FF5100'}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
    <span className="text-[9px] text-text-secondary">{label}</span>
  </div>
);

const SlideEditForm = ({ slide, onChange }: { slide: Slide; onChange: (patch: Partial<Slide>) => void }) => {
  const inputClass =
    'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40';
  const labelClass = 'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary';

  return (
    <Card className="space-y-3 p-4">
      <p className={labelClass}>Texto deste slide</p>

      {(slide.type === 'capa' || slide.type === 'topicos' || slide.type === 'duas_colunas' || slide.type === 'fechamento') && (
        <div>
          <label className={labelClass}>Título</label>
          <input value={slide.title || ''} onChange={(e) => onChange({ title: e.target.value })} className={inputClass} />
        </div>
      )}

      {slide.type === 'capa' && (
        <div>
          <label className={labelClass}>Subtítulo</label>
          <input value={slide.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} className={inputClass} />
        </div>
      )}

      {(slide.type === 'topicos' || slide.type === 'fechamento') && (
        <div>
          <label className={labelClass}>Tópicos (um por linha)</label>
          <textarea
            value={(slide.bullets || []).join('\n')}
            onChange={(e) => onChange({ bullets: linesToBullets(e.target.value) })}
            rows={5}
            className={`${inputClass} resize-none`}
          />
        </div>
      )}

      {slide.type === 'duas_colunas' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <input
              value={slide.columnLeft?.heading || ''}
              onChange={(e) => onChange({ columnLeft: { heading: e.target.value, bullets: slide.columnLeft?.bullets || [] } })}
              placeholder="Título da coluna A"
              className={inputClass}
            />
            <textarea
              value={(slide.columnLeft?.bullets || []).join('\n')}
              onChange={(e) =>
                onChange({ columnLeft: { heading: slide.columnLeft?.heading, bullets: linesToBullets(e.target.value) } })
              }
              rows={4}
              placeholder="Um ponto por linha"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="space-y-2">
            <input
              value={slide.columnRight?.heading || ''}
              onChange={(e) => onChange({ columnRight: { heading: e.target.value, bullets: slide.columnRight?.bullets || [] } })}
              placeholder="Título da coluna B"
              className={inputClass}
            />
            <textarea
              value={(slide.columnRight?.bullets || []).join('\n')}
              onChange={(e) =>
                onChange({ columnRight: { heading: slide.columnRight?.heading, bullets: linesToBullets(e.target.value) } })
              }
              rows={4}
              placeholder="Um ponto por linha"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      )}

      {slide.type === 'citacao' && (
        <>
          <div>
            <label className={labelClass}>Citação</label>
            <textarea
              value={slide.quote || ''}
              onChange={(e) => onChange({ quote: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Autor</label>
            <input value={slide.quoteAuthor || ''} onChange={(e) => onChange({ quoteAuthor: e.target.value })} className={inputClass} />
          </div>
        </>
      )}
    </Card>
  );
};
