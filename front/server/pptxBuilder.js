import PptxGenJS from "pptxgenjs";

// Mesma paleta de front/src/lib/slideThemes.ts — precisa ficar identica, e o
// .pptx tem que sair igual ao que a pessoa viu na pre-visualizacao da tela.
// Se mudar uma, muda a outra.
const SLIDE_THEMES = {
  ddm: {
    background: "#141110",
    foreground: "#FFFFFF",
    muted: "#B8B0A8",
    accent: "#FF5100",
    accentSoft: "#3A241A",
    cardBackground: "#1E1A18",
    border: "#332C28",
  },
  escuro: {
    background: "#0A0A0A",
    foreground: "#FFFFFF",
    muted: "#9A9A9A",
    accent: "#FF5100",
    accentSoft: "#241A16",
    cardBackground: "#161616",
    border: "#2A2A2A",
  },
  claro: {
    background: "#FFFFFF",
    foreground: "#18191B",
    muted: "#666A70",
    accent: "#FF5100",
    accentSoft: "#FFF1EB",
    cardBackground: "#F6F7F8",
    border: "#E6E7E9",
  },
};

const VALID_TYPES = new Set(["capa", "topicos", "duas_colunas", "citacao", "fechamento"]);
const VALID_THEMES = new Set(Object.keys(SLIDE_THEMES));

// Slide 16:9 em polegadas (padrao PptxGenJS LAYOUT_WIDE: 13.33 x 7.5).
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const MARGIN = 0.7;

const hex = (color) => String(color || "").replace("#", "");

const addFooter = (slide, colors, pageLabel) => {
  slide.addText(pageLabel, {
    x: MARGIN,
    y: SLIDE_H - 0.5,
    w: SLIDE_W - MARGIN * 2,
    h: 0.35,
    fontSize: 9,
    color: hex(colors.muted),
    align: "right",
  });
};

const buildSlide = (pptx, slide, colors, index, total, brandName) => {
  const s = pptx.addSlide();
  s.background = { color: hex(colors.background) };

  const pageLabel = slide.type === "capa" ? brandName : `${brandName} · ${index + 1}/${total}`;

  if (slide.type === "capa") {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: SLIDE_H, fill: { color: hex(colors.accent) } });
    s.addText(slide.title || "", {
      x: MARGIN,
      y: SLIDE_H / 2 - 1.1,
      w: SLIDE_W - MARGIN * 2,
      h: 1.6,
      fontSize: 40,
      bold: true,
      color: hex(colors.foreground),
      align: "left",
      valign: "bottom",
    });
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: MARGIN,
        y: SLIDE_H / 2 + 0.55,
        w: SLIDE_W - MARGIN * 2,
        h: 0.8,
        fontSize: 18,
        color: hex(colors.muted),
        align: "left",
      });
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  if (slide.type === "fechamento") {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: hex(colors.accent) } });
    s.addText(slide.title || "Obrigado", {
      x: MARGIN,
      y: SLIDE_H / 2 - 1,
      w: SLIDE_W - MARGIN * 2,
      h: 1.2,
      fontSize: 34,
      bold: true,
      color: hex(colors.foreground),
      align: "center",
    });
    if (slide.bullets?.length) {
      s.addText(
        slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: SLIDE_W / 2 - 3.5,
          y: SLIDE_H / 2 + 0.3,
          w: 7,
          h: 1.8,
          fontSize: 15,
          color: hex(colors.muted),
          align: "left",
        },
      );
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  if (slide.type === "citacao") {
    s.addText(`"${slide.quote || ""}"`, {
      x: MARGIN + 0.5,
      y: SLIDE_H / 2 - 1.3,
      w: SLIDE_W - (MARGIN + 0.5) * 2,
      h: 1.8,
      fontSize: 26,
      italic: true,
      color: hex(colors.foreground),
      align: "center",
      valign: "middle",
    });
    if (slide.quoteAuthor) {
      s.addText(`— ${slide.quoteAuthor}`, {
        x: MARGIN,
        y: SLIDE_H / 2 + 0.6,
        w: SLIDE_W - MARGIN * 2,
        h: 0.5,
        fontSize: 14,
        color: hex(colors.accent),
        align: "center",
      });
    }
    addFooter(s, colors, pageLabel);
    return;
  }

  // topicos / duas_colunas — cabecalho comum
  s.addText(slide.title || "", {
    x: MARGIN,
    y: 0.55,
    w: SLIDE_W - MARGIN * 2,
    h: 0.9,
    fontSize: 26,
    bold: true,
    color: hex(colors.foreground),
  });
  s.addShape(pptx.ShapeType.rect, { x: MARGIN, y: 1.35, w: 0.9, h: 0.06, fill: { color: hex(colors.accent) } });

  if (slide.type === "topicos") {
    s.addText(
      (slide.bullets || []).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: MARGIN,
        y: 1.7,
        w: SLIDE_W - MARGIN * 2,
        h: SLIDE_H - 2.5,
        fontSize: 18,
        color: hex(colors.foreground),
        valign: "top",
        lineSpacingMultiple: 1.4,
      },
    );
  }

  if (slide.type === "duas_colunas") {
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
      s.addText(
        (col.bullets || []).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: x + 0.25,
          y: col.heading ? 2.45 : 2.0,
          w: colW - 0.5,
          h: SLIDE_H - (col.heading ? 3.25 : 2.8),
          fontSize: 14,
          color: hex(colors.foreground),
          valign: "top",
        },
      );
    });
  }

  addFooter(s, colors, pageLabel);
};

/** Valida o formato minimo de um deck antes de gastar tempo/CPU montando o pptx. */
export const isValidDeck = ({ title, theme, slides }) =>
  Boolean(title?.trim()) &&
  VALID_THEMES.has(theme) &&
  Array.isArray(slides) &&
  slides.length > 0 &&
  slides.length <= 40 &&
  slides.every((s) => s && typeof s === "object" && VALID_TYPES.has(s.type));

/** Monta o .pptx inteiro no processo do servidor e devolve o buffer pronto pra download. */
export const buildPptxBuffer = async ({ title, theme, slides }) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "DDM_WIDE", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "DDM_WIDE";
  pptx.author = "DDM Lab";
  pptx.title = title;

  const colors = SLIDE_THEMES[theme];
  slides.forEach((slide, index) => {
    buildSlide(pptx, slide, colors, index, slides.length, "Grupo DDM");
  });

  return pptx.write({ outputType: "nodebuffer" });
};
