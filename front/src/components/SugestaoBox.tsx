import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, X, Send, CheckCircle2, Bug, Zap, Bot, MessageSquare } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { submitSugestao } from '../lib/sugestoesData';

type PanelState = 'idle' | 'open' | 'submitting' | 'success';
type Categoria = 'funcionalidade' | 'bug' | 'navegacao' | 'ia_prompts' | 'outro';

const CATEGORIAS: { value: Categoria; label: string; icon: React.ReactNode; baseColor: string; activeColor: string }[] = [
  {
    value: 'funcionalidade',
    label: 'Nova funcionalidade',
    icon: <Lightbulb size={12} />,
    baseColor: 'border-amber-500/30 text-amber-400/70 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10',
    activeColor: 'border-amber-400 text-amber-300 bg-amber-500/20',
  },
  {
    value: 'bug',
    label: 'Problema/Bug',
    icon: <Bug size={12} />,
    baseColor: 'border-red-500/30 text-red-400/70 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10',
    activeColor: 'border-red-400 text-red-300 bg-red-500/20',
  },
  {
    value: 'navegacao',
    label: 'Experiência/Navegação',
    icon: <Zap size={12} />,
    baseColor: 'border-blue-500/30 text-blue-400/70 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10',
    activeColor: 'border-blue-400 text-blue-300 bg-blue-500/20',
  },
  {
    value: 'ia_prompts',
    label: 'IA/Prompts',
    icon: <Bot size={12} />,
    baseColor: 'border-violet-500/30 text-violet-400/70 bg-violet-500/5 hover:border-violet-500/50 hover:bg-violet-500/10',
    activeColor: 'border-violet-400 text-violet-300 bg-violet-500/20',
  },
  {
    value: 'outro',
    label: 'Outro',
    icon: <MessageSquare size={12} />,
    baseColor: 'border-white/15 text-text-secondary bg-white/3 hover:border-white/25 hover:bg-white/5',
    activeColor: 'border-white/40 text-white bg-white/10',
  },
];

const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

export const SugestaoBox: React.FC = () => {
  const { user, userData } = useUser();
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [content, setContent] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [error, setError] = useState('');

  const isOpen = panelState === 'open' || panelState === 'submitting';
  const charCount = content.trim().length;
  const remaining = MIN_LENGTH - charCount;
  const isReady = charCount >= MIN_LENGTH;

  const handleOpen = () => {
    setContent('');
    setError('');
    setCategoria(null);
    setPanelState('open');
  };

  const handleClose = () => {
    setPanelState('idle');
    setContent('');
    setError('');
    setCategoria(null);
  };

  const handleSubmit = async () => {
    if (!user || !userData) return;

    const trimmed = content.trim();
    if (trimmed.length < MIN_LENGTH) {
      setError(`A sugestão precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }

    setError('');
    setPanelState('submitting');

    try {
      await submitSugestao(
        user.id,
        userData.email ?? user.email ?? '',
        userData.name ?? userData.email ?? '',
        trimmed,
        categoria ?? 'outro',
      );
      setPanelState('success');
      setTimeout(() => {
        setPanelState('idle');
        setContent('');
        setCategoria(null);
      }, 3500);
    } catch {
      setError('Erro ao enviar sugestão. Tente novamente.');
      setPanelState('open');
    }
  };

  return (
    <>
      {/* Floating trigger — bottom-left.
          md:bottom-36 clears sidebar footer (profile card + logout ~130px). */}
      <AnimatePresence>
        {panelState === 'idle' && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={handleOpen}
            title="Enviar sugestão"
            className="fixed bottom-6 left-6 md:bottom-36 z-40 flex items-center gap-2 rounded-full bg-surface border border-border px-4 py-3 text-sm font-semibold text-white shadow-lg hover:border-primary/50 hover:bg-surface/80 transition-all group"
          >
            <Lightbulb size={18} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
            <span className="hidden sm:inline text-text-secondary group-hover:text-white transition-colors">
              Sugestão
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-6 left-6 md:bottom-36 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-white leading-tight">Enviar Sugestão</p>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                        Ajude a construir o próximo DDM Lab
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-text-secondary hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Context */}
                <div className="space-y-0.5">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Encontrou algo que pode melhorar? Compartilhe ideias, problemas ou funcionalidades que gostaria de ver.
                  </p>
                  <p className="text-[11px] text-text-secondary/60">
                    Ex.: Nova IA · Melhoria de navegação · Problema encontrado · Automação
                  </p>
                </div>

                {/* Category chips */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                    Tipo de sugestão
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIAS.map((cat) => {
                      const isSelected = categoria === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setCategoria(isSelected ? null : cat.value)}
                          disabled={panelState === 'submitting'}
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-50 ${
                            isSelected ? cat.activeColor : cat.baseColor
                          }`}
                        >
                          {cat.icon}
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    value={content}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_LENGTH) {
                        setContent(e.target.value);
                        if (error) setError('');
                      }
                    }}
                    disabled={panelState === 'submitting'}
                    rows={3}
                    placeholder="Ex.: Gostaria de salvar prompts favoritos para reutilizar depois."
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all resize-none placeholder:text-text-secondary/50 disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">
                      {error ? (
                        <span className="text-red-400">{error}</span>
                      ) : remaining > 0 ? (
                        <span className="text-text-secondary">
                          Conte um pouco mais —{' '}
                          <span className="text-amber-400 font-medium">faltam {remaining}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400">Parece ótimo!</span>
                      )}
                    </span>
                    <span className={`text-[11px] font-medium tabular-nums ${charCount >= MAX_LENGTH ? 'text-red-400' : 'text-text-secondary'}`}>
                      {charCount}/{MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={panelState === 'submitting' || !isReady}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {panelState === 'submitting' ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Enviar sugestão
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Success */}
        {panelState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 left-6 md:bottom-36 z-50 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-3.5 shadow-lg max-w-[260px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-emerald-400">Sugestão enviada!</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Obrigado! Sua ideia ajuda a evoluir o DDM Lab.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
