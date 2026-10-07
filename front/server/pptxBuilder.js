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

const VALID_TYPES = new Set([
  "capa",
  "topicos",
  "duas_colunas",
  "citacao",
  "fechamento",
  "kpi_grid",
  "insight_cards",
  "funil",
  "grafico",
  "tabela",
]);
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

// Logo pequeno, tamanho fixo — nunca deixa o pptxgenjs auto-detectar
// dimensao (evita cair no parser de imagem vulneravel a DoS pra arquivos
// maliciosos; aqui e sempre um logo que o proprio dono da apresentacao subiu).
const LOGO_W = 0.9;
const LOGO_H = 0.45;

const addLogo = (s, logoDataUrl, corner) => {
  if (!logoDataUrl) return;
  const pos =
    corner === "cover"
      ? { x: SLIDE_W - MARGIN - LOGO_W, y: 0.5 }
      : { x: SLIDE_W - MARGIN - LOGO_W, y: SLIDE_H - 0.5 - LOGO_H };
  s.addImage({ data: logoDataUrl, x: pos.x, y: pos.y, w: LOGO_W, h: LOGO_H, sizing: { type: "contain", w: LOGO_W, h: LOGO_H } });
};

const buildSlide = (pptx, slide, colors, index, total, brandName, logoDataUrl) => {
  const s = pptx.addSlide();
  s.background = { color: hex(colors.background) };
  addLogo(s, logoDataUrl, slide.type === "capa" ? "cover" : "footer");

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

  // Cabecalho comum pra todo slide "de conteudo" (titulo + barra de destaque).
  // Usado por topicos, duas_colunas, kpi_grid, insight_cards, funil, grafico, tabela.
  s.addText(slide.title || "", {
    x: MARGIN,
    y: 0.55,
    w: SLIDE_W - MARGIN * 2,
    h: 0.75,
    fontSize: 26,
    bold: true,
    color: hex(colors.foreground),
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: MARGIN,
      y: 1.25,
      w: SLIDE_W - MARGIN * 2,
      h: 0.4,
      fontSize: 12,
      color: hex(colors.muted),
    });
  }
  s.addShape(pptx.ShapeType.rect, { x: MARGIN, y: 1.35, w: 0.9, h: 0.06, fill: { color: hex(colors.accent) } });

  const BODY_Y = 1.7;
  const BODY_H = SLIDE_H - 2.5;

  if (slide.type === "kpi_grid") {
    const items = slide.kpiItems || [];
    const colW = (SLIDE_W - MARGIN * 2) / Math.max(items.length, 1);
    items.forEach((item, i) => {
      const x = MARGIN + i * colW;
      s.addText(item.value || "", {
        x,
        y: BODY_Y,
        w: colW - 0.3,
        h: 1.1,
        fontSize: 32,
        bold: true,
        color: hex(colors.accent),
      });
      s.addText(item.label || "", {
        x,
        y: BODY_Y + 1.1,
        w: colW - 0.3,
        h: 0.5,
        fontSize: 13,
        bold: true,
        color: hex(colors.foreground),
      });
      if (item.sublabel) {
        s.addText(item.sublabel, {
          x,
          y: BODY_Y + 1.55,
          w: colW - 0.3,
          h: 0.4,
          fontSize: 10,
          color: hex(colors.muted),
        });
      }
    });
  }

  if (slide.type === "insight_cards") {
    const items = slide.insightItems || [];
    const gap = 0.35;
    const colW = (SLIDE_W - MARGIN * 2 - gap * (items.length - 1)) / Math.max(items.length, 1);
    items.forEach((item, i) => {
      const x = MARGIN + i * (colW + gap);
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: BODY_Y,
        w: colW,
        h: BODY_H,
        fill: { color: hex(colors.cardBackground) },
        line: { color: hex(colors.border), width: 0.75 },
        rectRadius: 0.08,
      });
      if (item.number) {
        s.addShape(pptx.ShapeType.ellipse, {
          x: x + 0.2,
          y: BODY_Y + 0.2,
          w: 0.4,
          h: 0.4,
          fill: { color: hex(colors.accent) },
        });
        s.addText(String(item.number), {
          x: x + 0.2,
          y: BODY_Y + 0.2,
          w: 0.4,
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: "FFFFFF",
          align: "center",
          valign: "middle",
        });
      }
      s.addText(item.title || "", {
        x: x + 0.25,
        y: BODY_Y + 0.75,
        w: colW - 0.5,
        h: 0.5,
        fontSize: 14,
        bold: true,
        color: hex(colors.accent),
      });
      s.addText(item.body || "", {
        x: x + 0.25,
        y: BODY_Y + 1.3,
        w: colW - 0.5,
        h: BODY_H - 1.5,
        fontSize: 11,
        color: hex(colors.foreground),
        valign: "top",
      });
    });
  }

  if (slide.type === "funil") {
    const stages = slide.funnelStages || [];
    const gap = 0.3;
    const colW = (SLIDE_W - MARGIN * 2 - gap * (stages.length - 1)) / Math.max(stages.length, 1);
    stages.forEach((stage, i) => {
      const x = MARGIN + i * (colW + gap);
      const scale = 1 - i * (0.5 / Math.max(stages.length - 1, 1));
      const boxH = BODY_H * Math.max(scale, 0.45);
      s.addShape(pptx.ShapeType.rect, {
        x,
        y: BODY_Y,
        w: colW,
        h: boxH,
        fill: { color: hex(i === 0 ? colors.accent : colors.cardBackground) },
        line: { color: hex(colors.border), width: 0.75 },
      });
      s.addText(stage.value || "", {
        x,
        y: BODY_Y + boxH / 2 - 0.5,
        w: colW,
        h: 0.5,
        fontSize: 18,
        bold: true,
        align: "center",
        color: hex(i === 0 ? "FFFFFF" : colors.foreground),
      });
      s.addText(stage.label || "", {
        x,
        y: BODY_Y + boxH / 2,
        w: colW,
        h: 0.4,
        fontSize: 11,
        align: "center",
        color: hex(i === 0 ? "FFFFFF" : colors.muted),
      });
      if (i < stages.length - 1) {
        s.addText("➜", {
          x: x + colW,
          y: BODY_Y + boxH / 2 - 0.25,
          w: gap,
          h: 0.5,
          fontSize: 16,
          align: "center",
          color: hex(colors.muted),
        });
      }
    });
  }

  if (slide.type === "grafico") {
    const categories = slide.chartCategories || [];
    const series = (slide.chartSeries || []).map((s2) => ({
      name: s2.name,
      labels: categories,
      values: s2.values,
    }));
    const chartTypeMap = {
      bar: pptx.ChartType.bar,
      line: pptx.ChartType.line,
      pie: pptx.ChartType.pie,
    };
    const chartColors = [colors.accent, colors.muted, colors.border].map(hex);
    if (series.length > 0) {
      s.addChart(chartTypeMap[slide.chartType] || pptx.ChartType.bar, series, {
        x: MARGIN,
        y: BODY_Y,
        w: SLIDE_W - MARGIN * 2,
        h: BODY_H,
        chartColors,
        showLegend: series.length > 1,
        legendPos: "b",
        catAxisLabelColor: hex(colors.muted),
        valAxisLabelColor: hex(colors.muted),
        dataLabelColor: hex(colors.foreground),
      });
    }
  }

  if (slide.type === "tabela") {
    const columns = slide.tableColumns || [];
    const rows = slide.tableRows || [];
    const headerRow = columns.map((c) => ({
      text: c,
      options: { bold: true, color: "FFFFFF", fill: { color: hex(colors.accent) } },
    }));
    const bodyRows = rows.map((row) =>
      row.map((cell) => ({ text: cell, options: { color: hex(colors.foreground) } } )),
    );
    if (headerRow.length > 0) {
      s.addTable([headerRow, ...bodyRows], {
        x: MARGIN,
        y: BODY_Y,
        w: SLIDE_W - MARGIN * 2,
        h: Math.min(BODY_H, 0.5 * (bodyRows.length + 1)),
        fontSize: 12,
        border: { type: "solid", color: hex(colors.border), pt: 0.5 },
        fill: { color: hex(colors.cardBackground) },
        autoPage: false,
      });
    }
  }

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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;
// ~2MB decodificado (base64 e ~33% maior que o binario original).
const MAX_LOGO_DATA_URL_LENGTH = 2.8 * 1024 * 1024;

/** Valida o formato minimo de um deck antes de gastar tempo/CPU montando o pptx. */
export const isValidDeck = ({ title, theme, slides, primaryColor, accentColor, logoDataUrl }) =>
  Boolean(title?.trim()) &&
  VALID_THEMES.has(theme) &&
  Array.isArray(slides) &&
  slides.length > 0 &&
  slides.length <= 40 &&
  slides.every((s) => s && typeof s === "object" && VALID_TYPES.has(s.type)) &&
  (primaryColor === undefined || primaryColor === null || HEX_COLOR_RE.test(primaryColor)) &&
  (accentColor === undefined || accentColor === null || HEX_COLOR_RE.test(accentColor)) &&
  (logoDataUrl === undefined ||
    logoDataUrl === null ||
    (LOGO_DATA_URL_RE.test(logoDataUrl) && logoDataUrl.length <= MAX_LOGO_DATA_URL_LENGTH));

/** Monta o .pptx inteiro no processo do servidor e devolve o buffer pronto pra download. */
export const buildPptxBuffer = async ({ title, theme, slides, primaryColor, accentColor, logoDataUrl }) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "DDM_WIDE", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "DDM_WIDE";
  pptx.author = "DDM Lab";
  pptx.title = title;

  // Cor da marca sobrescreve o acento fixo do tema quando a pessoa escolhe
  // uma — o resto da paleta (fundo/texto/bordas) continua vindo do tema.
  const colors = {
    ...SLIDE_THEMES[theme],
    ...(primaryColor ? { accent: primaryColor } : {}),
    ...(accentColor ? { accentSoft: accentColor } : {}),
  };

  slides.forEach((slide, index) => {
    buildSlide(pptx, slide, colors, index, slides.length, "Grupo DDM", logoDataUrl);
  });

  return pptx.write({ outputType: "nodebuffer" });
};
