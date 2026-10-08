import JSZip from "jszip";

// Extrai so ESTRUTURA (sequencia de tipos de slide + cor dominante) de um
// .pptx enviado como referencia — NUNCA le/guarda o texto de verdade dos
// slides. E so geometria/contagem, pra nao correr risco de vazar dado de
// cliente pro prompt da IA depois. A pessoa confere/ajusta o resultado na
// tela antes de salvar como padrao.

const VALID_TYPES = ["capa", "topicos", "duas_colunas", "citacao", "fechamento", "kpi_grid", "insight_cards", "funil", "grafico", "tabela"];

const isNeutralColor = (hex) => {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 24) return true; // tom de cinza (incl. preto/branco)
  if (max > 245 && min > 225) return true; // quase branco
  return false;
};

const countBigNumericRuns = (xml) => {
  const runRegex = /<a:r>[\s\S]*?<\/a:r>/g;
  let count = 0;
  for (const run of xml.matchAll(runRegex)) {
    const szMatch = run[0].match(/sz="(\d+)"/);
    const textMatch = run[0].match(/<a:t>([^<]*)<\/a:t>/);
    if (!szMatch || !textMatch) continue;
    const sz = Number(szMatch[1]);
    const text = textMatch[1].trim();
    // sz em centesimos de ponto — 2400 = 24pt. Texto curto e majoritariamente
    // numerico/moeda/percentual (nao uma frase).
    if (sz >= 2400 && text.length > 0 && text.length <= 14 && /\d/.test(text) && /^[\dR$%.,º°\s A-Za-z-]+$/.test(text)) {
      count++;
    }
  }
  return count;
};

const classifySlide = (xml, index, total) => {
  if (index === 0) return "capa";
  if (index === total - 1) return "fechamento";
  if (xml.includes("<c:chart ") || xml.includes("<c:chart>")) return "grafico";
  if (xml.includes("<a:tbl>")) return "tabela";
  if (countBigNumericRuns(xml) >= 2) return "kpi_grid";
  const roundRectCount = (xml.match(/prst="roundRect"/g) || []).length;
  if (roundRectCount >= 2) return "insight_cards";
  return "topicos";
};

/** Analisa um buffer de .pptx e devolve a sequencia de slide + cor sugerida. */
export const analyzePptxTemplate = async (buffer) => {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw Object.assign(new Error("Arquivo nao parece ser um .pptx valido."), { code: "INVALID_PPTX" });
  }

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/)[1]) - Number(b.match(/slide(\d+)\.xml/)[1]));

  if (slideFiles.length === 0) {
    throw Object.assign(new Error("Nao achei slides dentro do arquivo. E mesmo um .pptx?"), { code: "NO_SLIDES" });
  }
  if (slideFiles.length > 40) {
    throw Object.assign(new Error("Apresentacao com slides demais (limite 40) pra usar como modelo."), { code: "TOO_MANY_SLIDES" });
  }

  const colorCounts = {};
  const slideSequence = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.file(slideFiles[i]).async("string");
    slideSequence.push(classifySlide(xml, i, slideFiles.length));

    for (const m of xml.matchAll(/<a:srgbClr val="([0-9A-Fa-f]{6})"/g)) {
      const hex = m[1].toUpperCase();
      if (isNeutralColor(hex)) continue;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }

  const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];
  const suggestedPrimaryColor = topColor ? `#${topColor[0]}` : "#FF5100";

  return {
    slideCount: slideFiles.length,
    slideSequence: slideSequence.filter((t) => VALID_TYPES.includes(t)),
    suggestedPrimaryColor,
  };
};
