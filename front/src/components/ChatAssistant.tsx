import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '../services/aicomandos';
import { useAuth } from '../lib/AuthContext';
import { createUsageLog } from '../lib/supabaseData';
import { Card } from './ui/Card';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const SECTOR_AGENT_NAMES: Record<string, string> = {
  RH: 'Acordito RH',
  Juridico: 'Acordito Jurídico',
  'Jurídico': 'Acordito Jurídico',
  Financeiro: 'Acordito Financeiro',
  Backoffice: 'Acordito Backoffice',
  Planejamento: 'Acordito Planejamento',
  Comercial: 'Acordito Comercial',
  Marketing: 'Acordito Marketing',
  Gestao: 'Acordito Gestão',
  'Gestão': 'Acordito Gestão',
};

const QUICK_SUGGESTIONS = [
  'Como usar o DDM Lab?',
  'Crie um prompt para mim',
  'O que você pode fazer?',
];

const ACCORDITO_AVATAR = `/avatars/${encodeURIComponent('Acordito_celular.png')}`;

/** Formata um Date para HH:MM em pt-BR */
const formatTime = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const ChatAssistant: React.FC = () => {
  const { user, profile } = useAuth();
  const userName = profile?.preferredName || profile?.displayName?.split(' ')[0] || '';
  const agentName = (profile?.department && SECTOR_AGENT_NAMES[profile.department]) || 'Acordito';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (chatPanelRef.current?.contains(target)) return;
      if (triggerButtonRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const submitMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = updatedHistory.map((msg) => ({
        role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.text,
      }));

      const response = await sendChatMessage(
        text,
        profile?.department || 'Geral',
        history,
        undefined,
        'Gemini',
        userName || undefined,
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (user) {
        await createUsageLog({
          userId: user.id,
          promptText: text,
          responseText: response,
          iaUsed: 'Gemini',
          sector: profile?.department || null,
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Não consegui responder agora. Tente novamente em instantes.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    await submitMessage(inputValue);
  };

  const handleQuickSuggestion = async (suggestion: string) => {
    await submitMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatPanelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex h-[580px] max-h-[calc(100vh-8rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col"
          >
            <Card className="flex flex-1 flex-col overflow-hidden border-primary/20 shadow-2xl shadow-primary/10">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 p-0.5 shadow-lg shadow-black/10">
                    <img
                      src={ACCORDITO_AVATAR}
                      alt="Acordito"
                      className="h-full w-full rounded-[0.9rem] object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/acordito.png';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-none">{agentName}</h3>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/85">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                      </span>
                      Assistente online
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-2 transition-colors hover:bg-white/10"
                  aria-label="Fechar chat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Área de mensagens */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface/50">
                {isEmpty ? (
                  /* Estado vazio — boas-vindas */
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
                    <div className="mb-4 flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border shadow-lg shadow-black/10">
                      <img
                        src={ACCORDITO_AVATAR}
                        alt="Acordito"
                        className="h-full w-full rounded-[0.9rem] object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/acordito.png';
                        }}
                      />
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {userName
                        ? `Olá, ${userName}! Sou o ${agentName}, seu assistente do DDM Lab${profile?.department && SECTOR_AGENT_NAMES[profile.department] ? ` especializado em ${profile.department}` : ''}. Como posso ajudar você hoje?`
                        : `Olá! Sou o ${agentName}, seu assistente do DDM Lab. Como posso ajudar você hoje?`}
                    </p>
                    {!profile?.department || !SECTOR_AGENT_NAMES[profile.department] ? (
                      <p className="mt-2 text-xs text-text-secondary/60">
                        💡 Configure seu setor no perfil para ativar o assistente especializado do seu time.
                      </p>
                    ) : null}
                    <div className="mt-5 flex w-full flex-col gap-2">
                      {QUICK_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleQuickSuggestion(suggestion)}
                          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-left text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 p-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className={`mb-3 flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                          >
                            {msg.sender === 'ai' && (
                              <img
                                src={ACCORDITO_AVATAR}
                                alt="Acordito"
                                className="mb-0.5 h-7 w-7 flex-shrink-0 rounded-full border border-border object-cover object-top"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/acordito.png';
                                }}
                              />
                            )}

                            <div
                              className={`max-w-[85%] border p-3 text-sm leading-relaxed shadow-lg backdrop-blur-md ${
                                msg.sender === 'user'
                                  ? 'rounded-2xl rounded-br-none border-primary/30 bg-primary/15 text-white'
                                  : 'rounded-2xl rounded-bl-none border-border bg-surface-hover text-foreground'
                              }`}
                            >
                              {msg.sender === 'ai' ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => (
                                      <p className="mb-3 text-sm leading-relaxed last:mb-0">{children}</p>
                                    ),
                                    h1: ({ children }) => (
                                      <h1 className="mb-2 mt-4 text-base font-bold text-foreground first:mt-0">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="mb-1.5 mt-3 text-sm font-bold text-foreground first:mt-0">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="mb-1 mt-2 text-sm font-semibold text-foreground/90 first:mt-0">{children}</h3>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="my-2 space-y-1 pl-4">{children}</ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="flex gap-2 text-sm leading-relaxed">
                                        <span className="mt-1.5 shrink-0 text-xs text-orange-400">•</span>
                                        <span>{children}</span>
                                      </li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-text-secondary">{children}</em>
                                    ),
                                    code: ({ children, className }) =>
                                      className ? (
                                        <pre className="my-2 overflow-x-auto rounded-xl bg-black/30 p-3">
                                          <code className="text-xs font-mono text-orange-300">{children}</code>
                                        </pre>
                                      ) : (
                                        <code className="rounded bg-surface-hover px-1 py-0.5 text-xs font-mono">
                                          {children}
                                        </code>
                                      ),
                                    blockquote: ({ children }) => (
                                      <blockquote className="my-2 border-l-2 border-orange-500 pl-3 text-sm italic text-text-secondary">
                                        {children}
                                      </blockquote>
                                    ),
                                    hr: () => <hr className="my-3 border-white/10" />,
                                  }}
                                >
                                  {msg.text}
                                </ReactMarkdown>
                              ) : (
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] text-text-secondary ${
                              msg.sender === 'user' ? 'mr-1' : 'ml-9'
                            }`}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-3 flex flex-col items-start gap-1"
                      >
                        <div className="flex items-end gap-2">
                          <img
                            src={ACCORDITO_AVATAR}
                            alt="Acordito"
                            className="mb-0.5 h-7 w-7 flex-shrink-0 rounded-full border border-border object-cover object-top"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/acordito.png';
                            }}
                          />
                          <div className="rounded-2xl rounded-bl-none border border-border bg-surface-hover p-3 shadow-lg backdrop-blur-md">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                            </div>
                          </div>
                        </div>
                        <span className="ml-9 text-[10px] text-text-secondary">Acordito está digitando...</span>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Área de input */}
              <div className="border-t border-border bg-surface p-4">
                {/* Chips de sugestão rápida — visíveis apenas enquanto há poucas mensagens */}
                {messages.length <= 2 && !isLoading && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleQuickSuggestion(suggestion)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Como posso te ajudar?"
                    className="max-h-32 min-h-[52px] w-full resize-none rounded-2xl border border-border bg-background p-4 pr-14 text-sm text-foreground placeholder:text-text-secondary focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Enviar mensagem"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante de abertura — posição e tamanho preservados */}
      <motion.button
        ref={triggerButtonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] p-1 shadow-lg transition-all duration-300 ${
          isOpen
            ? 'border border-border bg-surface-hover text-text-primary'
            : 'bg-primary text-white shadow-primary/30'
        }`}
        aria-label={isOpen ? 'Fechar chat' : 'Abrir chat com Acordito'}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <img
            src={ACCORDITO_AVATAR}
            alt="Acordito Mascot"
            className="h-full w-full rounded-[1rem] object-cover object-top"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/acordito.png';
            }}
          />
        )}
      </motion.button>
    </div>
  );
};
