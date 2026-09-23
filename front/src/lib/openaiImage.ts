import { openaiFetch } from './aiProxy';

// gpt-image-1 via proxy /api/openai. Qualidade "medium": bom custo-beneficio
// pra peca de redes sociais (high custa varias vezes mais por imagem).
const OPENAI_IMAGE_MODEL = 'gpt-image-1';
const OPENAI_IMAGE_QUALITY = 'medium';

// gpt-image-1 so aceita estes tamanhos; proporcoes do Creator viram o mais proximo.
const sizeForRatio = (aspectRatio: string) => {
  if (aspectRatio === '1:1') return '1024x1024';
  if (aspectRatio === '16:9' || aspectRatio === '4:3') return '1536x1024';
  return '1024x1536'; // 9:16, 3:4
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, base64] = dataUrl.split(',');
  const mimeType = meta.split(';')[0].split(':')[1] || 'image/png';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
};

export class OpenAIImageError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Gera uma imagem com gpt-image-1. Com imagens de entrada (logo, referencias)
 * usa /images/edits, que recebe as imagens como contexto visual; sem elas usa
 * /images/generations. Retorna data URL (PNG).
 */
export const generateImageWithOpenAI = async (
  prompt: string,
  aspectRatio: string,
  inputImages: string[] = [],
): Promise<string> => {
  const size = sizeForRatio(aspectRatio);
  let response: Response;

  if (inputImages.length > 0) {
    const form = new FormData();
    form.append('model', OPENAI_IMAGE_MODEL);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', OPENAI_IMAGE_QUALITY);
    form.append('n', '1');
    inputImages.forEach((image, index) => {
      const blob = dataUrlToBlob(image);
      const ext = blob.type.split('/')[1] || 'png';
      form.append('image[]', blob, `entrada-${index}.${ext}`);
    });
    // Sem Content-Type manual: o navegador monta o boundary do multipart.
    response = await openaiFetch('images/edits', { method: 'POST', body: form });
  } else {
    response = await openaiFetch('images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, size, quality: OPENAI_IMAGE_QUALITY, n: 1 }),
    });
  }

  const data = (await response.json().catch(() => ({}))) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  };

  if (!response.ok || data.error) {
    throw new OpenAIImageError(data.error?.message || `OpenAI imagem: erro ${response.status}`, response.status);
  }

  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new OpenAIImageError('OpenAI retornou sucesso mas sem imagem na resposta.', 502);
  return `data:image/png;base64,${base64}`;
};
