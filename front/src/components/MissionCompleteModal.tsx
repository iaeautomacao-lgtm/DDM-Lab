import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MissionCompleteModalProps {
  isOpen: boolean;
  xp: number;
  badge: string;
  missionTitle: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#FF6321', '#FFB347', '#FFD700', '#FFF', '#10B981', '#3B82F6'];
const CONFETTI_COUNT = 60;

const Confetti: React.FC = () => {
  const pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 1.2,
    duration: 2.2 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', x: p.drift, opacity: [1, 1, 0], rotate: p.rotation * 3 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            left: p.left,
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
};

export const MissionCompleteModal: React.FC<MissionCompleteModalProps> = ({
  isOpen,
  xp,
  badge,
  missionTitle,
  onClose,
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setShowContent(true), 100);
      const autoClose = setTimeout(onClose, 7000);
      return () => { clearTimeout(t); clearTimeout(autoClose); };
    } else {
      setShowContent(false);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <Confetti />

          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 flex max-w-sm flex-col items-center rounded-3xl px-8 py-10 text-center"
            style={{
              background: 'rgba(18,18,26,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(255,99,33,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Fechar */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-white/30 transition hover:text-white"
            >
              <X size={18} />
            </button>

            {/* Badge image */}
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }}
              className="mb-6"
            >
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: 'rgba(255,99,33,0.35)', transform: 'scale(1.2)' }} />
                <img
                  src="/badges/missao-concluida.png"
                  alt="Badge de missão concluída"
                  className="relative z-10 h-44 w-44 object-contain drop-shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </motion.div>

            {/* Texto */}
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                  Missão Concluída
                </p>

                <h2 className="text-3xl font-black text-white leading-tight">
                  Parabéns! 🎯
                </h2>

                <p className="text-base font-semibold text-white/80">
                  {missionTitle}
                </p>

                <p className="text-sm text-white/50 leading-relaxed">
                  Você acaba de transformar IA em resultado real.<br />
                  Cada missão é um passo concreto no futuro do Grupo DDM.
                </p>

                {/* XP e Badge ganhos */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ background: 'rgba(255,99,33,0.2)', border: '1px solid rgba(255,99,33,0.3)' }}>
                    +{xp} XP
                  </div>
                  <div className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)' }}>
                    🏅 {badge}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition"
                  style={{ background: 'rgba(255,99,33,0.85)' }}
                >
                  Continuar a jornada
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
