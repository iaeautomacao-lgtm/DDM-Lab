import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Copy,
  Download,
  ExternalLink,
  History,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { MissionCompleteModal } from '../components/MissionCompleteModal';
import { useAuth } from '../lib/AuthContext';
import { completeMissionProgressAsync } from '../lib/missionProgress';
import {
  appendConversationMessage,
  createConversationThread,
  createUsageLog,
  deleteConversationThread,
  fetchConversationMessages,
  fetchConversationThreads,
  type ConversationMessageRecord,
  type ConversationRecord,
} from '../lib/supabaseData';
import { generatePrompt, generateImage, isImageRequest, MODEL_AVAILABILITY, type GeminiFileInput, type ImageGenerationResult } from '../services/aicomandos';
import { generateChatResponseWithOpenAI } from '../lib/openai';
import { fetchAgentSystemPrompt } from '../lib/agentConfig';
import { getDailyUsage, incrementTextTokens, TEXT_TOKEN_DAILY_LIMIT } from '../lib/usageLimit';
import { isRHQuery, searchKnowledge } from '../lib/rhKnowledge';
import type { AIModel, Tone } from '../types';

type AgentMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  imagePrompt?: string;
  imageData?: Array<{ base64: string; mimeType: string }>;
  imageError?: string;
  attachedFileNames?: string[];
  inputTokens?: number;
  outputTokens?: number;
};

type GeneratorLocationState =
  | {
      prompt?: string;
      objective?: string;
      missionTitle?: string;
      missionId?: string;
      missionBadge?: string;
      missionXp?: number;
      missionSavedMinutes?: number;
      sector?: string;
      introMessage?: string;
      startStep?: number;
      missionObjective?: string;
      missionStarterPrompt?: string;
    }
  | null
  | undefined;

type ActiveMission = {
  id: string;
  title: string;
  badge: string;
  xp: number;
  savedMinutes: number;
  objective?: string;
  starterPrompt?: string;
};

const STYLE_OPTIONS: Tone[] = ['Profissional', 'Criativo', 'Técnico', 'Amigável'];
const BUSINESS_DEPARTMENTS = ['RH', 'Jurídico', 'Financeiro', 'Backoffice', 'Planejamento', 'Comercial', 'Marketing', 'Gestão'] as const;

const PROMPT_SUGGESTIONS = [
  'Escrever feedback para colaborador',
  'Analisar relatório executivo',
  'Criar postagem para rede social',
  'Estruturar e-mail comercial',
];

const EMPTY_STATE_SUGGESTIONS = [
  'Analisar relatório executivo',
  'Gerar feedback para colaborador',
  'Revisar cláusulas de contrato',
  'Documentar código em Python',
];

const ACCORDITO_AVATAR = `/avatars/${encodeURIComponent('Acordito_celular.png')}`;

const selectAutoModel = (style: Tone, promptText: string, hasFiles: boolean): AIModel => {
  if (isImageRequest(promptText) && MODEL_AVAILABILITY.Gemini) return 'Gemini';
  if (hasFiles && MODEL_AVAILABILITY.Gemini) return 'Gemini';
  if ((style === 'Criativo' || style === 'Amigável') && MODEL_AVAILABILITY.Gemini) return 'Gemini';
  return 'OpenAI';
};

const buildConversationTitle = (promptText: string) => {
  const normalized = promptText
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/g, '');

  if (!normalized) return 'Nova conversa';

  const firstWords = normalized.split(' ').slice(0, 4).join(' ');
  const formatted = firstWords.charAt(0).toUpperCase() + firstWords.slice(1);

  return formatted.length > 42 ? `${formatted.slice(0, 42)}...` : formatted;
};

const mapConversationMessagesToAgent = (messages: ConversationMessageRecord[]): AgentMessage[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at || new Date().toISOString(),
  }));

const cleanAssistantOutput = (text: string) => {
  let cleaned = text.trim();

  // Se o modelo vazou um objeto JSON como resposta, extrai o finalPrompt
  if (cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.finalPrompt === 'string') {
        cleaned = parsed.finalPrompt.trim();
      }
    } catch {
      // não é JSON válido, continua normalmente
    }
  }

  return cleaned
    .replace(/```json\s*/gi, '')
    .replace(/^\s*```\s*$/gm, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatAssistantMessageForRequest = (result: Awaited<ReturnType<typeof generatePrompt>>) => {
  const text = cleanAssistantOutput(result.finalPrompt);
  const tip = result.extraSuggestion?.trim() ? cleanAssistantOutput(result.extraSuggestion) : '';
  return tip ? `${text}\n\n${tip}` : text;
};

export const Generator = () => {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingNewConversation, setIsStartingNewConversation] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const justCreatedConvRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [missionRewardToast, setMissionRewardToast] = useState('');
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  const [completedMission, setCompletedMission] = useState<ActiveMission | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [agentConfig, setAgentConfig] = useState({
    sector: profile?.department || 'RH',
    model: 'OpenAI' as AIModel,
    style: 'Profissional' as Tone,
  });
  const [attachedFiles, setAttachedFiles] = useState<GeminiFileInput[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sectorPrompt, setSectorPrompt] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0 });
  const [dailyTextTokens, setDailyTextTokens] = useState(0);

  useEffect(() => {
    if (!user) return;
    getDailyUsage(user.id)
      .then(u => setDailyTextTokens(u.textTokens))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (profile?.department) {
      setAgentConfig((current) => ({ ...current, sector: profile.department }));
    }
  }, [profile?.department]);

  useEffect(() => {
    const state = location.state as GeneratorLocationState;
    if (!state) return;

    const nextPrompt = state.prompt || state.objective || '';
    if (nextPrompt) {
      setInput(nextPrompt);
    }

    if (state.sector) {
      setAgentConfig((current) => ({ ...current, sector: state.sector }));
    }

    if (state.missionId && state.missionTitle) {
      setActiveMission({
        id: state.missionId,
        title: state.missionTitle,
        badge: state.missionBadge || 'Conquista DDM',
        xp: state.missionXp || 0,
        savedMinutes: state.missionSavedMinutes || 0,
        objective: state.missionObjective,
        starterPrompt: state.missionStarterPrompt,
      });
    } else {
      setActiveMission(null);
    }

    if (state.introMessage) {
      setMessages([
        {
          id: `mission-intro-${Date.now()}`,
          role: 'assistant',
          content: state.introMessage,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSelectedConversationId(null);
      setIsStartingNewConversation(true);
      setLoadError('');
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!user) return;

    fetchConversationThreads(user.id)
      .then((items) => {
        setConversations(items);
        if (!selectedConversationId && !isStartingNewConversation && items[0]?.id) {
          setSelectedConversationId(items[0].id);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar conversas:', error);
      });
  }, [user, selectedConversationId, isStartingNewConversation]);

  useEffect(() => {
    if (!selectedConversationId) {
      if (!isStartingNewConversation) {
        setMessages([]);
      }
      return;
    }

    if (justCreatedConvRef.current === selectedConversationId) {
      justCreatedConvRef.current = null;
      return;
    }

    fetchConversationMessages(selectedConversationId)
      .then((items) => {
        setMessages(mapConversationMessagesToAgent(items));
      })
      .catch((error) => {
        console.error('Erro ao carregar mensagens:', error);
      });
  }, [isStartingNewConversation, selectedConversationId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPrompt(true);
    fetchAgentSystemPrompt(agentConfig.sector)
      .then((prompt) => { if (!cancelled) setSectorPrompt(prompt); })
      .catch(() => { if (!cancelled) setSectorPrompt(null); })
      .finally(() => { if (!cancelled) setLoadingPrompt(false); });
    return () => { cancelled = true; };
  }, [agentConfig.sector]);

  useEffect(() => {
    if (!missionRewardToast) return;

    const timeoutId = window.setTimeout(() => setMissionRewardToast(''), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [missionRewardToast]);

  const currentConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const startNewConversation = () => {
    setIsStartingNewConversation(true);
    setSelectedConversationId(null);
    setMessages([]);
    setInput('');
    setLoadError('');
    setActiveMission(null);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationThread(conversationId);

      setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));

      if (selectedConversationId === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel excluir a conversa agora. Tente novamente em instantes.',
      );
    }
  };

  const persistConversationIfPossible = async (promptText: string) => {
    if (!user) return null;
    if (selectedConversationId) return selectedConversationId;

    const title = buildConversationTitle(promptText);
    const createdConversation = await createConversationThread(user.id, title, agentConfig.model);

    if (!createdConversation) return null;

    setConversations((current) => {
      const withoutDuplicate = current.filter((conversation) => conversation.id !== createdConversation.id);
      return [createdConversation, ...withoutDuplicate];
    });
    justCreatedConvRef.current = createdConversation.id;
    setIsStartingNewConversation(false);
    setSelectedConversationId(createdConversation.id);
    return createdConversation.id;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    for (const file of selected) {
      const isText =
        file.type.startsWith('text/') ||
        ['md', 'csv', 'json'].some((ext) => file.name.endsWith(`.${ext}`));

      if (isText) {
        const text = await file.text();
        setInput((prev) => `${prev}${prev ? '\n\n' : ''}[Arquivo: ${file.name}]\n${text}`);
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        setAttachedFiles((prev) => [...prev, { name: file.name, mimeType: file.type, data: base64 }]);

        if (file.type === 'application/pdf' && MODEL_AVAILABILITY.Gemini) {
          setAgentConfig((prev) => ({ ...prev, model: 'Gemini' }));
        }
      }
    }

    event.target.value = '';
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachedFiles.length === 0) || isSending) return;

    if (dailyTextTokens >= TEXT_TOKEN_DAILY_LIMIT) {
      setLoadError(`Limite diário de ${TEXT_TOKEN_DAILY_LIMIT.toLocaleString('pt-BR')} tokens atingido. Tente novamente amanhã.`);
      return;
    }

    const promptText = trimmedInput || 'Analise o arquivo enviado.';
    const autoModel = selectAutoModel(agentConfig.style, promptText, attachedFiles.length > 0);

    if (!MODEL_AVAILABILITY[autoModel] && !MODEL_AVAILABILITY.OpenAI) {
      setLoadError('Nenhum modelo disponível. Configure as chaves de API no ambiente.');
      return;
    }

    setIsSending(true);
    setLoadError('');

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput || attachedFiles.map((f) => f.name).join(', '),
      createdAt: new Date().toISOString(),
      attachedFileNames: attachedFiles.length > 0 ? attachedFiles.map((f) => f.name) : undefined,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    const filesToSend = attachedFiles;
    setAttachedFiles([]);

    try {
      const conversationId = await persistConversationIfPossible(promptText);

      if (!conversationId) {
        throw new Error('Nao foi possivel criar a conversa. Tente novamente em instantes.');
      }

      await appendConversationMessage(conversationId, 'user', promptText, autoModel, user?.id || null);

      let assistantContent: string;
      let imagePrompt: string | undefined;
      let imageData: ImageGenerationResult['images'] | undefined;
      let imageError: string | undefined;
      let msgInputTokens = 0;
      let msgOutputTokens = 0;

      if (isImageRequest(promptText) && MODEL_AVAILABILITY.OpenAI) {
        const imgResult = await generateImage(promptText);
        imagePrompt = imgResult.prompt;
        imageData = imgResult.images.length > 0 ? imgResult.images : undefined;
        imageError = imgResult.imageError;
        assistantContent = imgResult.images.length > 0
          ? 'Imagens geradas!'
          : imgResult.imageError
            ? `Não foi possível gerar a imagem: ${imgResult.imageError}`
            : 'Prompt de imagem gerado! Use o DDM Creator para gerar a imagem.';
      } else {
        const userName = profile?.preferredName || profile?.displayName?.split(' ')[0] || '';

        // RH Knowledge Base context injection
        let kbContext = '';
        if (isRHQuery(promptText)) {
          const kbResults = await searchKnowledge(promptText).catch(() => []);
          if (kbResults.length > 0) {
            const fmt = kbResults.map(a => {
              const updated = new Date(a.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              return `📄 ${a.title} [${a.category}]\n${a.content}\n_Atualizado em: ${updated}_`;
            }).join('\n\n---\n\n');
            kbContext = `\n\nBASE DE CONHECIMENTO RH — use SOMENTE estas informacoes para responder sobre o tema. Ao responder, cite a fonte no final (nome do artigo e data de atualizacao):\n\n${fmt}`;
          }
        }

        const context = [
          'Identidade do agente: Acordito, assistente oficial do DDM Lab',
          'Plataforma: DDM Lab, ambiente interno do Grupo DDM para prompts, modelos, automacoes e produtividade com IA',
          ...(userName ? [`Nome do usuario: ${userName} — use este nome de forma natural na resposta quando fizer sentido`] : []),
          `Setor: ${agentConfig.sector}`,
          `Modelo: ${autoModel}`,
          `Estilo: ${agentConfig.style}`,
          ...(activeMission
            ? [
                `MISSAO ATIVA - titulo: "${activeMission.title}", objetivo: ${activeMission.objective || activeMission.badge}${activeMission.starterPrompt ? ', instrucao: ' + activeMission.starterPrompt : ''}. Guie o usuario passo a passo para cumprir este objetivo. Ao concluir, confirme que a missao foi entregue.`,
              ]
            : []),
        ].join('. ') + kbContext;

        const response = await generatePrompt(promptText, agentConfig.sector, context, filesToSend, autoModel);
        assistantContent = formatAssistantMessageForRequest(response);
        if (response.inputTokens || response.outputTokens) {
          msgInputTokens = response.inputTokens ?? 0;
          msgOutputTokens = response.outputTokens ?? 0;
          const totalMsg = msgInputTokens + msgOutputTokens;
          setSessionTokens((prev) => ({
            input: prev.input + msgInputTokens,
            output: prev.output + msgOutputTokens,
          }));
          if (totalMsg > 0 && user) {
            setDailyTextTokens(prev => prev + totalMsg);
            incrementTextTokens(user.id, totalMsg).catch(() => {});
          }
        }
      }

      const assistantMessage: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        imagePrompt,
        imageData,
        imageError,
        createdAt: new Date().toISOString(),
        inputTokens: msgInputTokens || undefined,
        outputTokens: msgOutputTokens || undefined,
      };

      setMessages((current) => [...current, assistantMessage]);

      if (user) {
        try {
          await createUsageLog({
            userId: user.id,
            promptText: promptText,
            responseText: imagePrompt ? `[PROMPT IMAGEM] ${imagePrompt}` : assistantContent,
            iaUsed: agentConfig.model,
            sector: agentConfig.sector,
          });
        } catch (usageError) {
          console.error('Erro ao registrar uso:', usageError);
          setLoadError(
            usageError instanceof Error
              ? `Resposta gerada, mas nao foi possivel registrar o uso no painel: ${usageError.message}`
              : 'Resposta gerada, mas nao foi possivel registrar o uso no painel.',
          );
        }
      }

      if (user && activeMission) {
        const missionSnapshot = activeMission;
        const userId = user.id;

        const recentMessages = [
          ...messages,
          userMessage,
          { id: assistantMessage.id, role: 'assistant' as const, content: assistantContent, createdAt: assistantMessage.createdAt },
        ];

        // Require at least 2 complete exchanges before evaluating — prevents
        // false positives on the very first interaction.
        const exchangeCount = Math.floor(recentMessages.length / 2);
        if (exchangeCount >= 2) {
          const contextWindow = recentMessages.slice(-6);
          const conversationText = contextWindow
            .map((m) => `${m.role === 'user' ? 'Usuário' : 'Acordito'}: ${m.content}`)
            .join('\n');

          const evaluationPrompt =
            `Objetivo da missão: "${missionSnapshot.title}"\nDescrição: ${missionSnapshot.objective || missionSnapshot.badge}\n\n` +
            `Conversa recente:\n${conversationText}\n\n` +
            `O objetivo da missão foi alcançado com base na conversa acima? Responda apenas SIM ou NÃO.`;

          generateChatResponseWithOpenAI(
            evaluationPrompt,
            [],
            'Você é um avaliador de missões de treinamento de IA. Avalie se o objetivo foi cumprido com base no conteúdo da conversa. Responda APENAS com SIM ou NÃO, sem nenhuma outra palavra.',
          )
            .then((verdict) => {
              const normalised = verdict.trim().toUpperCase();
              if (normalised.startsWith('SIM') || normalised.startsWith('YES')) {
                completeMissionProgressAsync(userId, {
                  id: missionSnapshot.id,
                  xp: missionSnapshot.xp,
                  badge: missionSnapshot.badge,
                  savedMinutes: missionSnapshot.savedMinutes,
                }).catch(() => {});
                setCompletedMission(missionSnapshot);
                setShowMissionModal(true);
                setMissionRewardToast(`+${missionSnapshot.xp} XP ganhos • Medalha ${missionSnapshot.badge}`);
                setActiveMission(null);
              }
            })
            .catch(() => {});
        }
      }

      await appendConversationMessage(
        conversationId,
        'assistant',
        assistantContent,
        agentConfig.model,
        user?.id || null,
      );
    } catch (error) {
      console.error('Erro no agente:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      const isNetworkError = /failed to fetch|networkerror|load failed/i.test(rawMessage);
      setLoadError(
        isNetworkError
          ? 'Falha de conexão com o servidor (rede, firewall ou serviço indisponível). Verifique sua internet e tente novamente.'
          : rawMessage || 'Nao foi possivel gerar a resposta do agente agora. Tente novamente em instantes.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
    <MissionCompleteModal
      isOpen={showMissionModal}
      xp={completedMission?.xp ?? 0}
      badge={completedMission?.badge ?? ''}
      missionTitle={completedMission?.title ?? ''}
      onClose={() => setShowMissionModal(false)}
    />
    <div className="-m-4 flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground md:-m-8">
      <aside className="hidden w-72 shrink-0 border-r border-border p-4 md:flex md:flex-col">
        <button
          onClick={startNewConversation}
          className="mb-6 flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold transition hover:bg-orange-500"
        >
          <MessageSquare size={18} />
          Nova Conversa
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-secondary">
            <History size={14} />
            Recentes
          </h3>

          <div className="space-y-2">
            {conversations.length === 0 && (
              <div className="rounded-xl border border-border bg-surface-hover p-3 text-sm text-text-secondary">
                Nenhuma conversa salva ainda.
              </div>
            )}

            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded-xl border p-3 text-sm transition ${
                  selectedConversationId === conversation.id
                    ? 'border-orange-500/40 bg-orange-500/10 text-foreground'
                    : 'border-border bg-surface-hover text-text-secondary hover:border-white/20 hover:text-foreground'
                }`}
              >
                <button
                  onClick={() => {
                    setIsStartingNewConversation(false);
                    setActiveMission(null);
                    setSelectedConversationId(conversation.id);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="line-clamp-2 font-medium">{conversation.title}</div>
                </button>

                <button
                  type="button"
                  aria-label="Excluir conversa"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  className="shrink-0 rounded-lg p-2 text-text-secondary transition hover:bg-surface-hover hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section
            className="m-4 flex h-[calc(100%-2rem)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-orange-500/15 bg-background shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 40%, rgba(255,106,0,0.12), transparent 500px)',
            }}
          >
            <header className="shrink-0 flex flex-col justify-between gap-4 border-b border-orange-400/15 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 px-5 py-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-0.5 shadow-lg shadow-black/10"
                >
                  <motion.img
                    src={ACCORDITO_AVATAR}
                    alt="Acordito"
                    className="h-full w-full rounded-[0.95rem] object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/acordito.png';
                    }}
                    style={{ transformOrigin: 'center 52%' }}
                    animate={{ scaleY: [1, 1, 1, 0.08, 1, 1, 1] }}
                    transition={{ duration: 8.6, times: [0, 0.68, 0.72, 0.735, 0.76, 0.9, 1], repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70"
                      animate={{
                        scale: [1, 1.9, 1.9],
                        opacity: [0.7, 0, 0],
                        boxShadow: [
                          '0 0 0 0 rgba(34,197,94,0.7)',
                          '0 0 0 6px rgba(34,197,94,0)',
                          '0 0 0 0 rgba(34,197,94,0)',
                        ],
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-orange-600 bg-emerald-300" />
                  </span>
                </motion.div>

                <div>
                  <h2 className="text-base font-bold tracking-tight text-white md:text-lg">Acordito</h2>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-50/90">
                    <span className="flex items-center gap-2">
                      <motion.span
                        className="h-2 w-2 rounded-full bg-emerald-300"
                        animate={{
                          boxShadow: [
                            '0 0 0 0 rgba(34,197,94,0.7)',
                            '0 0 0 6px rgba(34,197,94,0)',
                            '0 0 0 0 rgba(34,197,94,0)',
                          ],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                      />
                      Assistente online
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-orange-50/80">
                    {currentConversation ? currentConversation.title : 'Pronto para começar!'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                {activeMission && (
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                      Missão ativa
                    </span>
                  </div>
                )}
                <a
                  href="https://ddmcreator.vercel.app/#home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 overflow-visible rounded-xl border border-white/35 bg-white/85 px-3 py-2 text-xs font-medium text-orange-950 transition hover:bg-white"
                >
                  DDM Creator
                  <ExternalLink size={12} className="shrink-0" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowConfig((v) => !v)}
                  className={cn(
                    'rounded-xl border border-white/35 bg-white/85 p-2 text-orange-950 transition hover:bg-white',
                    showConfig && 'ring-2 ring-white/40',
                  )}
                  title="Configurações do agente"
                >
                  <Settings size={16} />
                </button>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              {isSending && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 -left-1/3 w-1/3"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,106,0,0.08), transparent)',
                    }}
                    animate={{ x: ['-10%', '420%'] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}
              {missionRewardToast && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mb-5 max-w-xl rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200 shadow-[0_12px_35px_rgba(16,185,129,0.18)]"
                >
                  {missionRewardToast}
                </motion.div>
              )}

              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center py-12 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300 shadow-[0_0_30px_rgba(255,87,34,0.14)]">
                    <Bot size={28} />
                  </div>

                  <h3 className="text-3xl font-semibold tracking-tight text-foreground">
                    Como posso ajudar hoje?
                  </h3>

                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
                    Descreva sua demanda e eu monto um pedido mais claro e pronto para uso no seu contexto.
                  </p>

                  <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
                    {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="rounded-2xl border border-border bg-surface-hover/30 p-4 text-left text-sm text-text-secondary transition hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}
                    >
                      {message.role === 'assistant' && (
                        <img
                          src={ACCORDITO_AVATAR}
                          alt="Acordito"
                          className="mt-1 h-8 w-8 shrink-0 self-start rounded-full border border-zinc-700 object-cover object-top"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/acordito.png'; }}
                        />
                      )}
                      <div
                        className={cn(
                          'text-sm leading-relaxed shadow-sm',
                          message.role === 'user'
                            ? 'max-w-[72%] rounded-2xl rounded-br-none bg-orange-600 p-4 text-white'
                            : 'min-w-0 flex-1 rounded-2xl rounded-tl-none border border-border bg-surface p-4 text-foreground',
                        )}
                      >
                        {message.imagePrompt ? (
                          <div className="space-y-3">
                            {message.imageData && message.imageData.length > 0 ? (
                              <div className="space-y-2">
                                {message.imageData.map((img, idx) => (
                                  <div key={idx} className="overflow-hidden rounded-xl border border-border">
                                    <img
                                      src={`data:${img.mimeType};base64,${img.base64}`}
                                      alt={`Imagem gerada ${idx + 1}`}
                                      className="w-full object-cover"
                                    />
                                  </div>
                                ))}
                                <div className="flex flex-wrap gap-2">
                                  {message.imageData.map((img, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        const ext = img.mimeType.split('/')[1] || 'jpg';
                                        const a = document.createElement('a');
                                        a.href = `data:${img.mimeType};base64,${img.base64}`;
                                        a.download = `ddm-imagem-${message.id}-${idx + 1}.${ext}`;
                                        a.click();
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:text-orange-200 transition-colors"
                                    >
                                      <Download size={11} />
                                      {message.imageData!.length > 1 ? `Baixar ${idx + 1}` : 'Baixar imagem'}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => navigator.clipboard.writeText(message.imagePrompt!)}
                                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground transition-colors"
                                  >
                                    <Copy size={11} />
                                    Copiar prompt
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-orange-400">
                                    Prompt de imagem gerado
                                  </p>
                                  <p className="text-sm leading-relaxed text-text-secondary select-all">
                                    {message.imagePrompt}
                                  </p>
                                </div>
                                {message.imageError && (
                                  <p className="text-xs text-red-400/80 leading-relaxed">
                                    ⚠ Geração automática indisponível: {message.imageError}. Use o DDM Creator com o prompt acima.
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(message.imagePrompt!)}
                                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground transition-colors"
                                  >
                                    <Copy size={11} />
                                    Copiar prompt
                                  </button>
                                  <a
                                    href="https://ddmcreator.vercel.app/#home"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:text-orange-200 transition-colors"
                                  >
                                    Abrir DDM Creator
                                    <ExternalLink size={11} />
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                        <>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-sm text-foreground">{children}</p>,
                            h1: ({ children }) => <h1 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">{children}</h3>,
                            ul: ({ children }) => <ul className="my-2 space-y-1 pl-4">{children}</ul>,
                            ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>,
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed text-foreground flex gap-2">
                                <span className="text-primary mt-1.5 shrink-0 text-xs">•</span>
                                <span>{children}</span>
                              </li>
                            ),
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
                            code: ({ children, className }) =>
                              className ? (
                                <pre className="my-2 rounded-xl bg-surface-hover border border-border p-4 overflow-x-auto">
                                  <code className="text-xs font-mono text-primary">{children}</code>
                                </pre>
                              ) : (
                                <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs font-mono text-primary">{children}</code>
                              ),
                            blockquote: ({ children }) => (
                              <blockquote className="my-2 border-l-2 border-primary pl-3 text-text-secondary italic text-sm">{children}</blockquote>
                            ),
                            hr: () => <hr className="my-3 border-border" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {message.role === 'assistant' && (
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(message.content);
                                setCopiedMsgId(message.id);
                                setTimeout(() => setCopiedMsgId(null), 1800);
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground transition-colors"
                            >
                              <Copy size={11} />
                              {copiedMsgId === message.id ? 'Copiado!' : 'Copiar'}
                            </button>
                            {(message.inputTokens || message.outputTokens) && (
                              <span className="text-[10px] text-text-secondary/60">
                                ↑{message.inputTokens ?? 0} ↓{message.outputTokens ?? 0} tokens
                              </span>
                            )}
                          </div>
                        )}
                        </>
                        )}
                        {message.attachedFileNames?.map((name) => (
                          <div
                            key={name}
                            className="mt-2 flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-text-secondary"
                          >
                            <Paperclip size={10} />
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%]">
                        <div className="flex items-end gap-2">
                          <img
                            src={ACCORDITO_AVATAR}
                            alt="Acordito"
                            className="h-8 w-8 rounded-full border border-zinc-700 object-cover object-top"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/acordito.png';
                            }}
                          />

                          <div className="rounded-2xl rounded-bl-none border border-border bg-surface-hover p-4 shadow-lg">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.2s]" />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.1s]" />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-400" />
                            </div>
                          </div>
                        </div>

                        <span className="ml-10 mt-1 block text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                          Acordito esta digitando...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-gradient-to-t from-background via-background to-transparent p-4">
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="group relative rounded-2xl">
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 blur-[2px] transition-opacity duration-300 group-focus-within:opacity-100"
                  style={{
                    padding: '1px',
                    background:
                      'conic-gradient(from 0deg, rgba(255,106,0,0), rgba(255,106,0,0.1), rgba(255,106,0,0.95), rgba(255,106,0,0.1), rgba(255,106,0,0))',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative rounded-2xl border border-border bg-surface p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-300 group-focus-within:border-[#ff6a00] group-focus-within:shadow-[0_0_0_1px_#ff6a00,0_0_25px_rgba(255,106,0,0.25)]">
                {attachedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-text-secondary"
                      >
                        <Paperclip size={11} className="text-orange-400 shrink-0" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.name !== file.name))}
                          className="ml-1 text-text-secondary hover:text-rose-400 transition"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.txt,.md,.csv,.json"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-border bg-surface-hover p-3 text-text-secondary transition hover:border-orange-500/40 hover:text-orange-300"
                    title="Anexar imagem ou arquivo"
                  >
                    <Paperclip size={18} />
                  </button>
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Explique o que voce precisa..."
                    className="min-h-[52px] flex-1 resize-none bg-transparent p-2 text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || (!input.trim() && attachedFiles.length === 0)}
                    className="rounded-xl bg-orange-600 p-3 text-white transition hover:scale-[1.02] hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>

                {loadError && (
                  <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {loadError}
                  </div>
                )}
                </div>
                </div>

                {(sessionTokens.input > 0 || sessionTokens.output > 0) && (
                  <div className="flex items-center gap-3 px-1">
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-text-secondary/50">
                      Sessão
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-amber-400/60 transition-all"
                        style={{ width: `${Math.min(((sessionTokens.input + sessionTokens.output) / 128000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-text-secondary/50">
                      {(sessionTokens.input + sessionTokens.output).toLocaleString('pt-BR')} tokens
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 px-1">
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-text-secondary/50">
                    Hoje
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((dailyTextTokens / TEXT_TOKEN_DAILY_LIMIT) * 100, 100)}%`,
                        background: dailyTextTokens >= TEXT_TOKEN_DAILY_LIMIT
                          ? '#ef4444'
                          : dailyTextTokens >= TEXT_TOKEN_DAILY_LIMIT * 0.8
                          ? '#f59e0b'
                          : 'rgba(255,106,0,0.7)',
                      }}
                    />
                  </div>
                  <span className={`shrink-0 text-[10px] font-mono tabular-nums ${dailyTextTokens >= TEXT_TOKEN_DAILY_LIMIT ? 'text-red-400' : 'text-text-secondary/50'}`}>
                    {dailyTextTokens.toLocaleString('pt-BR')} / {TEXT_TOKEN_DAILY_LIMIT.toLocaleString('pt-BR')}
                  </span>
                </div>

              </div>
            </div>
          </section>

          <aside className={cn('w-80 shrink-0 border-l border-border p-6', showConfig ? 'flex flex-col' : 'hidden xl:flex xl:flex-col')}>
            <div className="mb-8">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-foreground">
                <Settings size={16} className="text-orange-400" />
                Configuracoes do Agente
              </h3>

              <Card className="space-y-4 border-border bg-surface p-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Setor</label>
                  {profile?.department && profile.department !== 'Geral' ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-hover/50 px-3 py-2 text-sm text-foreground">
                      <Lock size={12} className="shrink-0 text-text-secondary" />
                      <span>{agentConfig.sector}</span>
                    </div>
                  ) : (
                    <select
                      className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      value={agentConfig.sector}
                      onChange={(e) => setAgentConfig((current) => ({ ...current, sector: e.target.value }))}
                    >
                      {BUSINESS_DEPARTMENTS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Preview do system prompt ativo */}
                  <div
                    className="mt-1 rounded-xl border p-3 text-[11px] leading-relaxed transition-all"
                    style={
                      sectorPrompt
                        ? { border: '1px solid rgba(255,99,33,0.25)', background: 'rgba(255,99,33,0.06)' }
                        : { border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }
                    }
                  >
                    {loadingPrompt ? (
                      <span className="text-text-secondary">Verificando configuração...</span>
                    ) : sectorPrompt ? (
                      <>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          <span className="font-bold uppercase tracking-widest text-orange-400">Personalizado</span>
                        </div>
                        <p className="text-text-secondary line-clamp-3">{sectorPrompt.slice(0, 160)}{sectorPrompt.length > 160 ? '…' : ''}</p>
                      </>
                    ) : (
                      <>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                          <span className="font-bold uppercase tracking-widest text-text-secondary">Padrão</span>
                        </div>
                        <p className="text-text-secondary">Nenhum prompt configurado para este setor. O Acordito usará o comportamento padrão.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Estilo</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style}
                        onClick={() => setAgentConfig((current) => ({ ...current, style }))}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          agentConfig.style === style
                            ? 'border-orange-500/40 bg-orange-500/12 text-foreground shadow-[0_8px_24px_rgba(255,81,0,0.08)]'
                            : 'border-border bg-surface text-text-secondary hover:text-foreground'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

              </Card>
            </div>

            <div className="mb-8">
              <h3 className="mb-4 font-bold text-foreground">Sugestoes de Prompt</h3>
              <div className="space-y-3">
                {PROMPT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="w-full rounded-xl border border-border bg-surface p-3 text-left text-xs text-text-secondary transition hover:border-orange-500/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
    </>
  );
};
