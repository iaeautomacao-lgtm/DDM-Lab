import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Image,
  Loader2,
  LogOut,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  createInformativo,
  deactivateInformativo,
  getAllInformativos,
  getViewCountsForIds,
  getVisualizacoes,
  reactivateInformativo,
  uploadAnexo,
  type Anexo,
  type Informativo,
  type Visualizacao,
} from '../lib/rhData';
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  RH_CATEGORIES,
  type RHKnowledgeArticle,
} from '../lib/rhKnowledge';

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none';

const LABEL_CLASS = 'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40';

const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

type StatusFilter = 'all' | 'ativo' | 'arquivado';
type PanelTab = 'informativos' | 'conhecimento';

export function RHPanel() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PanelTab>('informativos');

  // ── Informativos state ──
  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loadingList, setLoadingList] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Knowledge Base state ──
  const [articles, setArticles] = useState<RHKnowledgeArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [showKBForm, setShowKBForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<RHKnowledgeArticle | null>(null);
  const [kbTitle, setKBTitle] = useState('');
  const [kbCategory, setKBCategory] = useState<string>(RH_CATEGORIES[0]);
  const [kbContent, setKBContent] = useState('');
  const [kbTags, setKBTags] = useState('');
  const [kbStatus, setKBStatus] = useState<'published' | 'draft'>('published');
  const [kbSaving, setKBSaving] = useState(false);
  const [kbError, setKBError] = useState<string | null>(null);
  const [kbSearch, setKBSearch] = useState('');
  const [kbCategoryFilter, setKBCategoryFilter] = useState<string>('all');

  const [viewersModal, setViewersModal] = useState<{
    informativo: Informativo;
    viewers: Visualizacao[];
    loading: boolean;
  } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadInformativos = async () => {
    setLoadingList(true);
    try {
      const items = await getAllInformativos();
      setInformativos(items);
      const counts = await getViewCountsForIds(items.map((i) => i.id));
      setViewCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  React.useEffect(() => {
    loadInformativos();
  }, []);

  const loadArticles = async () => {
    setLoadingArticles(true);
    try {
      const data = await getAllArticles();
      setArticles(data);
    } catch {}
    finally { setLoadingArticles(false); }
  };

  React.useEffect(() => {
    if (activeTab === 'conhecimento') loadArticles();
  }, [activeTab]);

  const openKBForm = (article?: RHKnowledgeArticle) => {
    if (article) {
      setEditingArticle(article);
      setKBTitle(article.title);
      setKBCategory(article.category);
      setKBContent(article.content);
      setKBTags(article.tags.join(', '));
      setKBStatus(article.status);
    } else {
      setEditingArticle(null);
      setKBTitle(''); setKBCategory(RH_CATEGORIES[0]); setKBContent('');
      setKBTags(''); setKBStatus('published');
    }
    setKBError(null);
    setShowKBForm(true);
  };

  const closeKBForm = () => {
    setShowKBForm(false);
    setEditingArticle(null);
    setKBError(null);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) {
      setKBError('Título e conteúdo são obrigatórios.');
      return;
    }
    setKBSaving(true);
    setKBError(null);
    const tags = kbTags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, {
          title: kbTitle.trim(), category: kbCategory,
          content: kbContent.trim(), tags, status: kbStatus,
        });
      } else {
        await createArticle(
          { title: kbTitle.trim(), category: kbCategory, content: kbContent.trim(), tags, status: kbStatus },
          user?.id || '',
        );
      }
      closeKBForm();
      await loadArticles();
    } catch (err) {
      setKBError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setKBSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Apagar este artigo permanentemente?')) return;
    await deleteArticle(id).catch(() => {});
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const ativos = useMemo(() => informativos.filter((i) => i.ativo).length, [informativos]);
  const arquivados = useMemo(() => informativos.filter((i) => !i.ativo).length, [informativos]);

  const displayed = useMemo(() => {
    return informativos.filter((item) => {
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ativo' ? item.ativo : !item.ativo);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.titulo.toLowerCase().includes(q) ||
        item.conteudo.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [informativos, search, statusFilter]);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(e.target.files || []);
    setArquivos((prev) => {
      const existentes = prev.map((f) => f.name);
      return [...prev, ...novos.filter((f) => !existentes.includes(f.name))];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) {
      setFormError('Preencha título e conteúdo.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const anexos: Anexo[] = [];
      for (const file of arquivos) {
        const anexo = await uploadAnexo(file);
        anexos.push(anexo);
      }
      await createInformativo(titulo.trim(), conteudo.trim(), profile?.displayName || 'RH', anexos);
      setTitulo('');
      setConteudo('');
      setArquivos([]);
      setShowForm(false);
      await loadInformativos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao publicar. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAtivo = async (item: Informativo) => {
    try {
      item.ativo ? await deactivateInformativo(item.id) : await reactivateInformativo(item.id);
      setInformativos((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)),
      );
    } catch {}
  };

  const handleOpenViewers = async (item: Informativo) => {
    setViewersModal({ informativo: item, viewers: [], loading: true });
    try {
      const viewers = await getVisualizacoes(item.id);
      setViewersModal((prev) => (prev ? { ...prev, viewers, loading: false } : null));
    } catch {
      setViewersModal((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const fileIcon = (file: File | Anexo) => {
    const tipo =
      file instanceof File
        ? file.type.startsWith('image/')
          ? 'image'
          : 'document'
        : file.tipo;
    return tipo === 'image' ? (
      <Image size={13} className="text-primary shrink-0" />
    ) : (
      <FileText size={13} className="text-blue-400 shrink-0" />
    );
  };

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:block">Voltar ao Hub</span>
            </button>
            <div className="h-5 w-px bg-border" />
            <img src="/logo-ddm.webp" alt="DDM" className="h-7 object-contain" />
            <div className="h-5 w-px bg-border" />
            <div>
              <p className="text-sm font-bold text-white leading-tight">Painel RH</p>
              <p className="text-xs text-text-secondary">Informativos internos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary hidden sm:block">{profile?.displayName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="border-b border-border bg-surface/40">
        <div className="max-w-4xl mx-auto px-6 flex gap-1 pt-2">
          {([
            { id: 'informativos', label: 'Informativos', icon: Bell },
            { id: 'conhecimento', label: 'Base de Conhecimento', icon: BookOpen },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'informativos' && (
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Título + botão novo */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Informativos</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Gerencie os comunicados para todos os colaboradores
            </p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(null); }}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancelar' : 'Novo Informativo'}
          </button>
        </div>

        {/* Summary pills */}
        {!loadingList && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-border bg-surface text-text-secondary hover:text-white'
              }`}
            >
              Todos
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                {informativos.length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('ativo')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                statusFilter === 'ativo'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-surface text-text-secondary hover:text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Publicados
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                {ativos}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('arquivado')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                statusFilter === 'arquivado'
                  ? 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400'
                  : 'border-border bg-surface text-text-secondary hover:text-white'
              }`}
            >
              <Archive size={12} />
              Arquivados
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                {arquivados}
              </span>
            </button>
          </div>
        )}

        {/* Busca */}
        {!loadingList && informativos.length > 0 && (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou conteúdo..."
              className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Formulário novo informativo */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border rounded-2xl p-6"
            >
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Bell size={15} className="text-primary" />
                Publicar novo informativo
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={LABEL_CLASS}>Título</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Atualização de ponto eletrônico"
                    className={INPUT_CLASS}
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Conteúdo</label>
                  <textarea
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Escreva o comunicado completo aqui..."
                    className={INPUT_CLASS}
                    rows={5}
                    maxLength={2000}
                  />
                  <p className="text-xs text-text-secondary text-right mt-1">
                    {conteudo.length}/2000
                  </p>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Anexos</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    onChange={handleAddFiles}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-white border border-dashed border-border hover:border-primary rounded-xl px-4 py-2.5 w-full transition-colors"
                  >
                    <Paperclip size={15} />
                    Adicionar imagens ou documentos
                  </button>

                  {arquivos.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {arquivos.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
                          {fileIcon(file)}
                          <span className="text-xs text-white flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-text-secondary shrink-0">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="text-text-secondary hover:text-red-400 transition-colors ml-1"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {creating ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista */}
        {loadingList ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={36} className="text-text-secondary opacity-30 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">
              {search || statusFilter !== 'all' ? 'Nenhum resultado para este filtro.' : 'Nenhum informativo publicado ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((item) => {
              const count = viewCounts[item.id] || 0;
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-[#161616] overflow-hidden transition-all hover:border-white/15"
                >
                  <div className="px-5 py-4 flex items-start gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      {/* Status badge + título */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {item.ativo ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-500/10 border border-zinc-500/20 rounded-md px-1.5 py-0.5">
                            <Archive size={9} />
                            Arquivado
                          </span>
                        )}
                        <p className="text-sm font-bold text-white">{item.titulo}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-xs text-text-secondary">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          · {item.autor_nome}
                        </p>
                        {item.anexos?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-text-secondary">
                            <Paperclip size={11} />
                            {item.anexos.length}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Visualizações */}
                      <button
                        onClick={() => handleOpenViewers(item)}
                        title="Ver quem visualizou"
                        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-2.5 py-1.5"
                      >
                        <Eye size={13} />
                        {count}
                      </button>

                      {/* Arquivar / Reativar */}
                      <button
                        onClick={() => handleToggleAtivo(item)}
                        title={item.ativo ? 'Arquivar informativo' : 'Reativar informativo'}
                        className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors ${
                          item.ativo
                            ? 'text-text-secondary hover:text-amber-400 bg-white/5 hover:bg-amber-400/10'
                            : 'text-text-secondary hover:text-emerald-400 bg-white/5 hover:bg-emerald-400/10'
                        }`}
                      >
                        {item.ativo ? (
                          <>
                            <Archive size={13} />
                            <span className="hidden sm:block text-[11px] font-medium">Arquivar</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw size={13} />
                            <span className="hidden sm:block text-[11px] font-medium">Reativar</span>
                          </>
                        )}
                      </button>

                      {/* Expandir */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-text-secondary hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg p-1.5"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-border space-y-3">
                          <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
                            {item.conteudo}
                          </p>

                          {item.anexos?.length > 0 && (
                            <div className="space-y-2">
                              {item.anexos.map((anexo, i) =>
                                anexo.tipo === 'image' ? (
                                  <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img
                                      src={anexo.url}
                                      alt={anexo.nome}
                                      className="w-full rounded-xl object-cover max-h-64 hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    key={i}
                                    href={anexo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-background hover:bg-surface-hover rounded-lg px-3 py-2 transition-colors group"
                                  >
                                    <FileText size={13} className="text-blue-400 shrink-0" />
                                    <span className="text-xs text-white truncate group-hover:text-primary transition-colors">
                                      {anexo.nome}
                                    </span>
                                  </a>
                                ),
                              )}
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
      </main>
      )} {/* end activeTab === 'informativos' */}

      {/* ── Base de Conhecimento tab ── */}
      {activeTab === 'conhecimento' && (
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                Base de Conhecimento
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                Artigos e políticas para o Acordito consultar
              </p>
            </div>
            <button
              onClick={() => openKBForm()}
              className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={15} />
              Nova Base
            </button>
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setKBCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${kbCategoryFilter === 'all' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:text-white'}`}
            >
              Todos
            </button>
            {RH_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setKBCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${kbCategoryFilter === cat ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={kbSearch}
              onChange={e => setKBSearch(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {kbSearch && (
              <button onClick={() => setKBSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Form */}
          <AnimatePresence>
            {showKBForm && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="bg-surface border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen size={14} className="text-primary" />
                    {editingArticle ? 'Editar artigo' : 'Novo artigo'}
                  </h2>
                  <button onClick={closeKBForm} className="text-text-secondary hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveArticle} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>Título</label>
                      <input
                        type="text"
                        value={kbTitle}
                        onChange={e => setKBTitle(e.target.value)}
                        placeholder="Ex: Como funciona o banco de horas"
                        className={INPUT_CLASS}
                        maxLength={160}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Categoria</label>
                      <select
                        value={kbCategory}
                        onChange={e => setKBCategory(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        {RH_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Conteúdo</label>
                    <textarea
                      value={kbContent}
                      onChange={e => setKBContent(e.target.value)}
                      placeholder="Descreva a política, procedimento ou informação completa..."
                      className={INPUT_CLASS}
                      rows={7}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>Tags (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={kbTags}
                        onChange={e => setKBTags(e.target.value)}
                        placeholder="Ex: horas extras, compensação, jornada"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Status</label>
                      <div className="flex gap-2 mt-1">
                        {(['published', 'draft'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setKBStatus(s)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                              kbStatus === s
                                ? s === 'published'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                  : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400'
                                : 'border-border bg-background text-text-secondary hover:text-white'
                            }`}
                          >
                            {s === 'published' ? 'Publicado' : 'Rascunho'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {kbError && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      {kbError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={kbSaving}
                      className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {kbSaving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      {kbSaving ? 'Salvando...' : editingArticle ? 'Salvar alterações' : 'Publicar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Article list */}
          {loadingArticles ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : (() => {
            const filtered = articles.filter(a => {
              const matchCat = kbCategoryFilter === 'all' || a.category === kbCategoryFilter;
              const q = kbSearch.toLowerCase();
              const matchSearch = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
              return matchCat && matchSearch;
            });

            if (filtered.length === 0) return (
              <div className="text-center py-16">
                <BookOpen size={36} className="text-text-secondary opacity-30 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  {articles.length === 0 ? 'Nenhum artigo publicado ainda.' : 'Nenhum resultado para este filtro.'}
                </p>
              </div>
            );

            return (
              <div className="space-y-3">
                {filtered.map(article => (
                  <div key={article.id} className="rounded-2xl border border-border bg-[#161616] px-5 py-4 hover:border-white/15 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {article.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                              <span className="h-1 w-1 rounded-full bg-emerald-400" />
                              Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-500/10 border border-zinc-500/20 rounded-md px-1.5 py-0.5">
                              Rascunho
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5">
                            {article.category}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white">{article.title}</p>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{article.content}</p>
                        {article.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Tag size={10} className="text-text-secondary shrink-0" />
                            {article.tags.map(tag => (
                              <span key={tag} className="text-[10px] text-text-secondary bg-white/5 rounded px-1.5 py-0.5">{tag}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-text-secondary mt-2">
                          Atualizado {new Date(article.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openKBForm(article)}
                          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </main>
      )} {/* end activeTab === 'conhecimento' */}

      {/* Modal visualizações */}
      <AnimatePresence>
        {viewersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setViewersModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <div>
                    <p className="text-sm font-bold text-white">Visualizações</p>
                    <p className="text-xs text-text-secondary truncate max-w-[220px]">
                      {viewersModal.informativo.titulo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewersModal(null)}
                  className="text-text-secondary hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {viewersModal.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={22} className="animate-spin text-primary" />
                  </div>
                ) : viewersModal.viewers.length === 0 ? (
                  <p className="text-center text-text-secondary text-sm py-8">
                    Nenhum usuário visualizou ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {viewersModal.viewers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between bg-background rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {(v.user_nome || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-white">{v.user_nome || 'Usuário'}</span>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {new Date(v.viewed_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-border">
                <p className="text-xs text-text-secondary text-center">
                  {viewersModal.viewers.length} visualização
                  {viewersModal.viewers.length !== 1 ? 'ões' : ''}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
