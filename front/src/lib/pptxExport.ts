import PptxGenJS from 'pptxgenjs';
import type { Presentation, PresentationTheme, Slide } from './presentationsData';
import { SLIDE_THEMES } from './slideThemes';

export type ExportableDeck = Pick<Presentation, 'title' | 'theme' | 'slides'>;

// Slide 16:9 em polegadas (padrao PptxGenJS LAYOUT_WIDE: 13.33 x 7.5).
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const MARGIN = 0.7;

const hex = (color: string) => color.replace('#', '');

const addFooter = (slide: PptxGenJS.Slide, colors: ReturnType<typeof themeFor>, pageLabel: string) => {
  slide.addText(pageLabel, {
    x: MARGIN,
    y: SLIDE_H - 0.5,
    w: SLIDE_W - MARGIN * 2,
    h: 0.35,
    fontSize: 9,
    color: hex(colors.muted),
    align: 'right',
  });
};

function themeFor(theme: PresentationTheme) {
  return SLIDE_THEMES[theme];
}

const buildSlide = (pptx: PptxGenJS, slide: Slide, colors: ReturnType<typeof themeFor>, index: number, total: number, brandName: string) => {
  const s = pptx.addSlide();
  s.background = { color: hex(colors.background) };

  const pageLabel = slide.type === 'capa' ? brandName : `${brandName} · ${index + 1}/${total}`;

  if (slide.type === 'capa') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: SLIDE_H, fill: { color: hex(colors.accent) } });
    s.addText(slide.title || '', {
      x: MARGIN,
      y: SLIDE_H / 2 - 1.1,
      w: SLIDE_W - MARGIN * 2,
      h: 1.6,
      fontSize: 40,
      bold: true,
      color: hex(colors.foreground),
      align: 'left',
      valign: 'bottom',
    });
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: MARGIN,
        y: SLIDE_H / 2 + 0.55,
        w: SLIDE_W - MARGIN * 2,
        h: 0.8,
        fontSize: 18,
        color: hex(colors.muted),
        align: 'left',
      });
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  if (slide.type === 'fechamento') {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: hex(colors.accent) } });
    s.addText(slide.title || 'Obrigado', {
      x: MARGIN,
      y: SLIDE_H / 2 - 1,
      w: SLIDE_W - MARGIN * 2,
      h: 1.2,
      fontSize: 34,
      bold: true,
      color: hex(colors.foreground),
      align: 'center',
    });
    if (slide.bullets?.length) {
      s.addText(slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), {
        x: SLIDE_W / 2 - 3.5,
        y: SLIDE_H / 2 + 0.3,
        w: 7,
        h: 1.8,
        fontSize: 15,
        color: hex(colors.muted),
        align: 'left',
      });
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  if (slide.type === 'citacao') {
    s.addText(`“${slide.quote || ''}”`, {
      x: MARGIN + 0.5,
      y: SLIDE_H / 2 - 1.3,
      w: SLIDE_W - (MARGIN + 0.5) * 2,
      h: 1.8,
      fontSize: 26,
      italic: true,
      color: hex(colors.foreground),
      align: 'center',
      valign: 'middle',
    });
    if (slide.quoteAuthor) {
      s.addText(`— ${slide.quoteAuthor}`, {
        x: MARGIN,
        y: SLIDE_H / 2 + 0.6,
        w: SLIDE_W - MARGIN * 2,
        h: 0.5,
        fontSize: 14,
        color: hex(colors.accent),
        align: 'center',
      });
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  // topicos / duas_colunas — cabecalho comum
  s.addText(slide.title || '', {
    x: MARGIN,
    y: 0.55,
    w: SLIDE_W - MARGIN * 2,
    h: 0.9,
    fontSize: 26,
    bold: true,
    color: hex(colors.foreground),
  });
  s.addShape(pptx.ShapeType.rect, { x: MARGIN, y: 1.35, w: 0.9, h: 0.06, fill: { color: hex(colors.accent) } });

  if (slide.type === 'topicos') {
    s.addText((slide.bullets || []).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), {
      x: MARGIN,
      y: 1.7,
      w: SLIDE_W - MARGIN * 2,
      h: SLIDE_H - 2.5,
      fontSize: 18,
      color: hex(colors.foreground),
      valign: 'top',
      lineSpacingMultiple: 1.4,
    });
  }

  if (slide.type === 'duas_colunas') {
    const colW = (SLIDE_W - MARGIN * 2 - 0.5) / 2;
    [slide.columnLeft, slide.columnRight].forEach((col, i) => {
      if (!col) return;
      const x = MARGIN + i * (colW + 0.5);
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.7,
        w: colW,
        h: SLIDE_H - 2.5,
        fill: { color: hex(colors.cardBackground) },
        line: { color: hex(colors.border), width: 0.75 },
        rectRadius: 0.08,
      });
      if (col.heading) {
        s.addText(col.heading, {
          x: x + 0.25,
          y: 1.9,
          w: colW - 0.5,
          h: 0.5,
          fontSize: 15,
          bold: true,
          color: hex(colors.accent),
        });
      }
      s.addText(col.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), {
        x: x + 0.25,
        y: col.heading ? 2.45 : 2.0,
        w: colW - 0.5,
        h: SLIDE_H - (col.heading ? 3.25 : 2.8),
        fontSize: 14,
        color: hex(colors.foreground),
        valign: 'top',
      });
    });
  }

  addFooter(s, colors, pageLabel);
};

/** Gera o .pptx no navegador (pptxgenjs) e dispara o download. Nao passa pelo servidor. */
export const exportPresentationToPptx = async (presentation: ExportableDeck) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'DDM_WIDE', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'DDM_WIDE';
  pptx.author = 'DDM Lab';
  pptx.title = presentation.title;

  const colors = themeFor(presentation.theme);
  presentation.slides.forEach((slide, index) => {
    buildSlide(pptx, slide, colors, index, presentation.slides.length, 'Grupo DDM');
  });

  const fileName = `${presentation.title.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'apresentacao'}.pptx`;
  await pptx.writeFile({ fileName });
};
