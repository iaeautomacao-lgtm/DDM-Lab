import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from '../solutions/Field';
import { analyzeTemplate, createCustomPattern } from '../../lib/customPatternsData';
import type { PresentationPattern } from '../../lib/presentationPatterns';
import type { SlideType } from '../../lib/presentationsData';

interface Props {
  onClose: () => void;
  onSaved: (pattern: PresentationPattern) => void;
}

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  capa: 'Capa',
  topicos: 'Tópicos',
  duas_colunas: 'Duas colunas',
  kpi_grid: 'KPIs',
  insight_cards: 'Cards de insight',
  funil: 'Funil',
  grafico: 'Gráfico',
  tabela: 'Tabela',
  citacao: 'Citação',
  fechamento: 'Fechamento',
};

const SLIDE_TYPE_VALUES = Object.keys(SLIDE_TYPE_LABELS) as SlideType[];

export const TemplateUploadModal = ({ onClose, onSaved }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [sequence, setSequence] = useState<SlideType[] | null>(null);
  const [suggestedPrimaryColor, setSuggestedPrimaryColor] = useState('#FF5100');

  const handleFilePick = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setError('Envie um arquivo .pptx.');
      return;
    }
    setFileName(file.name);
    setIsAnalyzing(true);
    setError('');
    try {
      const analysis = await analyzeTemplate(file);
      setSequence(analysis.slideSequence);
      setSuggestedPrimaryColor(analysis.suggestedPrimaryColor);
      setLabel(file.name.replace(/\.pptx$/i, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível analisar esse arquivo.');
      setFileName(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSlideType = (index: number, type: SlideType) => {
    setSequence((prev) => (prev ? prev.map((t, i) => (i === index ? type : t)) : prev));
  };

  const removeSlide = (index: number) => {
    setSequence((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const addSlide = () => {
    setSequence((prev) => [...(prev || []), 'topicos']);
  };

  const handleSave = async () => {
    if (!label.trim() || !sequence || sequence.length === 0) {
      setError('Dê um nome ao padrão e mantenha ao menos um slide na sequência.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const pattern = await createCustomPattern({
        label: label.trim(),
        description: description.trim() || undefined,
        slideSequence: sequence,
        suggestedPrimaryColor,
      });
      onSaved(pattern);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o padrão.');
    } finally {
      setIsSaving(false);
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
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Importar modelo</h3>
            <p className="text-xs text-text-secondary">
              Lê só a estrutura do arquivo (sequência de slide + cor) — nunca o texto real.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {!sequence ? (
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-hover/40 p-8 text-center transition-colors hover:border-primary/40"
            onClick={() => fileInputRef.current?.click()}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={22} className="animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Analisando {fileName}...</span>
              </>
            ) : (
              <>
                <Upload size={22} className="text-text-secondary" />
                <span className="text-sm font-medium text-foreground">Clique para escolher o .pptx</span>
                <span className="text-xs text-text-secondary">A apresentação que você quer usar como referência</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <Field label="Nome do padrão *">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>

            <Field label="Descrição (opcional)">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quando usar esse padrão"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
              />
            </Field>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Cor sugerida</span>
              <input
                type="color"
                value={suggestedPrimaryColor}
                onChange={(e) => setSuggestedPrimaryColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border border-border"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                  Sequência detectada — confira e ajuste
                </span>
                <button type="button" onClick={addSlide} className="text-[10px] font-semibold text-primary hover:underline">
                  + slide
                </button>
              </div>
              <div className="space-y-1.5">
                {sequence.map((type, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-xs text-text-tertiary">{i + 1}</span>
                    <select
                      value={type}
                      onChange={(e) => updateSlideType(i, e.target.value as SlideType)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none"
                    >
                      {SLIDE_TYPE_VALUES.map((t) => (
                        <option key={t} value={t}>
                          {SLIDE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSlide(i)}
                      className="shrink-0 text-text-secondary hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-medium text-red-400">{error}</p>}

            <Button onClick={handleSave} disabled={isSaving} className="w-full justify-center">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              Salvar como padrão
            </Button>
          </div>
        )}

        {error && !sequence && <p className="mt-3 text-xs font-medium text-red-400">{error}</p>}
      </motion.div>
    </motion.div>
  );
};
