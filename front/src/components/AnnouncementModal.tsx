import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Sparkles,
  BookOpen,
  Lightbulb,
  Zap,
  Star,
  MessageSquare,
  Shield,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ImageIcon,
} from 'lucide-react';
import {
  ANNOUNCEMENT_VERSION,
  ANNOUNCEMENT_MAX_VIEWS,
  ANNOUNCEMENT_SLIDES,
  type AnnouncementSlide,
  type SlideBadge,
} from '../lib/announcementData';
import { useAuth } from '../lib/AuthContext';

// ── Icon lookup ───────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  BookOpen,
  Lightbulb,
  Zap,
  Star,
  MessageSquare,
  Shield,
  Rocket,
  CheckCircle2,
  ImageIcon,
};

const SlideIcon: React.FC<{ name: string }> = ({ name }) => {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon size={22} />;
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<SlideBadge, string> = {
  NOVO:      'text-primary',
  MELHORIA:  'text-emerald-400',
  'CORREÇÃO':'text-blue-400',
  'EM BREVE':'text-amber-400',
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const storageKey = (userId: string) =>
  `ddm-whats-new:${ANNOUNCEMENT_VERSION}:${userId}`;

const getViewCount = (userId: string): number => {
  try {
    return Number(localStorage.getItem(storageKey(userId)) || 0);
  } catch {
    return 99;
  }
};

const incrementViewCount = (userId: string): void => {
  try {
    const next = getViewCount(userId) + 1;
    localStorage.setItem(storageKey(userId), String(next));
  } catch {}
};

// ── Slide card ────────────────────────────────────────────────────────────────
const SlideCard: React.FC<{ slide: AnnouncementSlide }> = ({ slide }) => (
  <div className="rounded-2xl bg-surface-hover border border-border p-5 space-y-4">
    <div className="flex items-start gap-4">
      <div className="shrink-0 rounded-xl bg-primary/15 text-primary p-3">
        <SlideIcon name={slide.iconName} />
      </div>
      <div className="space-y-1 pt-0.5">
        <span className={`text-[11px] font-bold tracking-widest uppercase ${BADGE_STYLES[slide.badge]}`}>
          {slide.badge}
        </span>
        <h3 className="text-base font-bold leading-snug">{slide.title}</h3>
      </div>
    </div>
    <p className="text-sm text-text-secondary leading-relaxed">{slide.description}</p>
    <ul className="space-y-2">
      {slide.bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
          <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
          {b}
        </li>
      ))}
    </ul>
  </div>
);

// ── Main modal ────────────────────────────────────────────────────────────────
export const AnnouncementModal: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!user || ANNOUNCEMENT_SLIDES.length === 0) return;
    const count = getViewCount(user.id);
    if (count < ANNOUNCEMENT_MAX_VIEWS) {
      setVisible(true);
      incrementViewCount(user.id);
    }
  }, [user]);

  const total = ANNOUNCEMENT_SLIDES.length;

  const handleNext = () => {
    if (currentSlide < total - 1) {
      setDirection(1);
      setCurrentSlide((p) => p + 1);
    } else {
      setVisible(false);
    }
  };

  const handleClose = () => setVisible(false);

  const isLast = currentSlide === total - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  O que há de novo · V{ANNOUNCEMENT_VERSION}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-text-secondary hover:text-foreground transition-colors p-1 rounded-lg hover:bg-surface-hover"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slide content */}
            <div className="p-5 min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentSlide}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -30 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <SlideCard slide={ANNOUNCEMENT_SLIDES[currentSlide]} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between gap-4">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentSlide ? 1 : -1);
                      setCurrentSlide(i);
                    }}
                    className={`rounded-full transition-all ${
                      i === currentSlide
                        ? 'w-5 h-2 bg-primary'
                        : 'w-2 h-2 bg-border hover:bg-text-secondary'
                    }`}
                  />
                ))}
              </div>

              {/* Next / Close */}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                {isLast ? 'Fechar' : 'Próximo'}
                {!isLast && <ArrowRight size={15} />}
              </button>
            </div>

            {/* View count hint */}
            <p className="text-center text-[10px] text-text-secondary pb-3 opacity-50">
              Este aviso desaparece após {ANNOUNCEMENT_MAX_VIEWS} acessos
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
