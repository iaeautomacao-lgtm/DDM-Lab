import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Download, Trash2, X, ZoomIn, RefreshCw,
  Copy, Loader2, Upload, AlertCircle, Plus, Pencil,
  ImageIcon, Check, SlidersHorizontal, History, Wand2,
} from 'lucide-react';
import { generateImageOptimized, generateCaption, type ImageProvider } from '../lib/gemini';
import { useUser } from '../hooks/useUser';
import {
  uploadCreatorImage, saveCreatorImage,
  fetchCreatorImages, deleteCreatorImage,
  type CreatorImage,
} from '../lib/creatorData';
import {
  getDailyUsage, incrementImageCount,
  IMAGE_DAILY_LIMIT,
} from '../lib/usageLimit';

interface GeneratedResult {
  id: string;
  url: string;
  prompt: string;
  caption?: string;
}

interface ReferenceImage {
  url: string;
  base64: string;
}

const STORAGE_KEY = 'ddm_creator_generations';
const DRAFT_STORAGE_KEY = 'ddm_creator_draft';

interface CreatorDraft {
  prompt: string;
  negativePrompt: string;
  activeVariation: number;
  aspectRatio: string;
  includeCaption: boolean;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  logoBase64: string | null;
  referenceImages: ReferenceImage[];
  imageProvider?: ImageProvider;
}

const IMAGE_PROVIDERS: Array<{ value: ImageProvider; label: string; hint: string }> = [
  { value: 'gemini', label: 'Gemini', hint: 'Google · rápido' },
  { value: 'openai', label: 'GPT Image', hint: 'OpenAI · mais fiel ao texto' },
];

export const DDMCreator = () => {
  const { userData } = useUser();

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedResult[]>([]);
  const [activeVariation, setActiveVariation] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini');
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});
  const [generationStatus, setGenerationStatus] = useState<{ message: string; isRetry?: boolean } | null>(null);
  const [includeCaption, setIncludeCaption] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [editingRefSlot, setEditingRefSlot] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'criar' | 'historico'>('criar');
  const [savedImages, setSavedImages] = useState<CreatorImage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dailyImageCount, setDailyImageCount] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setGeneratedImages(JSON.parse(saved)); } catch {}
    }

    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as Partial<CreatorDraft>;
        setPrompt(draft.prompt ?? '');
        setNegativePrompt(draft.negativePrompt ?? '');
        setActiveVariation(draft.activeVariation ?? 1);
        setAspectRatio(draft.aspectRatio ?? '1:1');
        setIncludeCaption(draft.includeCaption ?? false);
        setPrimaryColor(draft.primaryColor ?? null);
        setAccentColor(draft.accentColor ?? null);
        setLogoUrl(draft.logoUrl ?? null);
        setLogoBase64(draft.logoBase64 ?? null);
        setReferenceImages(Array.isArray(draft.referenceImages) ? draft.referenceImages : []);
        setImageProvider(draft.imageProvider === 'openai' ? 'openai' : 'gemini');
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (generatedImages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedImages));
    }
  }, [generatedImages]);

  useEffect(() => {
    const draft: CreatorDraft = {
      prompt,
      negativePrompt,
      activeVariation,
      aspectRatio,
      includeCaption,
      primaryColor,
      accentColor,
      logoUrl,
      logoBase64,
      referenceImages,
      imageProvider,
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    imageProvider,
    prompt,
    negativePrompt,
    activeVariation,
    aspectRatio,
    includeCaption,
    primaryColor,
    accentColor,
    logoUrl,
    logoBase64,
    referenceImages,
  ]);

  useEffect(() => {
    if (!userData?.uid) return;
    getDailyUsage(userData.uid)
      .then(u => setDailyImageCount(u.imageCount))
      .catch(() => {});
  }, [userData?.uid]);

  useEffect(() => {
    if (!userData?.uid || activeTab !== 'historico') return;
    setIsLoadingHistory(true);
    fetchCreatorImages(userData.uid)
      .then(setSavedImages)
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, [userData?.uid, activeTab]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      setLogoBase64(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setReferenceImages(prev => {
        const next = [...prev];
        next[editingRefSlot] = { url: base64, base64 };
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    setLogoBase64(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const saveResultsToSupabase = async (results: GeneratedResult[], ratio: string) => {
    if (!userData?.uid) return;
    for (const result of results) {
      try {
        const publicUrl = await uploadCreatorImage(result.url, userData.uid);
        await saveCreatorImage({
          userId: userData.uid,
          imageUrl: publicUrl,
          optimizedPrompt: result.prompt,
          caption: result.caption,
          aspectRatio: ratio,
        });
      } catch {}
    }
  };

  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const target = customPrompt || prompt;
    if (!target.trim()) return;

    // Check daily image limit
    const remaining = IMAGE_DAILY_LIMIT - dailyImageCount;
    if (remaining <= 0) {
      setGenerationStatus({ message: 'Erro: Limite de 20 imagens/dia atingido. Tente novamente amanhã.' });
      setTimeout(() => setGenerationStatus(null), 6000);
      return;
    }

    setIsGenerating(true);
    if (!customPrompt) setGeneratedImages([]);

    try {
      setGenerationStatus({ message: 'Otimizando seu prompt...' });

      const onRetry = (_attempt: number, _error: string) => {
        setGenerationStatus({ message: 'Servidor ocupado. Tentando novamente...', isRetry: true });
      };

      const colors = primaryColor && accentColor ? { primary: primaryColor, accent: accentColor } : undefined;
      const count = customPrompt ? 1 : Math.min(activeVariation, remaining);
      const currentRatio = aspectRatio;
      const currentProvider = imageProvider;
      const providerLabel = currentProvider === 'openai' ? 'GPT Image' : 'Gemini';

      const promises = Array.from({ length: count }).map(async () => {
        setGenerationStatus({ message: `Gerando imagem com ${providerLabel}...` });
        const result = await generateImageOptimized(target, currentRatio as any, {
          colors,
          logoBase64,
          referenceBase64: referenceImages.map(r => r.base64),
          negativePrompt: negativePrompt || undefined,
          maxRetries: 3,
          onRetry,
          provider: currentProvider,
        });

        let caption: string | undefined;
        if (includeCaption) {
          setGenerationStatus({ message: 'Gerando legenda...' });
          caption = await generateCaption(target, result.imageUrl);
        }

        return {
          id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: result.imageUrl,
          prompt: result.optimizedPrompt,
          caption,
        };
      });

      const results = await Promise.all(promises);
      if (customPrompt) {
        setGeneratedImages(prev => [...results, ...prev]);
      } else {
        setGeneratedImages(results);
      }
      setGenerationStatus(null);

      // Update daily count optimistically
      setDailyImageCount(prev => prev + results.length);
      if (userData?.uid) {
        incrementImageCount(userData.uid, results.length).catch(() => {});
      }

      // Save to Supabase in background
      saveResultsToSupabase(results, currentRatio).catch(() => {});
    } catch (err: any) {
      setGenerationStatus({ message: `Erro: ${err.message || 'Falha na geração'}` });
      setTimeout(() => setGenerationStatus(null), 12000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="-m-4 flex min-h-0 flex-1 flex-col overflow-hidden md:-m-8 md:flex-row">

      {/* ── Left Panel ── */}
      {isMobilePanelOpen && (
        <button
          type="button"
          aria-label="Fechar ajustes"
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobilePanelOpen(false)}
        />
      )}

      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div>
          <h3 className="text-sm font-bold text-foreground">DDM Creator</h3>
          <p className="text-[11px] text-text-secondary">Ajuste formato, marca e variações</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-orange-500/40 hover:text-primary"
        >
          <SlidersHorizontal size={14} />
          Ajustes
        </button>
      </div>

      <section
        className={`${
          isMobilePanelOpen
            ? 'fixed inset-x-0 bottom-0 top-[4.5rem] z-[120] flex rounded-t-3xl border border-border shadow-2xl'
            : 'hidden'
        } w-full flex-col overflow-y-auto bg-surface md:static md:z-auto md:flex md:shrink-0 md:rounded-none md:border-b-0 md:border-r md:border-t-0 md:shadow-none ${
          isPanelCollapsed ? 'md:w-0 md:overflow-hidden md:border-r-0' : 'md:w-64 xl:w-72'
        } transition-all duration-300`}
      >
        <div className="p-5 space-y-5">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Post Dynamics</h3>

          {/* Variations */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Variações</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setActiveVariation(n)}
                  className={`h-9 rounded text-sm transition-colors border ${
                    activeVariation === n
                      ? 'bg-primary/10 text-primary border-primary/30 font-bold'
                      : 'bg-surface-hover text-text-secondary border-border hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Motor de geracao */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Motor de IA</label>
            <div className="flex gap-2" role="radiogroup" aria-label="Motor de IA">
              {IMAGE_PROVIDERS.map(p => (
                <button
                  key={p.value}
                  role="radio"
                  aria-checked={imageProvider === p.value}
                  onClick={() => setImageProvider(p.value)}
                  disabled={isGenerating}
                  className={`flex-1 py-1.5 px-2 rounded text-left transition-colors border disabled:opacity-60 ${
                    imageProvider === p.value
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-surface-hover text-text-secondary border-border hover:text-foreground'
                  }`}
                >
                  <span className="block text-xs font-medium">{p.label}</span>
                  <span className="block text-[10px] opacity-70">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Formato</label>
            <div className="flex gap-2">
              {['1:1', '16:9', '9:16'].map(r => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                    aspectRatio === r
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-surface-hover text-text-secondary border-border hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Prompt Negativo</label>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="O que evitar na imagem..."
              className="w-full bg-background border border-border rounded-xl p-3 text-foreground text-xs placeholder:text-text-secondary focus:ring-1 focus:ring-primary outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Brand Colors */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Cores da Marca</label>
            <div className="flex gap-4">
              {[
                { label: 'Primary', color: primaryColor, setColor: setPrimaryColor, ref: primaryColorRef, default: '#ff6b00' },
                { label: 'Accent', color: accentColor, setColor: setAccentColor, ref: accentColorRef, default: '#2a2a2a' },
              ].map(({ label, color, setColor, ref, default: def }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <div
                      onClick={() => ref.current?.click()}
                      className={`h-10 w-10 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-transform hover:scale-105 ${
                        color ? 'border-primary' : 'border-dashed border-border hover:bg-surface-hover'
                      }`}
                      style={{ backgroundColor: color || 'transparent' }}
                    >
                      {!color && <Plus size={14} className="text-text-secondary" />}
                    </div>
                    {color && (
                      <button
                        onClick={() => setColor(null)}
                        className="absolute -top-1.5 -right-1.5 bg-surface rounded-full p-0.5 border border-border hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <X size={9} />
                      </button>
                    )}
                    <input type="color" ref={ref} value={color || def} onChange={e => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                  <span className="text-[9px] text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Caption Toggle */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Conteúdo</label>
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div
                className={`w-9 h-5 rounded-full transition-colors relative ${includeCaption ? 'bg-primary' : 'bg-surface-hover border border-border'}`}
                onClick={() => setIncludeCaption(v => !v)}
              >
                <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform ${includeCaption ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-xs text-text-secondary group-hover:text-foreground transition-colors">Gerar Legenda (Copy)</span>
            </label>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Identidade da Marca</label>
            <div
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-hover transition-colors cursor-pointer group relative overflow-hidden min-h-[80px]"
            >
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil size={16} className="text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Upload size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                  <span className="text-xs text-text-secondary">Upload logo</span>
                </>
              )}
              <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" />
            </div>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:text-red-400"
              >
                <X size={12} />
                Remover logo
              </button>
            )}
          </div>

          {/* Reference Images — up to 2 */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">
              Referência Visual
              <span className="ml-1 text-[10px] text-text-secondary/50">({referenceImages.length}/2)</span>
            </label>
            <div className="space-y-2">
              {referenceImages.map((ref, idx) => (
                <div key={idx} className="relative group rounded-xl h-20 overflow-hidden border border-border">
                  <img src={ref.url} alt={`Referência ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingRefSlot(idx); referenceInputRef.current?.click(); }}
                      className="h-7 w-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                      <Pencil size={11} className="text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-full bg-red-500/70 backdrop-blur flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                </div>
              ))}
              {referenceImages.length < 2 && (
                <div
                  onClick={() => { setEditingRefSlot(referenceImages.length); referenceInputRef.current?.click(); }}
                  className="flex items-center justify-center gap-2 rounded-xl h-16 bg-surface-hover border border-dashed border-border cursor-pointer hover:border-primary/40 hover:text-primary transition-colors text-text-secondary"
                >
                  <ImageIcon size={14} />
                  <span className="text-xs">
                    {referenceImages.length === 0 ? 'Adicionar referência' : 'Adicionar 2ª referência'}
                  </span>
                </div>
              )}
              <input type="file" accept="image/*" ref={referenceInputRef} onChange={handleReferenceUpload} className="hidden" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Center Panel ── */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background relative">

        {/* Desktop panel toggle */}
        <button
          type="button"
          onClick={() => setIsPanelCollapsed(v => !v)}
          title={isPanelCollapsed ? 'Mostrar ajustes' : 'Ocultar ajustes'}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-4 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface text-text-secondary hover:text-primary transition-colors"
        >
          <SlidersHorizontal size={10} className={`transition-transform duration-300 ${isPanelCollapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* Tab switcher */}
        <div className="hidden md:flex items-center gap-1 px-6 pt-3 pb-2 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setActiveTab('criar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeTab === 'criar' ? 'bg-primary text-white' : 'text-text-secondary hover:text-foreground'
            }`}
          >
            <Wand2 size={12} />
            Criar
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeTab === 'historico' ? 'bg-primary text-white' : 'text-text-secondary hover:text-foreground'
            }`}
          >
            <History size={12} />
            Histórico
          </button>
        </div>

        {/* Generation Overlay */}
        {generationStatus && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-surface border border-primary/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${generationStatus.message.includes('Erro') ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                  {generationStatus.message.includes('Erro') ? (
                    <AlertCircle size={36} className="text-red-400" />
                  ) : generationStatus.isRetry ? (
                    <RefreshCw size={36} className="text-primary animate-spin" />
                  ) : (
                    <Sparkles size={36} className="text-primary animate-bounce" />
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {generationStatus.message.includes('Erro') ? 'Ops! Algo deu errado' : generationStatus.isRetry ? 'Reerguendo a criação...' : 'Criando sua magia...'}
              </h3>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">{generationStatus.message}</p>
              {generationStatus.message.includes('Erro') ? (
                <button onClick={() => setGenerationStatus(null)} className="px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/80 transition-colors">
                  Fechar
                </button>
              ) : (
                <p className="text-xs text-text-secondary/60 italic">Por favor, não feche esta janela.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Histórico tab ── */}
        {activeTab === 'historico' ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4 md:px-6 xl:px-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Histórico</h2>
              <span className="text-xs text-text-secondary">{savedImages.length} imagens salvas</span>
            </div>
            {isLoadingHistory ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 size={32} className="text-primary animate-spin" />
              </div>
            ) : savedImages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-secondary">
                <ImageIcon size={40} className="opacity-20" />
                <p className="text-sm">Nenhuma imagem salva ainda</p>
                <button
                  onClick={() => setActiveTab('criar')}
                  className="mt-2 px-5 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  Criar primeira imagem
                </button>
              </div>
            ) : (
              <div className="grid gap-3 w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {savedImages.map(img => (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border aspect-square bg-surface">
                    <img src={img.image_url} alt="Criação" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewImage(img.image_url)}
                        className="h-8 w-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-foreground"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(img.image_url, `ddm-creator-${img.id}.png`)}
                        className="h-8 w-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-foreground"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteCreatorImage(img.id, img.image_url).catch(() => {});
                          setSavedImages(prev => prev.filter(i => i.id !== img.id));
                        }}
                        className="h-8 w-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      {img.aspect_ratio}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Criar tab content ── */}
            <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-4 md:px-6 md:pt-6 xl:px-10">
              <div
                className={`flex w-full flex-1 flex-col items-center ${
                  generatedImages.length > 0 ? 'justify-start' : 'min-h-[320px] justify-center lg:min-h-[420px]'
                }`}
              >
                {generatedImages.length > 0 ? (
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground">Resultados Recentes</h2>
                      <button
                        onClick={() => { setGeneratedImages([]); localStorage.removeItem(STORAGE_KEY); }}
                        className="text-xs font-bold text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={14} />
                        Limpar Workspace
                      </button>
                    </div>

                    <div className={`grid gap-4 w-full ${
                      generatedImages.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                      generatedImages.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      {generatedImages.map((result, idx) => (
                        <div key={result.id} className="flex flex-col gap-3">
                          <div className={`w-full rounded-2xl overflow-hidden shadow-xl border border-border relative group ${
                            aspectRatio === '16:9' ? 'aspect-video' :
                            aspectRatio === '9:16' ? 'aspect-[9/16]' :
                            'aspect-square'
                          }`}>
                            <img
                              src={result.url}
                              alt={`Gerado ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                              onClick={() => setPreviewImage(result.url)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button onClick={() => setPreviewImage(result.url)} className="h-10 w-10 rounded-full bg-surface/80 backdrop-blur text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Ampliar">
                                <ZoomIn size={18} />
                              </button>
                              <button onClick={() => handleGenerate(undefined, result.prompt)} className="h-10 w-10 rounded-full bg-surface/80 backdrop-blur text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Recriar">
                                <RefreshCw size={18} />
                              </button>
                              <button onClick={() => handleDownload(result.url, `ddm-creator-${idx + 1}-${Date.now()}.png`)} className="h-10 w-10 rounded-full bg-surface/80 backdrop-blur text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Baixar">
                                <Download size={18} />
                              </button>
                              <button onClick={() => setGeneratedImages(prev => prev.filter((_, i) => i !== idx))} className="h-10 w-10 rounded-full bg-surface/80 backdrop-blur text-foreground flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Excluir">
                                <X size={18} />
                              </button>
                            </div>
                          </div>

                          <div className="bg-surface p-3 rounded-xl border border-border text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Prompt Otimizado</span>
                              <button onClick={() => setExpandedPrompts(prev => ({ ...prev, [idx]: !prev[idx] }))} className="text-primary text-[10px] font-bold uppercase">
                                {expandedPrompts[idx] ? 'Recolher' : 'Expandir'}
                              </button>
                            </div>
                            <p className={`text-text-secondary text-[10px] italic ${expandedPrompts[idx] ? '' : 'line-clamp-3'}`}>{result.prompt}</p>

                            {result.caption && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Legenda Gerada</span>
                                  <button onClick={() => copyToClipboard(result.caption!, idx)} className="text-primary flex items-center gap-1">
                                    {copiedIdx === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    <span className="text-[9px] font-bold uppercase ml-1">Copiar</span>
                                  </button>
                                </div>
                                <p className="text-foreground text-xs whitespace-pre-wrap">{result.caption}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center px-4">
                    <h2 className="text-4xl font-extrabold text-foreground mb-4 tracking-tight">O que vamos criar hoje?</h2>
                    <p className="text-lg text-text-secondary max-w-lg font-medium opacity-80">
                      Descreva o que deseja e deixe o <span className="text-primary font-bold">DDM Creator</span> criar para você
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Input Bar */}
            <div className="shrink-0 w-full border-t border-border/30 bg-background px-4 pb-4 pt-3 md:px-6 xl:px-10">
              <form
                onSubmit={handleGenerate}
                className="flex w-full items-end gap-3 rounded-2xl border border-border bg-surface p-3 shadow-2xl md:p-4"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (prompt.trim() && !isGenerating) handleGenerate(e);
                    }
                  }}
                  placeholder="Digite sua ideia de post aqui..."
                  className="bg-transparent border-none focus:ring-0 text-foreground placeholder:text-text-secondary flex-1 px-2 py-1.5 outline-none resize-none text-sm md:text-base leading-relaxed min-h-[48px]"
                  disabled={isGenerating}
                  rows={Math.min(5, Math.max(2, prompt.split('\n').length))}
                />
                <div className="mb-0.5">
                  <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="bg-primary text-white h-10 px-6 md:px-8 rounded-xl font-bold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {isGenerating
                      ? <Loader2 size={18} className="animate-spin" />
                      : <><Sparkles size={16} /><span>Gerar</span></>
                    }
                  </button>
                </div>
              </form>
              <div className="mt-2 flex w-full items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-4">
                  {['4k Resolution', 'Brand Matching', 'AI Optimized'].map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-50">
                      <span className="h-1 w-1 rounded-full bg-primary inline-block" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 ml-auto min-w-[200px]">
                  <span className="text-[10px] text-text-secondary/50 uppercase tracking-widest shrink-0 whitespace-nowrap">
                    Hoje
                  </span>
                  <div className="flex-1 h-1 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((dailyImageCount / IMAGE_DAILY_LIMIT) * 100, 100)}%`,
                        background: dailyImageCount >= IMAGE_DAILY_LIMIT
                          ? '#ef4444'
                          : dailyImageCount >= IMAGE_DAILY_LIMIT * 0.8
                          ? '#f59e0b'
                          : '#ff5100',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] shrink-0 font-mono tabular-nums ${dailyImageCount >= IMAGE_DAILY_LIMIT ? 'text-red-400' : 'text-text-secondary/50'}`}>
                    {dailyImageCount}/{IMAGE_DAILY_LIMIT} img
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Fullscreen Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 rounded-full p-2 transition-colors" onClick={() => setPreviewImage(null)}>
            <X size={24} />
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
