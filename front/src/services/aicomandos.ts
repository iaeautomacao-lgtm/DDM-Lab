import {
  generateChatResponseWithOpenAI,
  generateImagePrompt,
  generatePromptWithOpenAI,
  setVectorStoreId,
  type ChatHistoryItem,
  type FileInput,
  type PromptResult,
} from '../lib/openai';
import { getVectorStoreId } from '../lib/knowledgeBase';
import { generatePromptWithGemini, generateChatResponseWithGemini, generateImageWithGemini, isGeminiAvailable } from '../lib/gemini';
import { fetchAgentSystemPrompt } from '../lib/agentConfig';

// Re-exporta tipos com nomes compatíveis para não quebrar imports existentes
export type GeminiFileInput = FileInput;
export type GeminiChatHistoryItem = ChatHistoryItem;
export interface GenerationResult extends PromptResult {}

// Disponibilidade de cada modelo baseada nas env vars configuradas
// Lazy init — fetches vector store ID from Supabase once and wires it into openai.ts
let _vsInitDone = false;
const initVectorStore = async () => {
  if (_vsInitDone) return;
  _vsInitDone = true;
  try {
    const id = await getVectorStoreId();
    setVectorStoreId(id);
  } catch {}
};

// Keys agora vivem no servidor (proxy /api/*). O cliente não vê mais os segredos,
// então a disponibilidade não é derivada deles: OpenAI é sempre requerido; Gemini
// segue o flag público VITE_GEMINI_ENABLED (ver gemini.ts).
export const MODEL_AVAILABILITY = {
  OpenAI: true,
  Gemini: isGeminiAvailable,
} as const;

export type SupportedModel = keyof typeof MODEL_AVAILABILITY;

// Prefixo injetado em prompts customizados para garantir geração direta sem perguntas.
// Os prompts de setor (agentConfig.ts) não têm regras de parágrafo/lista — por isso
// elas vão aqui, senão o texto sai como bloco único (sem quebras nem listas).
const DIRECT_GENERATION_OVERRIDE =
  'INSTRUCAO PRIORITARIA: Entregue o conteudo solicitado imediatamente, sem pedir mais informacoes. Nao use titulos artificiais como "Papel:", "Contexto:", "Tarefa:", nem colchetes de preenchimento como [Nome] ou [Data]. Interprete o pedido com bom senso e entregue o melhor resultado possivel. Sugestoes de ajuste vao no campo extraSuggestion.\n\n' +
  'REGRAS DE FORMATO — OBRIGATORIO no campo finalPrompt:\n' +
  'PARAGRAFOS: maximo 3 frases por paragrafo, com linha em branco entre paragrafos. Paredes de texto (bloco continuo sem quebras) sao PROIBIDAS.\n' +
  'LISTAS: quando houver 3 ou mais itens, etapas ou opcoes, coloque cada item em sua propria linha comecando com "- " ou numerado. Nunca junte varios itens em uma linha corrida separados por hifen no meio da frase.\n' +
  'CODIGO: sempre em bloco markdown com a linguagem (ex: ```python), nunca misturado com o texto corrido.\n\n';

// Instrução de formato JSON sempre anexada ao prompt customizado do Admin,
// garantindo que o modelo retorne a estrutura esperada independente do setor.
const JSON_FORMAT_SUFFIX = `

Ao responder pedidos de escrita, reescrita, resumo, revisao, adaptacao ou qualquer tarefa de producao de texto, retorne SEMPRE no seguinte formato JSON:
{
  "finalPrompt": "Resposta completa e pronta em texto natural, sem markdown",
  "extraSuggestion": "Opcional. Uma sugestao curta de proximo ajuste"
}`;

const DEFAULT_CHAT_SYSTEM =
  'Voce e o Acordito — assistente do DDM Lab com personalidade propria. Direto, inteligente, levemente bem-humorado e genuinamente util. Trate o usuario pelo primeiro nome sempre que souber. Se nao souber, pergunte de forma natural logo na primeira interacao ("Como prefere que eu te chame?"). Use o nome de forma espontanea, nao robotica. FORMATO: use paragrafos curtos (2-3 frases cada), com quebra de linha entre eles. Nunca escreva um bloco continuo de texto. Perguntas simples recebem 1-2 paragrafos. Quando o usuario pedir uma lista explicita (ex: "3 competencias", "5 passos"), use uma linha por item — mas sem bullets excessivos para respostas conversacionais. Nunca use titulos em negrito nem secoes com rotulos. So produza documentos completos (ata, email formal, contrato, relatorio, proposta) quando o usuario pedir com verbos como "escreva", "redija", "crie", "elabore" ou "faca". Para pedidos de imagem, crie prompt detalhado para o DDM Creator. Faca perguntas so quando genuinamente precisar de mais contexto — mas nao questione antes de ter tentado responder.';

export const generatePrompt = async (
  userInput: string,
  department: string,
  context?: string,
  files?: FileInput[],
  model: string = 'OpenAI',
): Promise<GenerationResult> => {
  void initVectorStore();
  let customSystem: string | undefined;
  try {
    const stored = await fetchAgentSystemPrompt(department);
    if (stored) customSystem = DIRECT_GENERATION_OVERRIDE + stored + JSON_FORMAT_SUFFIX;
  } catch {}

  if (model === 'Gemini') {
    return generatePromptWithGemini(userInput, department, context, customSystem, files);
  }
  // Default: OpenAI
  return generatePromptWithOpenAI(userInput, department, context, customSystem, files);
};

const IMAGE_KEYWORDS = [
  'imagem', 'foto', 'banner', 'arte', 'design', 'logo', 'ilustra',
  'visual', 'criar imagem', 'gere uma imagem', 'gera uma imagem',
  'quero uma imagem', 'fazer imagem', 'crie uma imagem', 'gerar imagem',
  'criar arte', 'criar banner', 'criar logo', 'criar foto',
];

export const isImageRequest = (text: string): boolean => {
  const lower = text.toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
};

export interface ImageGenerationResult {
  prompt: string;
  images: Array<{ base64: string; mimeType: string }>;
  imageError?: string;
}

export const generateImage = async (userRequest: string): Promise<ImageGenerationResult> => {
  const prompt = await generateImagePrompt(userRequest);
  if (isGeminiAvailable) {
    try {
      const images = await generateImageWithGemini(prompt);
      return { prompt, images };
    } catch (err) {
      const imageError = err instanceof Error ? err.message : 'Erro ao gerar imagem com Gemini.';
      return { prompt, images: [], imageError };
    }
  }
  return { prompt, images: [] };
};

export const sendChatMessage = async (
  message: string,
  department: string,
  history: ChatHistoryItem[] = [],
  _files?: FileInput[],
  model: string = 'OpenAI',
  userName?: string,
): Promise<string> => {
  void initVectorStore();
  let systemPrompt = DEFAULT_CHAT_SYSTEM;
  try {
    const stored = await fetchAgentSystemPrompt(department);
    if (stored) systemPrompt = stored;
  } catch {}

  if (userName) {
    systemPrompt = `Nome do usuario: ${userName}. Use este nome de forma natural na conversa.\n\n${systemPrompt}`;
  }

  if (model === 'Gemini') {
    return generateChatResponseWithGemini(message, history, systemPrompt);
  }
  return generateChatResponseWithOpenAI(message, history, systemPrompt);
};
