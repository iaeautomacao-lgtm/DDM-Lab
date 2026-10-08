import { motion } from 'framer-motion';
import { Plus, Sparkles, Upload, X } from 'lucide-react';
import { blankSlide } from '../../lib/blankSlide';
import type { PresentationPattern } from '../../lib/presentationPatterns';
import type { PresentationTheme } from '../../lib/presentationsData';
import { SlideThumbnail } from './SlideThumbnail';

interface Props {
  patterns: PresentationPattern[];
  selectedPatternId: string | null;
  theme: PresentationTheme;
  onSelect: (pattern: PresentationPattern | null) => void;
  onRequestImport: () => void;
  onClose: () => void;
}

const THUMB_WIDTH = 108;

export const PatternGalleryModal = ({ patterns, selectedPatternId, theme, onSelect, onRequestImport, onClose }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">Escolher modelo</h3>
            <p className="text-xs text-text-secondary">
              Cada modelo define a sequência de slides que a IA vai seguir. A cor e o conteúdo abaixo são só exemplo.
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-text-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sem padrao fixo */}
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-colors ${
              selectedPatternId === null
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:border-border-hover hover:bg-surface-hover/40'
            }`}
            style={{ minHeight: THUMB_WIDTH * (9 / 16) * 2 + 90 }}
          >
            <Sparkles size={28} className="text-text-secondary/50" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sem padrão fixo</p>
              <p className="mt-1 text-xs text-text-secondary">A IA decide a estrutura livremente</p>
            </div>
          </button>

          {patterns.map((pattern) => {
            const uniqueTypes = pattern.slideSequence.filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 4);
            const isSelected = selectedPatternId === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => {
                  onSelect(pattern);
                  onClose();
                }}
                title={pattern.description}
                className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  isSelected ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border-hover hover:bg-surface-hover/40'
                }`}
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {uniqueTypes.map((type, i) => (
                    <SlideThumbnail
                      key={i}
                      slide={blankSlide(type)}
                      theme={theme}
                      brand={{ primaryColor: pattern.suggestedPrimaryColor }}
                      width={THUMB_WIDTH}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{pattern.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary">{pattern.description}</p>
                </div>
              </button>
            );
          })}

          {/* Importar novo modelo */}
          <button
            type="button"
            onClick={onRequestImport}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-6 text-center text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            style={{ minHeight: THUMB_WIDTH * (9 / 16) * 2 + 90 }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-hover">
              <Upload size={18} />
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-sm font-semibold">
                <Plus size={13} />
                Importar modelo
              </p>
              <p className="mt-1 text-xs opacity-80">Suba um .pptx de referência</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
