import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  addResposta,
  deleteResposta,
  getInformativos,
  getViewedIds,
  markAsViewed,
  updateInformativo,
  type Informativo,
  type Resposta,
} from '../lib/rhData';

type ModoEdicao = 'responder' | 'corrigir' | null;

export const RHBalloon: React.FC = () => {
  const { user, profile, isRH } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modoAtivo, setModoAtivo] = useState<Record<string, ModoEdicao>>({});
  const [respostaTexto, setRespostaTexto] = useState<Record<string, string>>({});
  const [correcao, setCorrecao] = useState<Record<string, { titulo: string; conteudo: string }>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = informativos.filter((i) => !viewedIds.includes(i.id)).length;

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [items, viewed] = await Promise.all([
        getInformativos(),
        getViewedIds(user.id),
      ]);
      setInformativos(items);
      setViewedIds(viewed);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setModoAtivo((prev) => ({ ...prev, [id]: null }));
      return;
    }
    setExpandedId(id);
    if (!viewedIds.includes(id) && user) {
      setViewedIds((prev) => [...prev, id]);
      await markAsViewed(id, user.id, profile?.displayName || null).catch(() => {});
    }
  };

  const toggleModo = (id: string, modo: ModoEdicao, item?: Informativo) => {
    setModoAtivo((prev) => {
      const atual = prev[id];
      if (atual === modo) return { ...prev, [id]: null };
      if (modo === 'corrigir' && item) {
        setCorrecao((c) => ({ ...c, [id]: { titulo: item.titulo, conteudo: item.conteudo } }));
      }
      return { ...prev, [id]: modo };
    });
  };

  const handleResponder = async (item: Informativo) => {
    const texto = respostaTexto[item.id]?.trim();
    if (!texto || !profile) return;
    setSalvando((s) => ({ ...s, [item.id]: true }));
    try {
      const nova = await addResposta(item.id, texto, profile.displayName);
      setInformativos((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, respostas: [...i.respostas, nova] } : i,
        ),
      );
      setRespostaTexto((r) => ({ ...r, [item.id]: '' }));
      setModoAtivo((m) => ({ ...m, [item.id]: null }));
    } catch {
    } finally {
      setSalvando((s) => ({ ...s, [item.id]: false }));
    }
  };

  const handleCorrigir = async (item: Informativo) => {
    const dados = correcao[item.id];
    if (!dados || (!dados.titulo.trim() && !dados.conteudo.trim())) return;
    setSalvando((s) => ({ ...s, [item.id]: true }));
    try {
      await updateInformativo(item.id, {
        titulo: dados.titulo.trim() || item.titulo,
        conteudo: dados.conteudo.trim() || item.conteudo,
      });
      setInformativos((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, titulo: dados.titulo.trim() || i.titulo, conteudo: dados.conteudo.trim() || i.conteudo }
            : i,
        ),
      );
      setModoAtivo((m) => ({ ...m, [item.id]: null }));
    } catch {
    } finally {
      setSalvando((s) => ({ ...s, [item.id]: false }));
    }
  };

  const handleDeleteResposta = async (item: Informativo, resposta: Resposta) => {
    try {
      await deleteResposta(item.id, resposta.id, item.respostas);
      setInformativos((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, respostas: i.respostas.filter((r) => r.id !== resposta.id) }
            : i,
        ),
      );
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-4 w-80 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(18, 18, 26, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255, 87, 34, 0.15)', border: '1px solid rgba(255, 87, 34, 0.25)' }}>
                  <BellRing size={14} style={{ color: '#ff6d3d' }} />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight" style={{ color: '#ffffff' }}>
                    Informativos RH
                  </p>
                  {unreadCount > 0 && (
                    <p className="text-[10px] font-medium" style={{ color: '#ff6d3d' }}>
                      {unreadCount} não lido{unreadCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              {/* Único botão de fechar */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/8"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Lista */}
            <div className="max-h-[32rem] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Carregando...
                </div>
              ) : informativos.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Bell size={28} className="mx-auto" style={{ color: 'rgba(255,255,255,0.12)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum informativo no momento.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {informativos.map((item) => {
                    const isRead = viewedIds.includes(item.id);
                    const isExpanded = expandedId === item.id;
                    const modo = modoAtivo[item.id] || null;
                    const isSaving = salvando[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        className="transition-colors"
                        style={{ background: isExpanded ? 'rgba(255,255,255,0.025)' : undefined }}
                      >
                        {/* Cabeçalho do item */}
                        <button
                          onClick={() => handleExpand(item.id)}
                          className="w-full text-left px-4 py-3 transition-colors hover:bg-white/3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Indicador lido/não lido */}
                            <div className="mt-2 shrink-0">
                              {isRead ? (
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: '#ff6d3d', boxShadow: '0 0 5px rgba(255,109,61,0.7)' }} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Título — hierarquia clara */}
                              <p className="text-sm font-semibold truncate leading-snug"
                                style={{ color: isRead ? 'rgba(255,255,255,0.35)' : '#ffffff' }}>
                                {item.titulo}
                              </p>
                              {/* Data — cinza suave, menor */}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                                  {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </p>
                                {/* Autor inline com a data */}
                                <span style={{ color: 'rgba(156,163,175,0.4)', fontSize: 10 }}>·</span>
                                <p className="text-[11px]" style={{ color: 'rgba(156,163,175,0.5)' }}>
                                  {item.autor_nome}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              {isRead && <Check size={11} style={{ color: 'rgba(255,109,61,0.5)' }} />}
                              {item.respostas?.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                  <MessageSquare size={10} />
                                  {item.respostas.length}
                                </span>
                              )}
                              {isExpanded
                                ? <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                            </div>
                          </div>
                        </button>

                        {/* Conteúdo expandido */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-4">

                                {/* Modo corrigir */}
                                {modo === 'corrigir' ? (
                                  <div className="space-y-2">
                                    <input
                                      value={correcao[item.id]?.titulo || ''}
                                      onChange={(e) =>
                                        setCorrecao((c) => ({ ...c, [item.id]: { ...c[item.id], titulo: e.target.value } }))
                                      }
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-white/20"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                      placeholder="Título"
                                      maxLength={120}
                                    />
                                    <textarea
                                      value={correcao[item.id]?.conteudo || ''}
                                      onChange={(e) =>
                                        setCorrecao((c) => ({ ...c, [item.id]: { ...c[item.id], conteudo: e.target.value } }))
                                      }
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 resize-none"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                      rows={4}
                                      placeholder="Conteúdo"
                                      maxLength={2000}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => toggleModo(item.id, 'corrigir')}
                                        className="flex-1 rounded-lg py-1.5 text-xs transition-colors"
                                        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleCorrigir(item)}
                                        disabled={isSaving}
                                        className="flex-1 rounded-lg py-1.5 text-xs text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                        style={{ background: 'rgba(255, 87, 34, 0.85)' }}
                                      >
                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Conteúdo normal com respiro abaixo */
                                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
                                    {item.conteudo}
                                  </p>
                                )}

                                {/* Anexos — sem nome de arquivo, imagem arredondada */}
                                {modo !== 'corrigir' && item.anexos?.length > 0 && (
                                  <div className="space-y-2">
                                    {item.anexos.map((anexo, i) =>
                                      anexo.tipo === 'image' ? (
                                        <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer" className="block">
                                          <img
                                            src={anexo.url}
                                            alt={anexo.nome}
                                            className="w-full object-cover max-h-52 hover:opacity-80 transition-opacity cursor-pointer"
                                            style={{ borderRadius: 10 }}
                                          />
                                          {/* Nome removido — fica só no metadado */}
                                        </a>
                                      ) : (
                                        <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors group"
                                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                        >
                                          <FileText size={12} className="text-blue-400 shrink-0" />
                                          <span className="text-xs truncate group-hover:text-white transition-colors"
                                            style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            {anexo.nome}
                                          </span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                )}

                                {/* Observações RH — border-left sutil */}
                                {item.respostas?.length > 0 && modo !== 'corrigir' && (
                                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                                      style={{ color: 'rgba(255,255,255,0.2)' }}>
                                      <MessageSquare size={9} /> Observações RH
                                    </p>
                                    {item.respostas.map((r) => (
                                      <div key={r.id} className="pl-3 group relative"
                                        style={{ borderLeft: '2px solid rgba(255, 87, 34, 0.35)' }}>
                                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                          {r.conteudo}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                                            {r.autor_nome} · {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                          </p>
                                          {isRH && (
                                            <button
                                              onClick={() => handleDeleteResposta(item, r)}
                                              className="text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                              style={{ color: 'rgba(248,113,113,0.7)' }}
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Formulário de resposta */}
                                {isRH && modo === 'responder' && (
                                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <textarea
                                      value={respostaTexto[item.id] || ''}
                                      onChange={(e) =>
                                        setRespostaTexto((r) => ({ ...r, [item.id]: e.target.value }))
                                      }
                                      placeholder="Adicione uma observação..."
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 resize-none"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                      rows={3}
                                      maxLength={500}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => toggleModo(item.id, 'responder')}
                                        className="flex-1 rounded-lg py-1.5 text-xs transition-colors"
                                        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleResponder(item)}
                                        disabled={isSaving || !respostaTexto[item.id]?.trim()}
                                        className="flex-1 rounded-lg py-1.5 text-xs text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                        style={{ background: 'rgba(255, 87, 34, 0.85)' }}
                                      >
                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                        Publicar
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Ações RH — compactas, alinhadas à direita */}
                                {isRH && modo === null && (
                                  <div className="flex gap-1.5 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                    <button
                                      onClick={() => toggleModo(item.id, 'responder')}
                                      className="flex items-center gap-1 text-[11px] rounded-lg px-2.5 py-1 transition-all"
                                      style={{
                                        color: 'rgba(255,255,255,0.35)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                      }}
                                    >
                                      <MessageSquare size={11} />
                                      Responder
                                    </button>
                                    <button
                                      onClick={() => toggleModo(item.id, 'corrigir', item)}
                                      className="flex items-center gap-1 text-[11px] rounded-lg px-2.5 py-1 transition-all"
                                      style={{
                                        color: 'rgba(255,255,255,0.35)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                      }}
                                    >
                                      <Pencil size={11} />
                                      Corrigir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && informativos.length > 0 && (
              <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[11px] text-center font-medium" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  {unreadCount > 0
                    ? `${unreadCount} não lido${unreadCount > 1 ? 's' : ''}`
                    : '✓ Tudo em dia'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante — sempre mostra o sino (X fica só no header do painel) */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex items-center justify-center"
        style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'rgba(255, 87, 34, 0.88)',
          backdropFilter: 'blur(10px)',
          boxShadow: isOpen
            ? '0 4px 20px rgba(255, 87, 34, 0.5)'
            : '0 4px 20px rgba(255, 87, 34, 0.3)',
          border: '1px solid rgba(255, 109, 61, 0.35)',
        }}
        aria-label="Informativos RH"
      >
        <Bell size={19} className="text-white" />
        {unreadCount > 0 && !isOpen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] text-white font-bold flex items-center justify-center"
            style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>
    </div>
  );
};
