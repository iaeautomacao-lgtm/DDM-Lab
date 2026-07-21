import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ImageIcon, Loader2, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { generateImageWithGemini, type ImageAspectRatio } from '../lib/gemini';

const ASPECT_RATIOS: Array<{ value: ImageAspectRatio; label: string; w: number; h: number }> = [
  { value: '1:1', label: '1:1', w: 1, h: 1 },
  { value: '16:9', label: '16:9', w: 16, h: 9 },
  { value: '9:16', label: '9:16', w: 9, h: 16 },
  { value: '4:3', label: '4:3', w: 4, h: 3 },
  { value: '3:4', label: '3:4', w: 3, h: 4 },
];

const SAMPLE_PROMPTS = [
  'Escritório moderno com luz natural, pessoas colaborando, estética corporativa brasileira',
  'Logo minimalista em fundo escuro, tipografia limpa, paleta laranja e branco',
  'Banner profissional para evento jurídico, elementos formais e elegantes',
  'Ilustração vetorial de tecnologia e inovação, tons azuis e laranjas',
];

interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [sampleCount, setSampleCount] = useState(1);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    setImages([]);

    try {
      const result = await generateImageWithGemini(prompt.trim(), aspectRatio, sampleCount);
      setImages(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (img: GeneratedImage, idx: number) => {
    const ext = img.mimeType.split('/')[1] || 'jpg';
    const link = document.createElement('a');
    link.href = `data:${img.mimeType};base64,${img.base64}`;
    link.download = `ddm-imagem-${Date.now()}-${idx + 1}.${ext}`;
    link.click();
  };

  const handleCopyPrompt = async (idx: number) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <header>
        <div className="mb-2 flex items-center gap-2 text-primary">
          <ImageIcon size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">DDM Creator</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Gerar Imagem</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          Crie imagens profissionais com Inteligência Artificial via Google Imagen 3. Descreva o que deseja em português ou inglês.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <div className="space-y-5">
          <Card className="space-y-5 p-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Descreva a imagem
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Escritório moderno com luz natural, pessoas colaborando, estética profissional..."
                rows={5}
                className="w-full resize-none rounded-2xl border border-border bg-surface/90 p-4 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-right text-[11px] text-zinc-600">Ctrl+Enter para gerar</p>
            </div>

            {/* Aspect ratio */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Proporção
              </label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setAspectRatio(r.value)}
                    className={`flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all ${
                      aspectRatio === r.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text-secondary hover:border-zinc-600 hover:text-foreground'
                    }`}
                  >
                    <span
                      className="inline-block rounded-sm border border-current opacity-70"
                      style={{
                        width: Math.round(14 * (r.w / Math.max(r.w, r.h))),
                        height: Math.round(14 * (r.h / Math.max(r.w, r.h))),
                        minWidth: 8,
                        minHeight: 8,
                      }}
                    />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Quantidade de imagens
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSampleCount(n)}
                    className={`h-9 w-9 rounded-full border text-sm font-bold transition-all ${
                      sampleCount === n
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text-secondary hover:border-zinc-600 hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando imagem...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar Imagem
                </>
              )}
            </Button>
          </Card>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading skeleton */}
          {loading && (
            <div className={`grid gap-4 ${sampleCount > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {Array.from({ length: sampleCount }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-surface"
                  style={{ aspectRatio: aspectRatio.replace(':', '/'), minHeight: 200 }}
                />
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                {images.map((img, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08 }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
                  >
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={`Imagem gerada ${idx + 1}`}
                      className="w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-end gap-2 bg-black/0 p-3 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <button
                        onClick={() => handleCopyPrompt(idx)}
                        title="Copiar prompt"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-surface-hover"
                      >
                        {copiedIdx === idx ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>
                      <button
                        onClick={() => handleDownload(img, idx)}
                        title="Baixar imagem"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/90 text-white backdrop-blur-sm transition-colors hover:bg-primary"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — inspirações */}
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <RefreshCw size={14} className="text-primary" />
              Prompts de Inspiração
            </h3>
            <ul className="space-y-2">
              {SAMPLE_PROMPTS.map((p) => (
                <li key={p}>
                  <button
                    onClick={() => setPrompt(p)}
                    className="w-full rounded-xl border border-border bg-surface-hover/60 px-3 py-2.5 text-left text-xs leading-relaxed text-text-secondary transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-bold text-foreground">Dicas de Prompt</h3>
            <ul className="space-y-2 text-xs leading-relaxed text-text-secondary">
              <li>• Especifique estilo: "fotorrealista", "ilustração vetorial", "minimalista"</li>
              <li>• Inclua cores e iluminação desejadas</li>
              <li>• Cite o contexto: corporativo, jurídico, tecnologia</li>
              <li>• Para logos: descreva forma, tipografia e paleta</li>
              <li>• Inglês tende a dar resultados mais precisos</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
