import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Globe,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../lib/AuthContext';

const HERO_PLACEHOLDERS = [
  'Criar e-mail para cliente...',
  'Montar proposta comercial...',
  'Analisar relatório...',
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [quickRequest, setQuickRequest] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);
  const springMouseX = useSpring(heroMouseX, { stiffness: 90, damping: 18, mass: 0.45 });
  const springMouseY = useSpring(heroMouseY, { stiffness: 90, damping: 18, mass: 0.45 });
  const mascotTranslateX = useTransform(springMouseX, [-1, 1], [-12, 12]);
  const mascotTranslateY = useTransform(springMouseY, [-1, 1], [-10, 10]);
  const glowTranslateX = useTransform(springMouseX, [-1, 1], [-18, 18]);
  const glowTranslateY = useTransform(springMouseY, [-1, 1], [-14, 14]);

  useEffect(() => {
    const fullText = HERO_PLACEHOLDERS[placeholderIndex];
    const isTyping = typedPlaceholder.length < fullText.length;
    const timeout = window.setTimeout(
      () => {
        if (isTyping) {
          setTypedPlaceholder(fullText.slice(0, typedPlaceholder.length + 1));
          return;
        }

        setTypedPlaceholder('');
        setPlaceholderIndex((current) => (current + 1) % HERO_PLACEHOLDERS.length);
      },
      isTyping ? 55 : 1100,
    );

    return () => window.clearTimeout(timeout);
  }, [placeholderIndex, typedPlaceholder]);

  const rawName = profile?.preferredName || profile?.displayName?.split(' ')[0]?.split('.')[0] || 'Colaborador';
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  const goToGeneratorFromDashboard = () => {
    const objective = quickRequest.trim();
    navigate('/generator', {
      state: objective
        ? {
            objective,
            startStep: 2,
          }
        : undefined,
    });
  };

  const handleHeroPointerMove = (event: React.MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const offsetY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;

    heroMouseX.set(Math.max(-1, Math.min(1, offsetX)));
    heroMouseY.set(Math.max(-1, Math.min(1, offsetY)));
  };

  const handleHeroPointerLeave = () => {
    heroMouseX.set(0);
    heroMouseY.set(0);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 pb-20 md:space-y-16 md:px-0">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onMouseMove={handleHeroPointerMove}
        onMouseLeave={handleHeroPointerLeave}
        className="relative overflow-hidden rounded-[2rem] border border-primary/16 bg-gradient-to-br from-[#211511] via-surface to-surface p-6 sm:p-10 md:p-14"
      >
        <motion.div
          className="pointer-events-none absolute -left-20 top-[-12%] h-72 w-72 rounded-full bg-primary/18 blur-[90px]"
          style={{ x: glowTranslateX, y: glowTranslateY }}
          animate={{ scale: [1, 1.08, 0.98, 1], opacity: [0.38, 0.52, 0.34, 0.38] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 right-[-4%] h-64 w-64 rounded-full bg-orange-500/10 blur-[100px]"
          animate={{ scale: [1.02, 0.96, 1.04, 1.02], opacity: [0.16, 0.26, 0.14, 0.16] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-70"
          style={{
            padding: '1px',
            background:
              'conic-gradient(from 0deg, rgba(255,81,0,0.00), rgba(255,153,102,0.12), rgba(255,81,0,0.32), rgba(255,255,255,0.14), rgba(255,81,0,0.24), rgba(255,81,0,0.00))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col items-center space-y-6 text-center md:items-start md:text-left">
            <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              DDM Lab · Inteligência Artificial
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Olá, {firstName}! Bem-vindo ao <span className="text-primary">DDM Lab</span>.
            </h2>

            <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
              Preparamos recomendações exclusivas para acelerar suas tarefas diárias com o nosso assistente{' '}
              <span className="font-semibold text-foreground">Acordito</span>.
            </p>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Button
                onClick={() => navigate('/generator')}
                className="w-full justify-center rounded-xl sm:w-auto"
              >
                Começar do zero
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="relative flex h-52 w-52 sm:h-64 sm:w-64 lg:h-80 lg:w-80">
              <motion.div
                className="absolute inset-4 rounded-full bg-primary/20 blur-[60px]"
                style={{ x: glowTranslateX, y: glowTranslateY }}
              />
              <motion.div
                className="relative z-10 h-full w-full"
                style={{ x: mascotTranslateX, y: mascotTranslateY }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="h-full w-full overflow-hidden rounded-[2rem] border border-border bg-surface p-2 shadow-2xl md:p-3">
                  <video
                    src="/Vídeo_de_Aceno_Pronto_Acordito.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full rounded-[1.5rem] object-cover object-top"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="absolute -right-2 -top-6 z-20 rounded-2xl rounded-bl-none border border-primary/30 bg-surface px-4 py-3 shadow-xl md:-right-6"
              >
                <p className="text-sm font-bold text-foreground">Olá!</p>
                <p className="whitespace-nowrap text-[10px] text-text-secondary">Pronto para turbinar o dia?</p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-extrabold tracking-tight md:text-5xl"
        >
          O que você quer que a <span className="text-primary">IA faça</span> hoje?
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group relative mx-auto max-w-3xl"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-orange-500 to-orange-600 opacity-30 blur transition-opacity duration-300 group-focus-within:opacity-70" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {[0, 1, 2, 3, 4, 5].map((particle) => (
              <motion.span
                key={particle}
                className="absolute h-1.5 w-1.5 rounded-full bg-primary/30"
                style={{
                  left: `${14 + particle * 14}%`,
                  top: `${22 + (particle % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -10 - (particle % 2) * 4, 0],
                  x: [0, particle % 2 === 0 ? 6 : -6, 0],
                  opacity: [0.1, 0.35, 0.1],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  duration: 4.5 + particle * 0.45,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: particle * 0.35,
                }}
              />
            ))}
          </div>
          <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-2xl sm:flex-row sm:gap-0">
            <input
              type="text"
              placeholder={typedPlaceholder}
              value={quickRequest}
              onChange={(e) => setQuickRequest(e.target.value)}
              className="w-full flex-1 border-none bg-transparent px-4 py-3 text-base placeholder:text-text-secondary/60 focus:outline-none focus:ring-0 sm:py-4 sm:text-lg"
              onKeyDown={(e) => e.key === 'Enter' && goToGeneratorFromDashboard()}
            />
            <Button size="lg" className="w-full rounded-xl sm:w-auto" onClick={goToGeneratorFromDashboard}>
              Criar Pedido
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Sobre */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-8"
      >
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary w-fit">
            <Rocket size={11} />
            Sobre o DDM Lab
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl mt-2">
            IA para <span className="text-primary">todos</span> — não só para quem é de tecnologia.
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">
            O DDM Lab nasce da convicção de que a inteligência artificial deve estar nas mãos de quem realmente faz a empresa acontecer: você, no seu setor, no seu dia a dia.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-6 space-y-4 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Rocket size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Nossa origem</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Fundado por pessoas que conhecem a jornada dos colaboradores, o Grupo DDM dedica anos a conectar educação, cobrança humanizada e resultado real para famílias em todo o Brasil.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-border bg-surface">
            <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-foreground">
              <Globe size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Missão</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Criar pontes entre nossos clientes e os clientes dos nossos clientes, por meio de cobrança humanizada e excelência na experiência de atendimento.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-border bg-surface">
            <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-foreground">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Visão</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Ser referência em soluções inovadoras de cobrança, com metodologia centrada no cliente final, foco em resultado e inovação tecnológica.
              </p>
            </div>
          </Card>
        </div>

        {/* Destaque IA */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/8 via-surface to-surface p-6 md:p-8">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">DDM Lab · Inteligência Artificial</p>
              <h3 className="text-xl font-extrabold leading-snug">
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
                O Acordito é o seu assistente interno treinado para o contexto do Grupo DDM. Use os modelos prontos ou crie pedidos personalizados para acelerar sua rotina.
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => navigate('/generator')}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                Criar um pedido
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
