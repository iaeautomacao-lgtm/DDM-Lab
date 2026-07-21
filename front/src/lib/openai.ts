import { openaiFetch } from './aiProxy';

const OPENAI_MODEL = 'gpt-5-nano-2025-08-07';
// Max RAG chunks pulled per request. Uncapped file_search was the main cost
// driver — a few large docs made each call drag ~200k input tokens.
const FILE_SEARCH_MAX_RESULTS = 5;

// Active vector store ID - set by aicomandos.ts after fetching from Supabase.
// When set, all text generation calls include file_search for RAG context.
let _vectorStoreId: string | null = null;
export const setVectorStoreId = (id: string | null) => { _vectorStoreId = id; };

// Tipos compartilhados (anteriormente em gemini.ts)
export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptResult {
  finalPrompt: string;
  extraSuggestion?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface FileInput {
  name: string;
  mimeType: string;
  data: string;
}

export interface OpenAIChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface OpenAIPromptResult {
  finalPrompt: string;
  extraSuggestion?: string;
  inputTokens?: number;
  outputTokens?: number;
}

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

const normalizeError = (error: unknown) => {
  const raw = String(error instanceof Error ? error.message : error || '').toLowerCase();

  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('load failed')) {
    return new Error('Sem conexao com o servidor de IA. Verifique a rede, o proxy /api/openai ou os logs do servidor.');
  }
  if (raw.includes('401') || raw.includes('invalid') || raw.includes('authentication')) {
    return new Error('A chave da OpenAI esta invalida ou sem permissao.');
  }
  if (raw.includes('429') || raw.includes('quota') || raw.includes('rate limit')) {
    return new Error('Limite de requisicoes da OpenAI atingido. Tente novamente em instantes.');
  }
  if (raw.includes('503') || raw.includes('unavailable')) {
    return new Error('O servico da OpenAI esta indisponivel no momento. Tente novamente em instantes.');
  }

  if (error instanceof Error) return error;
  return new Error('Nao foi possivel obter resposta da OpenAI no momento.');
};

const callOpenAI = async (
  messages: Array<{ role: string; content: string | Array<unknown> }>,
  useFileSearch = true,
) => {
  // Separa system instruction das demais mensagens (Responses API usa "instructions")
  const systemMsg = messages.find((m) => m.role === 'system');
  const inputMsgs = messages.filter((m) => m.role !== 'system');

  const response = await openaiFetch('responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      ...(systemMsg ? { instructions: systemMsg.content } : {}),
      // Responses API requires each input item to have "type": "message"
      input: inputMsgs.map((m) => ({ type: 'message', role: m.role, content: m.content })),
      ...(_vectorStoreId && useFileSearch
        ? {
            tools: [
              {
                type: 'file_search',
                vector_store_ids: [_vectorStoreId],
                max_num_results: FILE_SEARCH_MAX_RESULTS,
              },
            ],
          }
        : {}),
    }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(JSON.stringify(data?.error || { code: response.status, message: response.statusText }));
  }

  // Responses API: find the assistant message item (type === "message") in the output
  // array - do NOT assume it is always at index 0 (reasoning tokens, tool calls, etc.
  // may appear before it). output_text is an SDK-only helper; it does not exist on
  // the raw fetch response.
  const messageItem = (data?.output as Array<{ type: string; content?: Array<{ type: string; text: string }> }> | undefined)
    ?.find((item) => item.type === 'message');
  const rawText = messageItem?.content
    ?.find((part) => part.type === 'output_text')
    ?.text?.trim();
  if (!rawText) throw new Error('A OpenAI nao retornou conteudo nesta resposta.');
  // Strip file_search citation markers injected by the Responses API (e.g. [4:0 source]).
  const text = rawText.replace(/\u3010\d+:\d+\u2020[^\u3011]*\u3011/g, '').trim();

  return {
    text,
    inputTokens: (data.usage?.input_tokens as number) ?? 0,
    outputTokens: (data.usage?.output_tokens as number) ?? 0,
  };
};

const extractJsonObject = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
};

const parseJsonSafe = <T>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(extractJsonObject(cleaned)) as T;
  }
};

export const generatePromptWithOpenAI = async (
  userInput: string,
  department: string,
  context?: string,
  systemOverride?: string,
  files?: FileInput[],
): Promise<OpenAIPromptResult> => {
  try {
    let effectiveInput = userInput;

    const pdfFiles = (files || []).filter((f) => f.mimeType === 'application/pdf');
    const imageFiles = (files || []).filter((f) => f.mimeType.startsWith('image/'));

    if (pdfFiles.length > 0) {
      const pdfNotes = pdfFiles
        .map((f) => `[Arquivo PDF: ${f.name} - conteudo nao suportado diretamente pelo OpenAI, use modelo Gemini para analise de PDF]`)
        .join('\n');
      effectiveInput = `${pdfNotes}\n\n${effectiveInput}`;
    }

    const userTextContent = `Usuario do setor: ${department}
Contexto adicional: ${context || 'Nenhum'}
Pedido do usuario: "${effectiveInput}"

Retorne apenas o JSON pedido no system instruction.`;

    let userMessageContent: string | Array<unknown>;
    if (imageFiles.length > 0) {
      userMessageContent = [
        { type: 'text', text: userTextContent },
        ...imageFiles.map((f) => ({
          type: 'image_url',
          image_url: { url: `data:${f.mimeType};base64,${f.data}` },
        })),
      ];
    } else {
      userMessageContent = userTextContent;
    }

    // Geração de prompt não usa RAG — file_search é só do chat Acordito.
    const result = await callOpenAI([
      { role: 'system', content: systemOverride || PROMPT_BUILDER_SYSTEM },
      { role: 'user', content: userMessageContent },
    ], false);

    try {
      const parsed = parseJsonSafe<OpenAIPromptResult>(result.text);
      return {
        finalPrompt: parsed.finalPrompt?.trim() || result.text,
        extraSuggestion: parsed.extraSuggestion?.trim(),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch {
      return { finalPrompt: result.text, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
    }
  } catch (error) {
    throw normalizeError(error);
  }
};


const IMAGE_PROMPT_SYSTEM = `Voce e um especialista em criacao de prompts para geradores de imagem (DALL-E, Midjourney, Stable Diffusion, Firefly).

Quando o usuario descrever uma imagem que quer criar, gere um prompt de imagem em ingles, detalhado e otimizado, pronto para colar em qualquer ferramenta de geracao de imagem.

O prompt deve incluir: sujeito principal, estilo artistico, iluminacao, composicao, cores, qualidade e formato.

Responda APENAS com o prompt de imagem pronto, sem explicacoes, sem introducao, sem markdown. So o prompt.`;

export const generateImagePrompt = async (userRequest: string): Promise<string> => {
  const result = await callOpenAI([
    { role: 'system', content: IMAGE_PROMPT_SYSTEM },
    { role: 'user', content: userRequest },
  ], false);
  return result.text.trim();
};

export const generateChatResponseWithOpenAI = async (
  message: string,
  history: OpenAIChatHistoryItem[] = [],
  systemInstruction = DEFAULT_CHAT_SYSTEM,
): Promise<string> => {
  try {
    const messages = [
      { role: 'system', content: systemInstruction },
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: message },
    ];

    return (await callOpenAI(messages)).text;
  } catch (error) {
    throw normalizeError(error);
  }
};
