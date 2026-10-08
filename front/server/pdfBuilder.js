import PDFDocument from "pdfkit";

// Mesma paleta de front/src/lib/slideThemes.ts e server/pptxBuilder.js —
// precisa ficar identica nos tres lugares (preview na tela, .pptx, .pdf).
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

// 16:9 em pontos (1in = 72pt) — mesma proporcao do .pptx (13.33in x 7.5in).
const SLIDE_W = 960;
const SLIDE_H = 540;
const MARGIN = 50;
const BODY_Y = 122;
const BODY_H = SLIDE_H - 180;

const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg);base64,/; // pdfkit so le png/jpeg

const addLogo = (doc, logoDataUrl, corner) => {
  if (!logoDataUrl || !LOGO_DATA_URL_RE.test(logoDataUrl)) return;
  try {
    const base64 = logoDataUrl.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const w = 65;
    const h = 32;
    const x = SLIDE_W - MARGIN - w;
    const y = corner === "cover" ? 36 : SLIDE_H - 36 - h;
    doc.image(buffer, x, y, { fit: [w, h] });
  } catch {
    // logo invalido/corrompido — nao derruba o pdf inteiro por causa disso
  }
};

const addFooter = (doc, colors, label) => {
  doc
    .fontSize(8)
    .fillColor(colors.muted)
    .text(label, MARGIN, SLIDE_H - 34, { width: SLIDE_W - MARGIN * 2, align: "right" });
};

const addContentHeader = (doc, slide, colors) => {
  doc.fontSize(20).fillColor(colors.foreground).font("Helvetica-Bold").text(slide.title || "", MARGIN, 40, {
    width: SLIDE_W - MARGIN * 2,
  });
  let y = 68;
  if (slide.subtitle) {
    doc.fontSize(10).fillColor(colors.muted).font("Helvetica").text(slide.subtitle, MARGIN, y, {
      width: SLIDE_W - MARGIN * 2,
    });
    y += 16;
  }
  doc.rect(MARGIN, y, 60, 3).fill(colors.accent);
};

const drawBarChart = (doc, slide, colors) => {
  const categories = slide.chartCategories || [];
  const series = slide.chartSeries || [];
  if (categories.length === 0 || series.length === 0) return;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const chartW = SLIDE_W - MARGIN * 2;
  const chartH = BODY_H - 30;
  const groupW = chartW / categories.length;
  const barColors = [colors.accent, colors.muted, colors.border];

  categories.forEach((cat, ci) => {
    const barW = (groupW * 0.6) / series.length;
    series.forEach((s, si) => {
      const value = s.values[ci] || 0;
      const barH = (value / max) * chartH;
      const x = MARGIN + ci * groupW + groupW * 0.2 + si * barW;
      doc
        .rect(x, BODY_Y + chartH - barH, barW - 2, barH)
        .fill(barColors[si % barColors.length]);
    });
    doc
      .fontSize(8)
      .fillColor(colors.muted)
      .text(cat, MARGIN + ci * groupW, BODY_Y + chartH + 6, { width: groupW, align: "center" });
  });
};

const drawLineChart = (doc, slide, colors) => {
  const categories = slide.chartCategories || [];
  const series = slide.chartSeries || [];
  if (categories.length < 2 || series.length === 0) return;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const chartW = SLIDE_W - MARGIN * 2;
  const chartH = BODY_H - 30;
  const stepX = chartW / (categories.length - 1);
  const lineColors = [colors.accent, colors.muted, colors.border];

  series.forEach((s, si) => {
    doc.strokeColor(lineColors[si % lineColors.length]).lineWidth(2);
    s.values.forEach((value, i) => {
      const x = MARGIN + i * stepX;
      const y = BODY_Y + chartH - (value / max) * chartH;
      if (i === 0) doc.moveTo(x, y);
      else doc.lineTo(x, y);
    });
    doc.stroke();
  });
  categories.forEach((cat, i) => {
    doc
      .fontSize(8)
      .fillColor(colors.muted)
      .text(cat, MARGIN + i * stepX - 20, BODY_Y + chartH + 6, { width: 40, align: "center" });
  });
};

const drawPieChart = (doc, slide, colors) => {
  const series = slide.chartSeries?.[0];
  if (!series || series.values.length === 0) return;
  const total = series.values.reduce((a, b) => a + b, 0) || 1;
  const cx = SLIDE_W / 2;
  const cy = BODY_Y + BODY_H / 2 - 10;
  const radius = Math.min(BODY_H, SLIDE_W / 3) / 2 - 10;
  const sliceColors = [colors.accent, colors.muted, colors.border, colors.cardBackground];
  let startAngle = -90;

  series.values.forEach((value, i) => {
    const sweep = (value / total) * 360;
    const endAngle = startAngle + sweep;
    const steps = Math.max(2, Math.ceil(sweep / 4));
    doc.moveTo(cx, cy);
    for (let s = 0; s <= steps; s++) {
      const angle = ((startAngle + (sweep * s) / steps) * Math.PI) / 180;
      doc.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }
    doc.closePath().fill(sliceColors[i % sliceColors.length]);
    startAngle = endAngle;
  });
};

const buildSlide = (doc, slide, colors, index, total, brandName, logoDataUrl) => {
  if (index > 0) doc.addPage({ size: [SLIDE_W, SLIDE_H], margin: 0 });
  doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(colors.background);
  addLogo(doc, logoDataUrl, slide.type === "capa" ? "cover" : "footer");

  const pageLabel = slide.type === "capa" ? brandName : `${brandName} · ${index + 1}/${total}`;

  if (slide.type === "capa") {
    doc.rect(0, 0, 4, SLIDE_H).fill(colors.accent);
    doc
      .fontSize(34)
      .fillColor(colors.foreground)
      .font("Helvetica-Bold")
      .text(slide.title || "", MARGIN, SLIDE_H / 2 - 50, { width: SLIDE_W - MARGIN * 2 });
    if (slide.subtitle) {
      doc
        .fontSize(14)
        .fillColor(colors.muted)
        .font("Helvetica")
        .text(slide.subtitle, MARGIN, SLIDE_H / 2 + 20, { width: SLIDE_W - MARGIN * 2 });
    }
    addFooter(doc, colors, pageLabel);
    return;
  }

  if (slide.type === "fechamento") {
    doc.rect(0, 0, SLIDE_W, 4).fill(colors.accent);
    doc
      .fontSize(28)
      .fillColor(colors.foreground)
      .font("Helvetica-Bold")
      .text(slide.title || "Obrigado", MARGIN, SLIDE_H / 2 - 40, { width: SLIDE_W - MARGIN * 2, align: "center" });
    if (slide.bullets?.length) {
      doc
        .fontSize(12)
        .fillColor(colors.muted)
        .font("Helvetica")
        .text(slide.bullets.join("\n"), SLIDE_W / 2 - 200, SLIDE_H / 2 + 10, { width: 400, align: "center" });
    }
    addFooter(doc, colors, pageLabel);
    return;
  }

  if (slide.type === "citacao") {
    doc
      .fontSize(20)
      .fillColor(colors.foreground)
      .font("Helvetica-Oblique")
      .text(`"${slide.quote || ""}"`, MARGIN + 40, SLIDE_H / 2 - 50, {
        width: SLIDE_W - (MARGIN + 40) * 2,
        align: "center",
      });
    if (slide.quoteAuthor) {
      doc
        .fontSize(11)
        .fillColor(colors.accent)
        .font("Helvetica-Bold")
        .text(`— ${slide.quoteAuthor}`, MARGIN, SLIDE_H / 2 + 40, { width: SLIDE_W - MARGIN * 2, align: "center" });
    }
    addFooter(doc, colors, pageLabel);
    return;
  }

  addContentHeader(doc, slide, colors);

  if (slide.type === "topicos") {
    doc
      .fontSize(13)
      .fillColor(colors.foreground)
      .font("Helvetica")
      .list(slide.bullets || [], MARGIN, BODY_Y, { width: SLIDE_W - MARGIN * 2, bulletRadius: 2 });
  }

  if (slide.type === "duas_colunas") {
    const colW = (SLIDE_W - MARGIN * 2 - 20) / 2;
    [slide.columnLeft, slide.columnRight].forEach((col, i) => {
      if (!col) return;
      const x = MARGIN + i * (colW + 20);
      doc.roundedRect(x, BODY_Y, colW, BODY_H, 6).fill(colors.cardBackground);
      doc.roundedRect(x, BODY_Y, colW, BODY_H, 6).stroke(colors.border);
      let y = BODY_Y + 14;
      if (col.heading) {
        doc.fontSize(12).fillColor(colors.accent).font("Helvetica-Bold").text(col.heading, x + 14, y, { width: colW - 28 });
        y += 20;
      }
      doc
        .fontSize(10)
        .fillColor(colors.foreground)
        .font("Helvetica")
        .list(col.bullets || [], x + 14, y, { width: colW - 28, bulletRadius: 1.5 });
    });
  }

  if (slide.type === "kpi_grid") {
    const items = slide.kpiItems || [];
    const colW = (SLIDE_W - MARGIN * 2) / Math.max(items.length, 1);
    items.forEach((item, i) => {
      const x = MARGIN + i * colW;
      doc.fontSize(26).fillColor(colors.accent).font("Helvetica-Bold").text(item.value || "", x, BODY_Y, { width: colW - 10 });
      doc
        .fontSize(11)
        .fillColor(colors.foreground)
        .font("Helvetica-Bold")
        .text(item.label || "", x, BODY_Y + 36, { width: colW - 10 });
      if (item.sublabel) {
        doc.fontSize(9).fillColor(colors.muted).font("Helvetica").text(item.sublabel, x, BODY_Y + 54, { width: colW - 10 });
      }
    });
  }

  if (slide.type === "insight_cards") {
    const items = slide.insightItems || [];
    const gap = 14;
    const colW = (SLIDE_W - MARGIN * 2 - gap * (items.length - 1)) / Math.max(items.length, 1);
    items.forEach((item, i) => {
      const x = MARGIN + i * (colW + gap);
      doc.roundedRect(x, BODY_Y, colW, BODY_H, 6).fill(colors.cardBackground);
      doc.roundedRect(x, BODY_Y, colW, BODY_H, 6).stroke(colors.border);
      let y = BODY_Y + 14;
      if (item.number) {
        doc.circle(x + 22, y + 8, 10).fill(colors.accent);
        doc
          .fontSize(10)
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .text(String(item.number), x + 17, y + 3, { width: 10, align: "center" });
        y += 26;
      }
      doc.fontSize(11).fillColor(colors.accent).font("Helvetica-Bold").text(item.title || "", x + 14, y, { width: colW - 28 });
      y += 18;
      doc
        .fontSize(9)
        .fillColor(colors.foreground)
        .font("Helvetica")
        .text(item.body || "", x + 14, y, { width: colW - 28 });
    });
  }

  if (slide.type === "funil") {
    const stages = slide.funnelStages || [];
    const gap = 10;
    const colW = (SLIDE_W - MARGIN * 2 - gap * (stages.length - 1)) / Math.max(stages.length, 1);
    stages.forEach((stage, i) => {
      const x = MARGIN + i * (colW + gap);
      const scale = 1 - i * (0.45 / Math.max(stages.length - 1, 1));
      const boxH = BODY_H * Math.max(scale, 0.45);
      const fill = i === 0 ? colors.accent : colors.cardBackground;
      doc.rect(x, BODY_Y, colW, boxH).fill(fill);
      doc.rect(x, BODY_Y, colW, boxH).stroke(colors.border);
      doc
        .fontSize(14)
        .fillColor(i === 0 ? "#FFFFFF" : colors.foreground)
        .font("Helvetica-Bold")
        .text(stage.value || "", x, BODY_Y + boxH / 2 - 14, { width: colW, align: "center" });
      doc
        .fontSize(9)
        .fillColor(i === 0 ? "#FFFFFF" : colors.muted)
        .font("Helvetica")
        .text(stage.label || "", x, BODY_Y + boxH / 2 + 4, { width: colW, align: "center" });
    });
  }

  if (slide.type === "grafico") {
    if (slide.chartType === "pie") drawPieChart(doc, slide, colors);
    else if (slide.chartType === "line") drawLineChart(doc, slide, colors);
    else drawBarChart(doc, slide, colors);
  }

  if (slide.type === "tabela") {
    const columns = slide.tableColumns || [];
    const rows = slide.tableRows || [];
    if (columns.length > 0) {
      const colW = (SLIDE_W - MARGIN * 2) / columns.length;
      const rowH = 24;
      doc.rect(MARGIN, BODY_Y, SLIDE_W - MARGIN * 2, rowH).fill(colors.accent);
      columns.forEach((col, i) => {
        doc
          .fontSize(10)
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .text(col, MARGIN + i * colW + 6, BODY_Y + 6, { width: colW - 12 });
      });
      rows.forEach((row, ri) => {
        const y = BODY_Y + rowH * (ri + 1);
        if (ri % 2 === 1) doc.rect(MARGIN, y, SLIDE_W - MARGIN * 2, rowH).fill(colors.cardBackground);
        row.forEach((cell, ci) => {
          doc
            .fontSize(9)
            .fillColor(colors.foreground)
            .font("Helvetica")
            .text(cell, MARGIN + ci * colW + 6, y + 6, { width: colW - 12 });
        });
      });
    }
  }

  addFooter(doc, colors, pageLabel);
};

/** Monta o .pdf inteiro no servidor e devolve o buffer pronto pra download. */
export const buildPdfBuffer = async ({ title, theme, slides, primaryColor, accentColor, logoDataUrl }) => {
  const colors = {
    ...SLIDE_THEMES[theme],
    ...(primaryColor ? { accent: primaryColor } : {}),
    ...(accentColor ? { accentSoft: accentColor } : {}),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [SLIDE_W, SLIDE_H], margin: 0, info: { Title: title, Author: "DDM Lab" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    slides.forEach((slide, index) => {
      buildSlide(doc, slide, colors, index, slides.length, "Grupo DDM", logoDataUrl);
    });

    doc.end();
  });
};
