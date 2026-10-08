import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Download, FileSpreadsheet, History,
  Image as ImageIcon, Loader2, Save, Sparkles, Trash2, Upload, Wand2, X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardRenderer } from '../features/dashboards/DashboardRenderer';
import { generateDashboard } from '../lib/dashboards/generateDashboard';
import {
  createDashboard, createDataSource, deleteDashboard, fetchDashboard, fetchDashboards, fetchDataSource,
  parseSpreadsheetFile, updateDashboard,
  type DashboardSummary, type ParsedSpreadsheet,
} from '../lib/dashboards/dashboardsData';
import { exportToPdfFit, exportToPng } from '../lib/dashboards/exportDashboard';
import type { ColumnProfile, ColumnRole, DashboardConfig, DataRow, DataType } from '../lib/dashboards/types';

type Tab = 'criar' | 'historico';
type Step = 0 | 1 | 2 | 3;

const ROLE_OPTIONS: Array<{ value: ColumnRole; label: string }> = [
  { value: 'metric', label: 'Métrica' },
  { value: 'dimension', label: 'Dimensão' },
  { value: 'date', label: 'Data' },
  { value: 'ignore', label: 'Ignorar' },
];
const TYPE_OPTIONS: Array<{ value: DataType; label: string }> = [
  { value: 'date', label: 'Data' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda' },
  { value: 'category', label: 'Categoria' },
  { value: 'id', label: 'Identificador' },
  { value: 'text', label: 'Texto' },
];

const STEP_LABELS = ['Objetivo', 'Dados', 'Gerar', 'Resultado'];

const TabButton = ({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-foreground'
    }`}
  >
    {icon}
    {label}
  </button>
);

export const Dashboards = () => {
  const [activeTab, setActiveTab] = useState<Tab>('criar');
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState('');

  // Passo 0 — objetivo
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#FF5100');

  // Passo 1 — dados
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [profile, setProfile] = useState<ColumnProfile[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Passo 2 — geração
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');

  // Passo 3 — resultado
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [dataSourceId, setDataSourceId] = useState<string | null>(null);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Histórico
  const [history, setHistory] = useState<DashboardSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [openHistoryItem, setOpenHistoryItem] = useState<DashboardSummary | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  const loadHistory = () => {
    setIsLoadingHistory(true);
    fetchDashboards()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setIsLoadingHistory(false));
  };

  useEffect(() => {
    if (activeTab === 'historico') loadHistory();
  }, [activeTab]);

  const resetWizard = () => {
    setStep(0);
    setName('');
    setObjective('');
    setParsed(null);
    setProfile([]);
    setConfig(null);
    setRows([]);
    setDataSourceId(null);
    setDashboardId(null);
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsParsing(true);
    setError('');
    try {
      const result = await parseSpreadsheetFile(file);
      if (result.rows.length === 0) throw new Error('Arquivo sem linhas de dados.');
      setParsed(result);
      setProfile(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler o arquivo.');
    } finally {
      setIsParsing(false);
    }
  };

  const updateColumn = (index: number, patch: Partial<ColumnProfile>) => {
    setProfile((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const activeProfile = profile.filter((c) => c.role !== 'ignore');

  const handleGenerate = async () => {
    if (!parsed) return;
    setStep(2);
    setIsGenerating(true);
    setError('');
    try {
      const result = await generateDashboard({
        prompt: objective.trim() || name.trim(),
        profile: activeProfile,
        brand: { primary: primaryColor },
        onStatus: (s) => setGenStatus(s.message),
      });
      setConfig(result);
      setRows(parsed.rows);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o dashboard.');
      setStep(1);
    } finally {
      setIsGenerating(false);
      setGenStatus('');
    }
  };

  const handleSave = async () => {
    if (!config || !parsed) return;
    setIsSaving(true);
    setError('');
    try {
      let srcId = dataSourceId;
      if (!srcId) {
        const src = await createDataSource(parsed.fileName, rows, profile);
        srcId = src.dataSourceId;
        setDataSourceId(srcId);
      }
      const finalConfig: DashboardConfig = { ...config, dataSourceId: srcId };
      if (dashboardId) {
        await updateDashboard(dashboardId, { name: name.trim() || config.name, objective: objective.trim(), config: finalConfig });
      } else {
        const saved = await createDashboard({
          name: name.trim() || config.name,
          objective: objective.trim(),
          config: finalConfig,
          dataSourceId: srcId,
        });
        setDashboardId(saved.id);
      }
      setConfig(finalConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o dashboard.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (kind: 'pdf' | 'png') => {
    if (!resultRef.current) return;
    setIsExporting(true);
    setError('');
    try {
      if (kind === 'pdf') await exportToPdfFit(resultRef.current, name || config?.name || 'dashboard');
      else await exportToPng(resultRef.current, name || config?.name || 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível exportar.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenHistoryItem = async (item: DashboardSummary) => {
    setIsLoadingItem(true);
    setOpenHistoryItem(item);
    setError('');
    try {
      const dashboard = await fetchDashboard(item.id);
      if (!dashboard.data_source_id) throw new Error('Este dashboard não tem fonte de dados associada.');
      const src = await fetchDataSource(dashboard.data_source_id);
      setConfig(dashboard.config);
      setRows(src.rows);
      setName(dashboard.name);
      setObjective(dashboard.objective || '');
      setDataSourceId(dashboard.data_source_id);
      setDashboardId(dashboard.id);
      setParsed({ fileName: src.fileName, rows: src.rows, columns: src.profile.map((p) => p.originalName), truncated: false, profile: src.profile });
      setProfile(src.profile);
      setStep(3);
      setActiveTab('criar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir este dashboard.');
      setOpenHistoryItem(null);
    } finally {
      setIsLoadingItem(false);
    }
  };

  const handleDeleteHistoryItem = async (item: DashboardSummary) => {
    try {
      await deleteDashboard(item.id);
      setHistory((prev) => prev.filter((h) => h.id !== item.id));
    } catch {
      setError('Não foi possível excluir este dashboard.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 pb-20 md:px-6 lg:px-10">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">DDM Lab</div>
        <h1 className="text-3xl font-extrabold tracking-tight">DDM Dashboards</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Suba uma planilha (Excel/CSV), descreva o objetivo e a IA monta um dashboard com KPIs e gráficos.
          Só você (e o admin) veem os dashboards que você criar.
        </p>
      </header>

      <div className="inline-flex rounded-xl border border-border bg-surface p-1">
        <TabButton
          label="Criar"
          icon={<Wand2 size={14} />}
          active={activeTab === 'criar'}
          onClick={() => {
            setActiveTab('criar');
            setOpenHistoryItem(null);
          }}
        />
        <TabButton label="Meus Dashboards" icon={<History size={14} />} active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {activeTab === 'criar' ? (
        <div className="space-y-6">
          {/* Indicador de etapas */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    i === step ? 'bg-primary text-white' : i < step ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary'
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-foreground' : 'text-text-secondary'}`}>{label}</span>
                {i < STEP_LABELS.length - 1 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="mx-auto max-w-2xl space-y-4 p-6">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Nome do dashboard *</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Painel de Cobrança — Visão Diretoria"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Objetivo</label>
                    <textarea
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      rows={4}
                      placeholder="O que esse dashboard precisa mostrar? Pra quem é? Quais métricas importam mais?"
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Cor de destaque</label>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-16 cursor-pointer rounded-lg border border-border bg-background"
                    />
                  </div>
                  <Button onClick={() => setStep(1)} disabled={!name.trim()} className="w-full justify-center">
                    Continuar <ArrowRight size={16} />
                  </Button>
                </Card>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <Card className="p-6">
                  {!parsed ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary/40"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="animate-spin text-primary" size={32} />
                          <p className="text-sm text-text-secondary">Lendo arquivo...</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-text-secondary" />
                          <p className="text-sm font-medium text-foreground">Arraste ou clique para enviar sua base</p>
                          <p className="text-xs text-text-secondary">.csv, .xlsx, .xls ou .json</p>
                        </>
                      )}
                      <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls,.json" className="hidden" onChange={handleFileChange} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                        <FileSpreadsheet className="shrink-0 text-primary" size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{parsed.fileName}</p>
                          <p className="text-xs text-text-secondary">
                            {parsed.rows.length.toLocaleString('pt-BR')} linhas · {parsed.columns.length} colunas
                            {parsed.truncated ? ' · truncado em 50 mil linhas' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setParsed(null);
                            setProfile([]);
                          }}
                          className="shrink-0 text-xs text-text-secondary hover:text-foreground"
                        >
                          Trocar
                        </button>
                      </div>

                      <p className="text-xs text-text-secondary">Confirme o tipo e o papel de cada coluna — a IA só usa o que estiver ativo aqui.</p>

                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-surface-hover">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Coluna</th>
                              <th className="px-3 py-2 text-left font-semibold">Exemplos</th>
                              <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                              <th className="px-3 py-2 text-left font-semibold">Papel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.map((c, i) => (
                              <tr key={c.originalName} className={`border-t border-border ${c.role === 'ignore' ? 'opacity-40' : ''}`}>
                                <td className="px-3 py-2 font-medium text-foreground">{c.originalName}</td>
                                <td className="max-w-[200px] truncate px-3 py-2 text-text-secondary">{c.sampleValues.join(', ') || '—'}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={c.dataType}
                                    onChange={(e) => updateColumn(i, { dataType: e.target.value as DataType })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                                  >
                                    {TYPE_OPTIONS.map((t) => (
                                      <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={c.role}
                                    onChange={(e) => updateColumn(i, { role: e.target.value as ColumnRole })}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                                  >
                                    {ROLE_OPTIONS.map((r) => (
                                      <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(0)}>
                          <ArrowLeft size={16} /> Voltar
                        </Button>
                        <Button onClick={handleGenerate} disabled={activeProfile.length === 0}>
                          <Sparkles size={16} /> Gerar dashboard
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="flex flex-col items-center gap-4 p-16 text-center">
                  <Loader2 className="animate-spin text-primary" size={40} />
                  <p className="text-sm text-text-secondary">{genStatus || 'Montando seu dashboard...'}</p>
                </Card>
              </motion.div>
            )}

            {step === 3 && config && (
              <motion.div key="step3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={resetWizard}>
                      <ArrowLeft size={16} /> Novo dashboard
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      {dashboardId ? 'Salvar alterações' : 'Salvar dashboard'}
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting}>
                      <Download size={16} /> PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('png')} disabled={isExporting}>
                      <ImageIcon size={16} /> PNG
                    </Button>
                  </div>
                </div>
                <Card className="p-6">
                  <div ref={resultRef}>
                    <DashboardRenderer config={config} rows={rows} />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key="historico" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {isLoadingHistory ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={28} />
              </div>
            ) : history.length === 0 ? (
              <Card className="p-10 text-center text-text-secondary">
                <BarChart3 size={30} className="mx-auto mb-3 text-text-secondary/40" />
                <p className="text-sm">Nenhum dashboard salvo ainda.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((item) => (
                  <Card key={item.id} hoverable onClick={() => handleOpenHistoryItem(item)} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item);
                        }}
                        className="shrink-0 text-text-secondary hover:text-red-400"
                        title="Excluir"
                      >
                        {isLoadingItem && openHistoryItem?.id === item.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                    {item.objective && <p className="line-clamp-2 text-xs text-text-secondary">{item.objective}</p>}
                    <p className="text-xs text-text-secondary/70">Atualizado em {new Date(item.updated_at).toLocaleDateString('pt-BR')}</p>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
