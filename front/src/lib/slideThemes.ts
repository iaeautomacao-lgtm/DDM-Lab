import type { PresentationTheme } from './presentationsData';

// Paleta fixa por tema — usada tanto na pre-visualizacao em tela (inline
// style, nao token de CSS) quanto na exportacao .pptx, pra ficar identico
// nos dois. Um .pptx e estatico: nao pode herdar dark/light do navegador de
// quem abre o arquivo depois.
export interface SlideThemeColors {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  accentSoft: string;
  cardBackground: string;
  border: string;
}

export interface BrandOverrides {
  primaryColor?: string | null;
  accentColor?: string | null;
}

/** Aplica cor da marca por cima da paleta do tema — mesma logica do server/pptxBuilder.js. */
export const resolveThemeColors = (theme: PresentationTheme, overrides?: BrandOverrides): SlideThemeColors => ({
  ...SLIDE_THEMES[theme],
  ...(overrides?.primaryColor ? { accent: overrides.primaryColor } : {}),
  ...(overrides?.accentColor ? { accentSoft: overrides.accentColor } : {}),
});

export const SLIDE_THEMES: Record<PresentationTheme, SlideThemeColors> = {
  ddm: {
    background: '#141110',
    foreground: '#FFFFFF',
    muted: '#B8B0A8',
    accent: '#FF5100',
    accentSoft: '#3A241A',
    cardBackground: '#1E1A18',
    border: '#332C28',
  },
  escuro: {
    background: '#0A0A0A',
    foreground: '#FFFFFF',
    muted: '#9A9A9A',
    accent: '#FF5100',
    accentSoft: '#241A16',
    cardBackground: '#161616',
    border: '#2A2A2A',
  },
  claro: {
    background: '#FFFFFF',
    foreground: '#18191B',
    muted: '#666A70',
    accent: '#FF5100',
    accentSoft: '#FFF1EB',
    cardBackground: '#F6F7F8',
    border: '#E6E7E9',
  },
};
