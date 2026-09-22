// ── Configuração do modal "O que há de novo" ─────────────────────────────────
// Para exibir um novo aviso: edite ANNOUNCEMENT_VERSION e ANNOUNCEMENT_SLIDES,
// depois faça o commit. O modal aparece automaticamente para todos os usuários
// que ainda não viram esta versão (some após ANNOUNCEMENT_MAX_VIEWS acessos).
//
// Para desativar sem exibir nada: deixe ANNOUNCEMENT_SLIDES vazio.

export const ANNOUNCEMENT_VERSION = '2.2';
export const ANNOUNCEMENT_MAX_VIEWS = 3;

export type SlideBadge = 'NOVO' | 'MELHORIA' | 'CORREÇÃO' | 'EM BREVE';

export interface AnnouncementSlide {
  iconName: string; // nome de ícone Lucide: Sparkles, BookOpen, Lightbulb, Zap, etc.
  badge: SlideBadge;
  title: string;
  description: string;
  bullets: string[];
}

export const ANNOUNCEMENT_SLIDES: AnnouncementSlide[] = [
  {
    iconName: 'ImageIcon',
    badge: 'NOVO',
    title: 'DDM Creator chegou!',
    description:
      'Crie imagens profissionais para posts, campanhas e materiais de marca diretamente no DDM Lab — sem sair da plataforma.',
    bullets: [
      'Gere até 6 variações de imagem por vez',
      'Envie logo e referências visuais da sua marca',
      'Escolha formato: quadrado, paisagem ou story',
      'Histórico de criações salvo no seu perfil',
    ],
  },
];
