import type { FileInput } from './openai';
import { geminiFetch } from './aiProxy';
import { generateImageWithOpenAI, OpenAIImageError } from './openaiImage';

export type ImageProvider = 'gemini' | 'openai';

const GEMINI_MODEL = 'gemini-2.5-flash';

// The Gemini key now lives server-side (proxy). The client can't read a secret
// to decide availability, so we gate on a public build flag instead. Enabled by
// default; set VITE_GEMINI_ENABLED="false" to hide Gemini-only features.
export const isGeminiAvailable = import.meta.env.VITE_GEMINI_ENABLED !== 'false';

const PROMPT_BUILDER_SYSTEM = `
Voce e o Acordito - assistente do DDM Lab. Direto, inteligente, genuinamente util.

Entregue o conteudo pedido imediatamente, com qualidade.

REGRAS DE FORMATO — OBRIGATORIO no campo finalPrompt:

PARAGRAFOS: maximo 3 frases por paragrafo. Linha em branco entre paragrafos. NUNCA entregue um bloco continuo de texto.

CODIGO: SEMPRE em bloco markdown com linguagem:
\`\`\`python
# codigo aqui
\`\`\`
NUNCA codigo fora de bloco. NUNCA codigo misturado com texto corrido.

ESTRUTURA PARA RESPOSTAS COM CODIGO:
1. Frase curta de introducao
2. Bloco de codigo completo e funcional
3. Opcional: instrucoes de uso em paragrafo separado

LISTAS: use para passos, opcoes ou itens acionaveis. Um item por linha com "- ".

PROIBIDO: paredes de texto, codigo inline, paragrafos com mais de 5 linhas, placeholders como [Nome] ou [Data], cabecalhos artificiais como "Papel:", "Contexto:", "Tarefa:".

PERSONALIDADE: use o nome do usuario de forma natural quando disponivel no contexto. Documentos completos (ata, email, contrato, relatorio) so quando pedido com verbos como "escreva", "redija", "crie".

Retorne SOMENTE este JSON:
{
  "finalPrompt": "Conteudo completo em markdown bem formatado, com paragrafos curtos e codigo em blocos.",
  "extraSuggestion": "Opcional. Sugestao de ajuste ou variacao curta."
}
`;

const DEFAULT_CHAT_SYSTEM =
  `Voce e o Acordito - assistente do DDM Lab. Direto, inteligente, levemente bem-humorado, genuinamente util.

REGRAS DE FORMATO — OBRIGATORIO SEMPRE:

PARAGRAFOS: maximo 3 frases por paragrafo. Linha em branco obrigatoria entre paragrafos. NUNCA escreva mais de 4 frases seguidas sem quebra de linha.

CODIGO: SEMPRE em bloco markdown com a linguagem correta:
\`\`\`python
# codigo aqui
\`\`\`
NUNCA escreva codigo fora de bloco. NUNCA misture codigo com texto no mesmo paragrafo. NUNCA escreva codigo como texto corrido.

ESTRUTURA PARA RESPOSTAS COM CODIGO:
1. Uma frase curta de introducao (o que o codigo faz)
2. O bloco de codigo completo
3. Se necessario: ate 2 frases de explicacao ou instrucoes de uso — em paragrafo separado

LISTAS: use para 3+ itens acionaveis, passos sequenciais ou opcoes. Um item por linha. Para listas longas (5+ itens), agrupe com cabecalho em negrito.

PROIBIDO: paredes de texto sem respiro, codigo inline misturado com prosa, paragrafos com mais de 5 linhas, repeticao do que o usuario ja disse.

PERSONALIDADE: use o primeiro nome do usuario quando souber, de forma natural. Se nao souber, pergunte ("Como prefere que eu te chame?"). Tom: conversa inteligente, sem excesso de formalidade.

ESCOPO: Produza documentos completos (ata, email, contrato, relatorio, proposta) so com verbos explicitos como "escreva", "redija", "crie", "elabore". Para imagem, gere prompt para o DDM Creator. Tente responder antes de perguntar.`;

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message: string; code: number };
}

const callGemini = async (
  contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>,
  systemInstruction?: string,
): Promise<string> => {
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.6, maxOutputTokens: 8192 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await geminiFetch(`models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Erro Gemini: ${response.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('O Gemini não retornou conteúdo nesta resposta.');
  return text;
};

const extractJson = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
};

export const generatePromptWithGemini = async (
  userInput: string,
  department: string,
  context?: string,
  systemOverride?: string,
  files?: FileInput[],
): Promise<{ finalPrompt: string; extraSuggestion?: string }> => {
  const textPart: GeminiPart = {
    text: `Usuario do setor: ${department}
Contexto adicional: ${context || 'Nenhum'}
Pedido do usuario: "${userInput}"

Retorne apenas o JSON pedido no system instruction.`,
  };

  const fileParts: GeminiPart[] = (files || []).map((f) => ({
    inline_data: { mime_type: f.mimeType, data: f.data },
  }));

  const text = await callGemini(
    [{ role: 'user', parts: [...fileParts, textPart] }],
    systemOverride || PROMPT_BUILDER_SYSTEM,
  );

  const parsed = extractJson(text);
  if (parsed?.finalPrompt) {
    return { finalPrompt: String(parsed.finalPrompt).trim(), extraSuggestion: parsed.extraSuggestion?.trim() };
  }
  return { finalPrompt: text };
};

interface ImagenResponse {
  predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>;
  error?: { message: string; code: number };
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

// Imagen 3 via predict endpoint (requires separate API enablement)
const generateImageWithImagen3 = async (
  prompt: string,
  aspectRatio: ImageAspectRatio,
  sampleCount: number,
): Promise<Array<{ base64: string; mimeType: string }>> => {
  const response = await geminiFetch(
    'models/imagen-3.0-generate-002:predict',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount, aspectRatio },
      }),
    },
  );
  const data: ImagenResponse = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `Imagen3: ${response.status}`);
  if (!data.predictions?.length) throw new Error('Imagen3: sem predicoes');
  return data.predictions.map((p) => ({ base64: p.bytesBase64Encoded, mimeType: p.mimeType }));
};

// Gemini native image generation via generateContent (broader availability)
const generateImageWithGeminiNative = async (
  prompt: string,
  modelName = 'gemini-3.1-flash-image',
): Promise<Array<{ base64: string; mimeType: string }>> => {
  const response = await geminiFetch(
    `models/${modelName}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    },
  );
  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
    error?: { message: string };
  };
  if (!response.ok || data.error) throw new Error(data.error?.message || `GeminiNative(${modelName}): ${response.status}`);
  const images = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.inlineData)
    .map((p) => ({ base64: p.inlineData!.data, mimeType: p.inlineData!.mimeType }));
  if (!images.length) throw new Error(`GeminiNative(${modelName}): sem imagens`);
  return images;
};

export const generateImageWithGemini = async (
  prompt: string,
  aspectRatio: ImageAspectRatio = '1:1',
  sampleCount: number = 1,
): Promise<Array<{ base64: string; mimeType: string }>> => {
  if (!isGeminiAvailable) {
    throw new Error('O Gemini esta desativado nesta instalacao.');
  }
  return await generateImageWithGeminiNative(prompt, 'gemini-3.1-flash-image');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateCaption = async (
  prompt: string,
  imageUrl?: string,
): Promise<string> => {
  const parts: GeminiPart[] = [];
  if (imageUrl?.startsWith('data:image')) {
    parts.push({
      inline_data: {
        mime_type: imageUrl.split(';')[0].split(':')[1],
        data: imageUrl.split(',')[1],
      },
    });
  }
  parts.push({
    text: `Você é especialista em marketing digital. Crie uma legenda engajadora para acompanhar este conteúdo, baseada no pedido: "${prompt}". Inclua emojis e 3-5 hashtags estratégicas. Em Português do Brasil.`,
  });
  return callGemini([{ role: 'user', parts }]);
};

export const generateImageOptimized = async (
  prompt: string,
  aspectRatio: ImageAspectRatio = '1:1',
  options?: {
    colors?: { primary: string; accent: string };
    logoBase64?: string | null;
    referenceBase64?: string | string[] | null;
    negativePrompt?: string;
    maxRetries?: number;
    onRetry?: (attempt: number, error: string) => void;
    provider?: ImageProvider;
  },
): Promise<{ imageUrl: string; optimizedPrompt: string }> => {
  const { colors, logoBase64, referenceBase64, negativePrompt, maxRetries = 3, onRetry, provider = 'gemini' } = options || {};

  if (provider === 'openai') {
    return generateImageOptimizedWithOpenAI(prompt, aspectRatio, {
      colors,
      logoBase64,
      referenceBase64,
      negativePrompt,
      maxRetries,
      onRetry,
    });
  }

  if (!isGeminiAvailable) throw new Error('O Gemini esta desativado nesta instalacao.');

  // Step 1: Optimize prompt via gemini-2.5-flash
  const OPTIMIZER_SYSTEM = `You are an image prompt engineer. Your ONLY job is to translate the user's request into a precise English prompt for an image generation model.

RULES:
- Be STRICTLY FAITHFUL to what the user asked. Do NOT invent or add any element they did not mention.
- Only clarify ambiguous details (e.g. "person" → "adult person, neutral expression"). Do not decorate.
- Do NOT add lighting effects, camera angles, artistic styles, or mood unless the user explicitly requested them.
- Return ONLY the final prompt as plain text. No explanations, no preamble, no quotes.`;

  const optimizerParts: GeminiPart[] = [];
  const refs = referenceBase64 ? (Array.isArray(referenceBase64) ? referenceBase64 : [referenceBase64]) : [];

  let optimizerText = `User request: "${prompt}"`;
  if (refs.length > 0) {
    optimizerText = `Reference image${refs.length > 1 ? 's' : ''} attached. Use their visual style (composition, lighting, color tone) as stylistic inspiration ONLY — do not copy subjects or add elements not in the user request.\n\nUser request: "${prompt}"`;
    for (const ref of refs) {
      optimizerParts.push({
        inline_data: {
          mime_type: ref.split(';')[0].split(':')[1],
          data: ref.split(',')[1],
        },
      });
    }
  }

  optimizerParts.push({ text: optimizerText });

  let optimizedPrompt = (await callGemini([{ role: 'user', parts: optimizerParts }], OPTIMIZER_SYSTEM)).trim();

  if (colors) {
    optimizedPrompt += `\n\nCOLOR PALETTE — apply strictly: dominant color ${colors.primary} (use on backgrounds, shapes, key visual elements), accent color ${colors.accent} (use on highlights, borders, secondary elements). Do not use other dominant colors.`;
  }
  if (negativePrompt) {
    optimizedPrompt += `\n\nDo NOT include in the image: ${negativePrompt}.`;
  }

  // Step 2: Build parts for image generation
  type ImagePart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const finalParts: ImagePart[] = [];

  if (logoBase64) {
    optimizedPrompt += `\n\nA brand logo image is attached. REQUIREMENTS: render this exact logo visibly in the composition — preserve its original colors, shapes, symbols, and any text exactly as shown. Do not alter, stylize, or obscure the logo.`;
    finalParts.push({
      inlineData: {
        mimeType: logoBase64.split(';')[0].split(':')[1],
        data: logoBase64.split(',')[1],
      },
    });
  }

  finalParts.push({ text: optimizedPrompt });

  // Step 3: Generate image with retry
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await geminiFetch(
        'models/gemini-3.1-flash-image:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: finalParts }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        },
      );

      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> } }>;
        error?: { message: string; code: number };
      };

      if (!response.ok || data.error) {
        const errMsg = data.error?.message || `Erro ${response.status}`;
        const isRetryable =
          errMsg.includes('500') || errMsg.includes('INTERNAL') ||
          errMsg.includes('503') || errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') || errMsg.includes('deadline');
        if (isRetryable) {
          attempt++;
          if (onRetry) onRetry(attempt, errMsg);
          if (attempt >= maxRetries) throw new Error('Servidor instável. Tente novamente em instantes.');
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(errMsg);
      }

      for (const part of data.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return {
            imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            optimizedPrompt,
          };
        }
      }
      throw new Error('API retornou sucesso mas sem imagem na resposta.');
    } catch (err: any) {
      if (attempt >= maxRetries - 1) throw err;
      attempt++;
      if (onRetry) onRetry(attempt, err.message);
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw new Error('Falha após várias tentativas.');
};

// Caminho OpenAI (gpt-image-1). Nao passa pelo otimizador do Gemini: o
// gpt-image-1 entende o pedido em portugues direto, e assim a geracao nao
// depende da chave do Gemini estar funcionando. Logo e referencias vao como
// imagens de entrada.
const generateImageOptimizedWithOpenAI = async (
  prompt: string,
  aspectRatio: ImageAspectRatio,
  options: {
    colors?: { primary: string; accent: string };
    logoBase64?: string | null;
    referenceBase64?: string | string[] | null;
    negativePrompt?: string;
    maxRetries: number;
    onRetry?: (attempt: number, error: string) => void;
  },
): Promise<{ imageUrl: string; optimizedPrompt: string }> => {
  const { colors, logoBase64, referenceBase64, negativePrompt, maxRetries, onRetry } = options;
  const refs = referenceBase64 ? (Array.isArray(referenceBase64) ? referenceBase64 : [referenceBase64]) : [];

  let finalPrompt = prompt.trim();
  if (refs.length > 0) {
    finalPrompt += `\n\nUse as imagens de referencia anexadas apenas como inspiracao de estilo visual (composicao, iluminacao, tons de cor). Nao copie os elementos delas nem adicione nada que nao foi pedido.`;
  }
  if (colors) {
    finalPrompt += `\n\nPaleta de cores obrigatoria: cor dominante ${colors.primary} (fundos, formas, elementos principais) e cor de destaque ${colors.accent} (detalhes, bordas, elementos secundarios). Nao use outras cores dominantes.`;
  }
  if (negativePrompt) {
    finalPrompt += `\n\nNao inclua na imagem: ${negativePrompt}.`;
  }
  if (logoBase64) {
    finalPrompt += `\n\nA primeira imagem anexada e o logo da marca: coloque exatamente esse logo visivel na composicao, preservando cores, formas, simbolos e texto originais, sem alterar nem distorcer.`;
  }

  const inputImages = [...(logoBase64 ? [logoBase64] : []), ...refs];

  let attempt = 0;
  for (;;) {
    try {
      const imageUrl = await generateImageWithOpenAI(finalPrompt, aspectRatio, inputImages);
      return { imageUrl, optimizedPrompt: finalPrompt };
    } catch (err) {
      const status = err instanceof OpenAIImageError ? err.status : 0;
      const retryable = status === 429 || status >= 500 || status === 0;
      attempt++;
      if (!retryable || attempt >= maxRetries) throw err;
      if (onRetry) onRetry(attempt, (err as Error).message);
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
};

export const generateChatResponseWithGemini = async (
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  systemInstruction = DEFAULT_CHAT_SYSTEM,
  files?: FileInput[],
): Promise<string> => {
  const fileParts: GeminiPart[] = (files || []).map((f) => ({
    inline_data: { mime_type: f.mimeType, data: f.data },
  }));

  const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: h.content }] as GeminiPart[],
    })),
    { role: 'user' as const, parts: [...fileParts, { text: message }] },
  ];
  return callGemini(contents, systemInstruction);
};

