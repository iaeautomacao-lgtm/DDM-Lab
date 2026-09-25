import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { fetchAdminStats } from '../lib/supabaseData';
import {
  fetchAllAgentConfigs,
  upsertAgentConfig,
  resetAgentConfig,
  type AgentConfig,
} from '../lib/agentConfig';
import {
  fetchAllSugestoes,
  updateSugestaoStatus,
  type Sugestao,
  type SugestaoStatus,
} from '../lib/sugestoesData';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  formatFileSize,
  type KBDoc,
} from '../lib/knowledgeBase';
import { useAuth } from '../lib/AuthContext';
import { fetchUsers, updateUserRole, ROLE_OPTIONS, type ManagedUser, type UserRole } from '../lib/userAdmin';
import {
  Users,
  MessageSquare,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  ShieldAlert,
  Bot,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
  Eye,
  Archive,
  ChevronRight,
  BookOpen,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie,
} from 'recharts';

const DEPARTMENTS = ['RH', 'Jurídico', 'Financeiro', 'Backoffice', 'Planejamento', 'Comercial', 'Marketing', 'Gestão'];

const DEFAULT_SYSTEM_PROMPT = 'Voce e o Acordito, assistente oficial do DDM Lab, a plataforma interna de inteligencia artificial do Grupo DDM. O DDM Lab centraliza modelos, prompts, automacoes, orientacoes e apoio operacional para os colaboradores. Sua funcao e agir como um parceiro de produtividade: explicar a plataforma quando necessario, responder com clareza, ajudar o usuario a estruturar melhor o que precisa e transformar pedidos vagos em demandas objetivas. Use tom executivo, humano, cordial e consultivo. Prefira respostas fluidas, claras e aplicaveis ao contexto corporativo. Evite jargao tecnico desnecessario e listas numeradas excessivas.';

type Tab = 'metricas' | 'agente' | 'sugestoes' | 'documentos' | 'usuarios';

// ── Aba de métricas ──────────────────────────────────────────────────────────
const MetricsTab: React.FC = () => {
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalPrompts: 0,
    activeUsers: 0,
    avgMaturityScore: 0,
    sectorUsage: [],
    iaUsage: [],
    recentInteractions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ['#FF6321', '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getSectorColor = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n.includes('marketing')) return '#FF6321';
    if (n.includes('vendas') || n.includes('comercial')) return '#F59E0B';
    if (n.includes('rh')) return '#EC4899';
    if (n.includes('jur')) return '#8B5CF6';
    if (n.includes('ti')) return '#3B82F6';
    if (n.includes('finance')) return '#10B981';
    return '#71717A';
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Carregando métricas...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-4 p-6">
          <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit"><Users size={24} /></div>
          <div>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Usuários cadastrados</div>
          </div>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500 w-fit"><MessageSquare size={24} /></div>
          <div>
            <div className="text-3xl font-bold">{stats.totalPrompts}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Total de Prompts</div>
          </div>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500 w-fit"><TrendingUp size={24} /></div>
          <div>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Usuários com interações</div>
          </div>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 w-fit"><Target size={24} /></div>
          <div>
            <div className="text-3xl font-bold">{stats.avgMaturityScore.toFixed(1)}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Maturidade média em IA</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="space-y-6 p-6">
          <h3 className="flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-primary" />Uso por Setor</h3>
          <div className="h-[300px] w-full">
            {stats.sectorUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sectorUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.sectorUsage.map((entry: any, i: number) => (
                      <Cell key={i} fill={getSectorColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">Sem dados de interações</div>
            )}
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <h3 className="flex items-center gap-2 font-bold"><PieChartIcon size={18} className="text-primary" />IAs mais Utilizadas</h3>
          <div className="flex h-[300px] w-full items-center justify-center">
            {stats.iaUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.iaUsage} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {stats.iaUsage.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">Sem dados de interações</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── Card de setor ────────────────────────────────────────────────────────────
const DeptPromptCard: React.FC<{
  dept: string;
  savedPrompt: string | null;
  updatedBy?: string;
  updatedAt?: string;
  adminName: string;
  onSave: (dept: string, prompt: string) => Promise<void>;
  onReset: (dept: string) => Promise<void>;
}> = ({ dept, savedPrompt, updatedBy, updatedAt, adminName, onSave, onReset }) => {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(savedPrompt || DEFAULT_SYSTEM_PROMPT);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isCustom = !!savedPrompt;
  const isDirty = value !== (savedPrompt || DEFAULT_SYSTEM_PROMPT);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(dept, value); } finally { setSaving(false); }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset(dept);
      setValue(DEFAULT_SYSTEM_PROMPT);
    } finally { setResetting(false); }
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isCustom ? 'bg-primary' : 'bg-white/15'}`} />
          <span className="font-semibold text-sm">{dept}</span>
          {isCustom && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
              Personalizado
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isCustom && updatedAt && (
            <span className="text-[11px] text-text-secondary hidden sm:block">
              Editado por {updatedBy} · {new Date(updatedAt).toLocaleDateString('pt-BR')}
            </span>
          )}
          {expanded ? <ChevronUp size={15} className="text-text-secondary" /> : <ChevronDown size={15} className="text-text-secondary" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-border">
          <p className="text-xs text-text-secondary pt-3">
            System prompt enviado ao modelo sempre que um colaborador do setor <strong>{dept}</strong> usa o Acordito.
            {!isCustom && ' Usando o prompt padrão.'}
          </p>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all resize-none font-mono leading-relaxed placeholder:text-text-secondary"
            placeholder="Digite o system prompt para este setor..."
          />
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleReset}
              disabled={resetting || !isCustom}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white border border-border hover:border-white/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-30"
            >
              <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
              Restaurar padrão
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-1.5 text-xs text-white bg-primary hover:bg-primary/90 rounded-lg px-4 py-1.5 font-semibold transition-all disabled:opacity-40"
            >
              <Save size={13} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Aba de configuração do agente ────────────────────────────────────────────
const AgentTab: React.FC = () => {
  const { profile } = useAuth();
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchAllAgentConfigs()
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getConfig = (dept: string) => configs.find((c) => c.department === dept);

  const handleSave = async (dept: string, prompt: string) => {
    await upsertAgentConfig(dept, prompt, profile?.displayName || 'Admin');
    setConfigs((prev) => {
      const exists = prev.find((c) => c.department === dept);
      if (exists) {
        return prev.map((c) =>
          c.department === dept
            ? { ...c, system_prompt: prompt, updated_by: profile?.displayName || 'Admin', updated_at: new Date().toISOString() }
            : c,
        );
      }
      return [...prev, { department: dept, system_prompt: prompt, updated_by: profile?.displayName || 'Admin', updated_at: new Date().toISOString() }];
    });
    showToast(`Prompt do setor "${dept}" salvo com sucesso.`);
  };

  const handleReset = async (dept: string) => {
    await resetAgentConfig(dept);
    setConfigs((prev) => prev.filter((c) => c.department !== dept));
    showToast(`Setor "${dept}" restaurado para o prompt padrão.`);
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/15">
        <Bot className="text-primary shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Configuração de System Prompts por Setor</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Cada setor pode ter um comportamento específico do Acordito. O prompt salvo aqui substitui o padrão sempre que um colaborador daquele setor usar a plataforma.
            Setores sem configuração personalizada usam o prompt padrão automaticamente.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {DEPARTMENTS.map((dept) => {
          const cfg = getConfig(dept);
          return (
            <DeptPromptCard
              key={dept}
              dept={dept}
              savedPrompt={cfg?.system_prompt || null}
              updatedBy={cfg?.updated_by}
              updatedAt={cfg?.updated_at}
              adminName={profile?.displayName || 'Admin'}
              onSave={handleSave}
              onReset={handleReset}
            />
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-xl px-5 py-3 text-sm font-medium shadow-xl z-50 text-white">
          {toast}
        </div>
      )}
    </div>
  );
};

// ── Categoria badge ───────────────────────────────────────────────────────────
const CATEGORIA_MAP: Record<string, { label: string; className: string }> = {
  funcionalidade: { label: 'Funcionalidade', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  bug:            { label: 'Bug',            className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  navegacao:      { label: 'Navegação',      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ia_prompts:     { label: 'IA/Prompts',     className: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  outro:          { label: 'Outro',          className: 'bg-white/5 text-text-secondary border-white/10' },
};

const CategoriaBadge: React.FC<{ categoria: string | null }> = ({ categoria }) => {
  if (!categoria) return null;
  const cfg = CATEGORIA_MAP[categoria] ?? CATEGORIA_MAP.outro;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: SugestaoStatus }> = ({ status }) => {
  const map: Record<SugestaoStatus, { label: string; className: string }> = {
    pendente: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    lida:     { label: 'Lida',     className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    arquivada:{ label: 'Arquivada',className: 'bg-white/5 text-text-secondary border-white/10' },
  };
  const { label, className } = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>
      {label}
    </span>
  );
};

// ── Aba de sugestões ─────────────────────────────────────────────────────────
const SugestoesTab: React.FC = () => {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SugestaoStatus | 'todas'>('todas');

  useEffect(() => {
    fetchAllSugestoes()
      .then(setSugestoes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, newStatus: SugestaoStatus) => {
    setUpdatingId(id);
    try {
      await updateSugestaoStatus(id, newStatus);
      setSugestoes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = sugestoes.filter((s) => s.status === 'pendente').length;

  const visible = filterStatus === 'todas'
    ? sugestoes
    : sugestoes.filter((s) => s.status === filterStatus);

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Carregando sugestões...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
        <Lightbulb className="text-amber-400 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Sugestões dos colaboradores</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {pending > 0
              ? `Você tem ${pending} sugestão${pending > 1 ? 'ões' : ''} pendente${pending > 1 ? 's' : ''} aguardando leitura.`
              : 'Todas as sugestões foram lidas.'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit border border-border flex-wrap">
        {(['todas', 'pendente', 'lida', 'arquivada'] as const).map((f) => {
          const count = f === 'todas' ? sugestoes.length : sugestoes.filter((s) => s.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                filterStatus === f
                  ? 'bg-primary text-white shadow'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                filterStatus === f ? 'bg-white/20' : 'bg-white/5'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          <Lightbulb size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma sugestão encontrada.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => {
            const isExpanded = expandedId === s.id;
            const isUpdating = updatingId === s.id;
            const formattedDate = new Date(s.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card key={s.id} className={`overflow-hidden p-0 ${s.status === 'arquivada' ? 'opacity-60' : ''}`}>
                {/* Row header — click to expand */}
                <button
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : s.id);
                    // Mark as read when expanding if still pending
                    if (!isExpanded && s.status === 'pendente') {
                      handleStatusChange(s.id, 'lida');
                    }
                  }}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">
                        {s.user_name || s.user_email?.split('@')[0] || 'Colaborador'}
                      </span>
                      {s.user_email && (
                        <span className="text-[11px] text-text-secondary truncate hidden sm:inline">
                          {s.user_email}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs text-text-secondary line-clamp-1 ${isExpanded ? 'hidden' : ''}`}>
                      {s.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <CategoriaBadge categoria={s.categoria} />
                    <StatusBadge status={s.status} />
                    <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                      <Clock size={11} />
                      <span className="hidden sm:inline">{formattedDate}</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border space-y-4">
                    <div className="pt-4">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wider font-semibold">Conteúdo</p>
                      <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{s.content}</p>
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Enviado em {formattedDate}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.status !== 'lida' && (
                        <button
                          onClick={() => handleStatusChange(s.id, 'lida')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/40 bg-blue-500/5 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
                        >
                          <Eye size={12} />
                          Marcar como lida
                        </button>
                      )}
                      {s.status !== 'arquivada' && (
                        <button
                          onClick={() => handleStatusChange(s.id, 'arquivada')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white border border-border hover:border-white/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
                        >
                          <Archive size={12} />
                          Arquivar
                        </button>
                      )}
                      {s.status === 'arquivada' && (
                        <button
                          onClick={() => handleStatusChange(s.id, 'pendente')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white border border-border hover:border-white/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
                        >
                          <RotateCcw size={12} />
                          Reabrir
                        </button>
                      )}
                      {isUpdating && (
                        <span className="text-[11px] text-text-secondary">Atualizando...</span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Aba de documentos / Base de Conhecimento ─────────────────────────────────
const DocumentosTab: React.FC = () => {
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setUploadStatus(null);
    try {
      const doc = await uploadDocument(file);
      setDocs((prev) => [doc, ...prev]);
      setUploadStatus({ type: 'success', msg: `"${file.name}" enviado. O Acordito já pode consultar este documento.` });
    } catch (err) {
      setUploadStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao enviar documento.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: KBDoc) => {
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error('Erro ao remover documento:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Carregando documentos...</div>;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <BookOpen className="text-blue-400 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Base de Conhecimento do Acordito</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Documentos enviados aqui são indexados automaticamente. O Acordito consulta esta base em toda conversa
            — tanto no chat quanto no Criar Pedido — e usa o conteúdo para fundamentar as respostas nos processos reais do Grupo DDM.
          </p>
          <p className="text-xs text-text-secondary/70 mt-1">
            Formatos aceitos: PDF, TXT, DOCX, MD · Máx. 512 MB por arquivo (limite OpenAI)
          </p>
        </div>
      </div>

      {/* Upload */}
      <div>
        <label className={`flex items-center gap-3 w-fit cursor-pointer rounded-xl border px-5 py-3 text-sm font-semibold transition-all ${
          uploading
            ? 'border-border text-text-secondary opacity-60 cursor-not-allowed'
            : 'border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/70'
        }`}>
          {uploading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Enviando para OpenAI...
            </>
          ) : (
            <>
              <Upload size={16} />
              Enviar documento
            </>
          )}
          <input
            type="file"
            accept=".pdf,.txt,.docx,.md"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>

        {uploadStatus && (
          <div className={`mt-3 flex items-start gap-2 text-xs rounded-xl p-3 border ${
            uploadStatus.type === 'success'
              ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/8 border-red-500/20 text-red-400'
          }`}>
            {uploadStatus.type === 'success'
              ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
            {uploadStatus.msg}
          </div>
        )}
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <Card className="p-10 text-center text-text-secondary space-y-3">
          <FileText size={32} className="mx-auto opacity-25" />
          <p className="text-sm">Nenhum documento na base de conhecimento.</p>
          <p className="text-xs opacity-60">Envie o PDF de processos do Grupo DDM para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-blue-500/10 p-2 shrink-0">
                  <FileText size={16} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-[11px] text-text-secondary">
                    {formatFileSize(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                title="Remover documento"
                className="shrink-0 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-40 p-1 rounded-lg hover:bg-red-500/5"
              >
                {deletingId === doc.id
                  ? <span className="h-4 w-4 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin block" />
                  : <Trash2 size={15} />}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Aba de usuários (gestão de níveis de acesso) ─────────────────────────────
const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: 'bg-primary/10 text-primary',
  diretor: 'bg-purple-500/10 text-purple-400',
  gestor: 'bg-blue-500/10 text-blue-400',
  rh: 'bg-pink-500/10 text-pink-400',
  user: 'bg-surface-hover text-text-secondary',
};

const UsersTab: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (user: ManagedUser, role: UserRole) => {
    setSavingId(user.id);
    setError('');
    try {
      await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o nível de acesso.');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      u.email.toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm text-text-secondary">
          Defina o nível de acesso de cada colaborador. <strong className="text-foreground">Diretor</strong> e{' '}
          <strong className="text-foreground">Admin</strong> são os únicos que enxergam soluções marcadas como{' '}
          <strong className="text-foreground">restritas</strong> no painel de Soluções.
        </p>
      </Card>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, e-mail ou setor..."
        className="h-11 w-full max-w-sm rounded-xl border border-border bg-surface px-4 text-sm outline-none placeholder:text-text-secondary/50 focus:border-primary/40"
      />

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-secondary/70">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Setor</th>
                <th className="px-4 py-3 font-medium">Nível de acesso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{u.full_name || u.preferred_name || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {u.email}
                    {u.email === profile?.email && <span className="ml-2 text-[10px] text-primary">(você)</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        className={`rounded-lg border-none px-2.5 py-1.5 text-xs font-semibold outline-none disabled:opacity-50 ${ROLE_BADGE_CLASSES[u.role]}`}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {savingId === u.id && (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-text-secondary">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

// ── Página principal ─────────────────────────────────────────────────────────
export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('metricas');
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Load pending count for the tab badge
  useEffect(() => {
    fetchAllSugestoes()
      .then((list) => setPendingCount(list.filter((s) => s.status === 'pendente').length))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <ShieldAlert className="text-primary" size={32} />
            Painel Administrativo
          </h1>
          <p className="text-text-secondary">Monitoramento de uso e configuração do agente por setor.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit border border-border flex-wrap">
        <button
          onClick={() => setActiveTab('metricas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'metricas'
              ? 'bg-primary text-white shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <BarChart3 size={15} />
          Métricas
        </button>
        <button
          onClick={() => setActiveTab('agente')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'agente'
              ? 'bg-primary text-white shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <Bot size={15} />
          Agente
        </button>
        <button
          onClick={() => setActiveTab('sugestoes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sugestoes'
              ? 'bg-primary text-white shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <Lightbulb size={15} />
          Sugestões
          {pendingCount !== null && pendingCount > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
              activeTab === 'sugestoes' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'documentos'
              ? 'bg-primary text-white shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <BookOpen size={15} />
          Documentos
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'usuarios'
              ? 'bg-primary text-white shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <Users size={15} />
          Usuários
        </button>
      </div>

      {activeTab === 'metricas' && <MetricsTab />}
      {activeTab === 'agente' && <AgentTab />}
      {activeTab === 'sugestoes' && <SugestoesTab />}
      {activeTab === 'documentos' && <DocumentosTab />}
      {activeTab === 'usuarios' && <UsersTab />}
    </div>
  );
}
