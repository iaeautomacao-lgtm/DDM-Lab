import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

// Exportação do dashboard renderizado em tela — 100% client-side (sem servidor).
// Sem "Publicar"/Netlify Drop: um snapshot público do dashboard de um cliente
// sem senha nem controle de acesso seria um risco de confidencialidade/LGPD.

const BG = '#0A0A0B';
const EXPORT_SCALE = 2;

const PDF_SIZE_LIMIT_MESSAGE = 'O dashboard é grande demais para ser exportado em uma única página. Tente a opção PDF A4.';
const PNG_SIZE_LIMIT_MESSAGE = 'O dashboard é grande demais para ser exportado como uma única imagem. Reduza o conteúdo ou tente exportar em PDF A4.';

/** Lançado quando o dashboard excede o limite de área de canvas do navegador. */
export class CanvasSizeLimitError extends Error {
  constructor(message: string = PDF_SIZE_LIMIT_MESSAGE) {
    super(message);
    this.name = 'CanvasSizeLimitError';
  }
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement, limitMessage?: string): string {
  const dataUrl = canvas.toDataURL('image/png');
  if (!dataUrl.startsWith('data:image/png') || dataUrl.length < 100) {
    throw new CanvasSizeLimitError(limitMessage);
  }
  return dataUrl;
}

function normalizeExportError(e: unknown, limitMessage?: string): Error {
  if (e instanceof CanvasSizeLimitError) return e;
  const message = e instanceof Error ? e.message : String(e);
  if (/wrong png signature/i.test(message)) return new CanvasSizeLimitError(limitMessage);
  return e instanceof Error ? e : new Error(message);
}

function getScrollableAncestors(el: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
      result.push(node);
    }
    node = node.parentElement;
  }
  return result;
}

async function withPreservedScroll<T>(el: HTMLElement, fn: () => Promise<T>): Promise<T> {
  const ancestors = getScrollableAncestors(el);
  const prevScroll = ancestors.map((a) => a.scrollTop);
  const prevWindowScroll = window.scrollY;
  try {
    return await fn();
  } finally {
    ancestors.forEach((a, i) => { a.scrollTop = prevScroll[i]; });
    window.scrollTo(0, prevWindowScroll);
  }
}

async function snapshot(el: HTMLElement): Promise<HTMLCanvasElement> {
  return withPreservedScroll(el, async () => {
    getScrollableAncestors(el).forEach((a) => { a.scrollTop = 0; });
    window.scrollTo(0, 0);
    return html2canvas(el, {
      backgroundColor: BG,
      scale: EXPORT_SCALE,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
  });
}

function safeName(name: string): string {
  return (name || 'dashboard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'dashboard';
}

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function getExportBlockEdges(el: HTMLElement, canvas: HTMLCanvasElement): number[] {
  const elRect = el.getBoundingClientRect();
  const scale = canvas.width / elRect.width;
  const nodes = el.querySelectorAll<HTMLElement>('[data-export-block]');
  const edges: number[] = [];
  nodes.forEach((n) => {
    const r = n.getBoundingClientRect();
    edges.push((r.bottom - elRect.top) * scale);
  });
  return edges;
}

/** Exporta o elemento como PDF em página única, com a proporção exata do dashboard. */
export async function exportToPdfFit(el: HTMLElement, dashboardName: string): Promise<void> {
  await withPreservedScroll(el, async () => {
    try {
      const canvas = await snapshot(el);
      const img = canvasToPngDataUrl(canvas, PDF_SIZE_LIMIT_MESSAGE);
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.setFillColor(BG);
      pdf.rect(0, 0, canvas.width, canvas.height, 'F');
      pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${safeName(dashboardName)}.pdf`);
    } catch (e) {
      throw normalizeExportError(e, PDF_SIZE_LIMIT_MESSAGE);
    }
  });
}

/** Exporta o elemento como PDF paginado em A4, cortando só entre blocos (KPI/gráfico/header). */
export async function exportToPdfPaginated(el: HTMLElement, dashboardName: string): Promise<void> {
  await withPreservedScroll(el, async () => {
    try {
      const canvas = await snapshot(el);
      const edges = getExportBlockEdges(el, canvas).sort((a, b) => a - b);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const pageHeightPx = (pageH * canvas.width) / pageW;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      const ctx = sliceCanvas.getContext('2d')!;

      let cursor = 0;
      let firstPage = true;
      while (cursor < canvas.height - 1) {
        const naiveEnd = Math.min(cursor + pageHeightPx, canvas.height);
        let cut = naiveEnd;
        if (naiveEnd < canvas.height) {
          const candidates = edges.filter((e) => e > cursor + 1 && e <= naiveEnd);
          if (candidates.length) {
            cut = Math.max(...candidates);
          } else {
            const nextEdge = edges.find((e) => e > cursor + 1);
            if (nextEdge) cut = nextEdge;
          }
        }
        const sliceH = Math.max(1, Math.round(cut - cursor));

        sliceCanvas.height = sliceH;
        ctx.clearRect(0, 0, sliceCanvas.width, sliceH);
        ctx.drawImage(canvas, 0, cursor, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const imgData = canvasToPngDataUrl(sliceCanvas, PDF_SIZE_LIMIT_MESSAGE);
        const imgHmm = (sliceH * pageW) / canvas.width;

        if (!firstPage) pdf.addPage();
        pdf.setFillColor(BG);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgHmm);

        firstPage = false;
        cursor += sliceH;
      }
      pdf.save(`${safeName(dashboardName)}-a4.pdf`);
    } catch (e) {
      throw normalizeExportError(e, PDF_SIZE_LIMIT_MESSAGE);
    }
  });
}

/** Exporta o elemento como PNG, em alta resolução e sem cortes. */
export async function exportToPng(el: HTMLElement, dashboardName: string): Promise<void> {
  await withPreservedScroll(el, async () => {
    try {
      const canvas = await snapshot(el);
      const dataUrl = canvasToPngDataUrl(canvas, PNG_SIZE_LIMIT_MESSAGE);
      triggerDownload(dataUrl, `${safeName(dashboardName)}.png`);
    } catch (e) {
      throw normalizeExportError(e, PNG_SIZE_LIMIT_MESSAGE);
    }
  });
}
