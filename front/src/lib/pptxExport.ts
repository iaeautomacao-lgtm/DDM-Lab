import { ApiError } from './apiClient';
import type { Presentation } from './presentationsData';

export type ExportableDeck = Pick<Presentation, 'title' | 'theme' | 'slides'> & {
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUrl?: string | null;
};

/**
 * Pede pro servidor montar o .pptx (pptxgenjs roda no processo Node, nao no
 * navegador) e dispara o download da resposta. O front nunca monta o arquivo
 * sozinho — so manda o deck e recebe o binario pronto.
 */
export const exportPresentationToPptx = async (presentation: ExportableDeck): Promise<void> => {
  const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';

  const res = await fetch(`${API_BASE}/api/presentations/export`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(presentation),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.message || `Não foi possível gerar o .pptx (erro ${res.status}).`, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const fileName = `${presentation.title.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'apresentacao'}.pptx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
