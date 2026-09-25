import { useState, useEffect, useCallback } from 'react';
import { Search, Star, ChevronRight, Info, Sparkles, X, ChevronDown, ChevronUp, RefreshCw, Check, Wand2, BookOpen, Bot, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TEMPLATES, DEPARTMENTS } from '../constants';
import { Department } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import {
  addFavoritePrompt, fetchFavoritePrompts, fetchPromptTemplates, removeFavoritePrompt,
  fetchCustomPrompts, insertCustomPrompt, deleteCustomPrompt as deleteCustomPromptDB,
  type CustomPromptRecord,
} from '../lib/supabaseData';
import { cn } from '../lib/utils';
import { generateChatResponseWithOpenAI } from '../lib/openai';
import { fetchSkills, type Skill } from '../lib/skillsData';
import { SkillCard } from '../features/skills/SkillCard';
import { UploadSkillModal } from '../features/skills/UploadSkillModal';
import { SkillDetailsModal } from '../features/skills/SkillDetailsModal';

type CustomPrompt = CustomPromptRecord;

const BUSINESS_DEPARTMENTS = [
  'RH', 'Jurídico', 'Financeiro', 'Backoffice', 'Planejamento',
  'Comercial', 'Marketing', 'Gestão',
] as const;

const TONE_OPTIONS = [
  { value: 'Profissional', label: 'Profissional' },
  { value: 'Direto', label: 'Direto' },
  { value: 'Técnico', label: 'Técnico' },
  { value: 'Amigável', label: 'Amigável' },
] as const;

type WizardStep = 1 | 2 | 3;

// ─── Expandable prompt text box ─────────────────────────────────────────────

interface PromptBoxProps {
  text: string;
}

const PromptBox = ({ text }: PromptBoxProps) => {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 160;
  const isTruncatable = text.length > TRUNCATE_AT;
  const displayed = !isTruncatable || expanded ? text : text.slice(0, TRUNCATE_AT) + '…';

  return (
    <div className="mt-3 rounded-xl bg-surface-hover border border-border p-3">
      <p className="text-[11px] text-text-secondary font-mono leading-relaxed whitespace-pre-wrap break-words">
        {displayed}
      </p>
      {isTruncatable && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-semibold"
        >
          {expanded ? <><ChevronUp size={12} /> ver menos</> : <><ChevronDown size={12} /> ver mais</>}
        </button>
      )}
    </div>
  );
};

// ─── Criar com IA modal ──────────────────────────────────────────────────────

interface CreateWithAIModalProps {
  userId: string;
  onClose: () => void;
  onSaved: (prompt: CustomPrompt) => void;
}

const CreateWithAIModal = ({ userId, onClose, onSaved }: CreateWithAIModalProps) => {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 fields
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [tone, setTone] = useState('');

  // Step 2 fields
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [aiError, setAiError] = useState('');

  // Step 3
  const [savedTitle, setSavedTitle] = useState('');

  const canProceedStep1 = purpose.trim().length > 0 && department.length > 0 && tone.length > 0;

  const buildSystemPrompt = () => `
Você é um especialista em criação de prompts de IA para ambientes corporativos.
Sua tarefa é criar um prompt template profissional e pronto para uso no setor ${department} de um escritório de advocacia / empresa de gestão jurídica.
Tom desejado: ${tone}.

O prompt deve:
- Ser escrito em Português Brasileiro
- Ter uma persona clara (ex: "Você é um especialista em...")
- Incluir variáveis em [MAIÚSCULAS] onde o usuário precisar preencher
- Ser estruturado e completo, pronto para usar com uma IA
- Ter entre 3 e 8 frases

Responda APENAS com um JSON válido neste formato exato (sem markdown, sem código fence):
{"titulo": "Título curto e descritivo do template", "prompt": "O prompt template completo aqui"}
`.trim();

  const generatePrompt = useCallback(async () => {
    setLoading(true);
    setAiError('');
    try {
      const raw = await generateChatResponseWithOpenAI(
        `Crie um prompt template para a seguinte necessidade: "${purpose}"`,
        [],
        buildSystemPrompt(),
      );

      // Extract JSON robustly
      const startIdx = raw.indexOf('{');
      const endIdx = raw.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) throw new Error('Resposta fora do formato esperado.');
      const jsonStr = raw.slice(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr) as { titulo?: string; prompt?: string };

      if (!parsed.prompt) throw new Error('A IA não retornou o prompt.');

      setGeneratedPrompt(parsed.prompt.trim());
      setSuggestedTitle(parsed.titulo?.trim() || 'Novo Prompt');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar com IA. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [purpose, department, tone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!canProceedStep1) return;
    setStep(2);
    await generatePrompt();
  };

  const handleRegenerate = async () => {
    await generatePrompt();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const saved = await insertCustomPrompt(userId, {
        title: suggestedTitle.trim() || 'Novo Prompt',
        department,
        tone,
        purpose,
        prompt_text: generatedPrompt,
      });
      setSavedTitle(saved.title);
      onSaved(saved);
      setStep(3);
    } catch {
      setAiError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Wand2 size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Criar Prompt com IA</h2>
              <p className="text-[10px] text-text-secondary">
                {step === 1 && 'Passo 1 — Descreva o que precisa'}
                {step === 2 && 'Passo 2 — Revise e edite'}
                {step === 3 && 'Passo 3 — Salvo com sucesso'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-hover hover:bg-surface-hover flex items-center justify-center text-text-secondary hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 pt-4 gap-1.5">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 rounded-full flex-1 transition-all duration-300',
                step >= s ? 'bg-primary' : 'bg-white/10',
              )}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto max-h-[70vh]">
          <AnimatePresence mode="wait">
            {/* ── Step 1 ──────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                    Para que serve este prompt? <span className="text-primary">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Escrever e-mail de follow-up após reunião com cliente sobre proposta de honorários"
                    className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 resize-none transition-all"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                    Setor / Área <span className="text-primary">*</span>
                  </label>
                  <select
                    className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all appearance-none"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="" disabled className="bg-surface">Selecione o setor</option>
                    {BUSINESS_DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-surface">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                    Tom desejado <span className="text-primary">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTone(opt.value)}
                        className={cn(
                          'py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left',
                          tone === opt.value
                            ? 'bg-primary/15 border-primary/60 text-primary'
                            : 'bg-surface-hover border-border text-text-secondary hover:border-border hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2 ──────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-text-secondary">Gerando seu prompt com IA...</p>
                  </div>
                ) : aiError ? (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm text-rose-400">
                    {aiError}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">Título sugerido</label>
                      <input
                        type="text"
                        className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                        value={suggestedTitle}
                        onChange={(e) => setSuggestedTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">Prompt gerado</label>
                      <textarea
                        rows={8}
                        className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 resize-none transition-all"
                        value={generatedPrompt}
                        onChange={(e) => setGeneratedPrompt(e.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-text-secondary">
                        Edite livremente antes de salvar.
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── Step 3 ──────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center py-10 gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <Check size={24} className="text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Prompt salvo!</p>
                  <p className="text-sm text-text-secondary mt-1">
                    <span className="text-primary font-semibold">"{savedTitle}"</span> foi adicionado à seção <span className="text-foreground font-medium">Meus Prompts</span>.
                  </p>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Você pode usá-lo ou editá-lo a qualquer momento.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-3 border-t border-border flex gap-2 justify-end">
          {step === 1 && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
              <Button
                size="sm"
                disabled={!canProceedStep1}
                onClick={handleGenerate}
              >
                <Sparkles size={14} />
                Gerar com IA
              </Button>
            </>
          )}
          {step === 2 && !loading && !aiError && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="secondary" size="sm" onClick={handleRegenerate} loading={loading}>
                <RefreshCw size={13} />
                Regenerar
              </Button>
              <Button
                size="sm"
                disabled={!generatedPrompt.trim()}
                onClick={handleSave}
              >
                Salvar no Meu Banco
                <ChevronRight size={14} />
              </Button>
            </>
          )}
          {step === 2 && !loading && aiError && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="sm" onClick={handleRegenerate}>Tentar Novamente</Button>
            </>
          )}
          {step === 3 && (
            <Button size="sm" onClick={onClose}>Fechar</Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Library page ───────────────────────────────────────────────────────

type LibraryTab = 'templates' | 'meus' | 'skills';

export const Library = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userData } = useUser();
  const [selectedDept, setSelectedDept] = useState<Department | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [templates, setTemplates] = useState(TEMPLATES);
  const [activeTab, setActiveTab] = useState<LibraryTab>('templates');
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [showUploadSkillModal, setShowUploadSkillModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);


  useEffect(() => {
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const dbTemplates = await fetchPromptTemplates();
        if (dbTemplates.length > 0) {
          setTemplates(dbTemplates);
        }
      } catch (error) {
        console.error('Erro ao carregar prompts:', error);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      const storedFavorites = await fetchFavoritePrompts();
      setFavorites(storedFavorites);
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchCustomPrompts(user.id)
      .then(setCustomPrompts)
      .catch(() => setCustomPrompts([]));
  }, [user?.id]);

  const loadSkills = useCallback(() => {
    setSkillsLoading(true);
    fetchSkills()
      .then(setSkills)
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSkillUploaded = (skill: Skill) => {
    setSkills((prev) => [skill, ...prev]);
    setShowUploadSkillModal(false);
    setSelectedSkill(skill);
  };

  const handleSkillChanged = () => {
    loadSkills();
  };

  const toggleFavorite = async (template: { basePrompt: string }) => {
    try {
      const isFav = favorites.includes(template.basePrompt);
      if (isFav) {
        await removeFavoritePrompt(template.basePrompt);
        setFavorites(prev => prev.filter(p => p !== template.basePrompt));
      } else {
        await addFavoritePrompt(template.basePrompt);
        setFavorites(prev => [...prev, template.basePrompt]);
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesDept = selectedDept === 'Todos' || t.department === selectedDept;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredSkills = skills.filter((s) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
  });

  const filteredCustomPrompts = customPrompts.filter(p => {
    const matchesDept = selectedDept === 'Todos' || p.department === selectedDept;
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.purpose.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleUseTemplate = (template: { basePrompt: string; name: string; description: string; department: string }) => {
    navigate('/generator', {
      state: {
        prompt: template.basePrompt,
        objective: template.name,
        sector: template.department,
        introMessage: `Modelo carregado: **${template.name}**\n\n${template.description}\n\nEdite o prompt abaixo conforme necessário e envie quando estiver pronto.`,
      },
    });
  };

  const handleUseCustomPrompt = (cp: CustomPrompt) => {
    navigate('/generator', {
      state: {
        prompt: cp.prompt_text,
        objective: cp.title,
        sector: cp.department,
        introMessage: `Prompt carregado: **${cp.title}**\n\nEdite conforme necessário e envie quando estiver pronto.`,
      },
    });
  };

  const handlePromptSaved = (prompt: CustomPrompt) => {
    setCustomPrompts(prev => [...prev, prompt]);
  };

  const deleteCustomPrompt = async (id: string) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== id));
    await deleteCustomPromptDB(id).catch(() => {});
  };

  return (
    <>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Modelos Prontos</h1>
            <p className="text-sm text-text-secondary">
              Escolha um modelo que combine com o que você precisa e use agora mesmo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              <Wand2 size={15} />
              Criar Prompt com IA
            </Button>
            <Button variant="outline" onClick={() => setShowUploadSkillModal(true)}>
              <UploadCloud size={15} />
              Enviar Skill
            </Button>
            <Button onClick={() => navigate('/generator')}>
              Pedir Novo Modelo
            </Button>
          </div>
        </div>

        {/* Search + Department filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, tag ou objetivo..."
              className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedDept('Todos')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap',
                selectedDept === 'Todos'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-surface border-border text-text-secondary hover:border-white/20',
              )}
            >
              Todos
            </button>
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap',
                  selectedDept === dept
                    ? 'bg-primary border-primary text-white'
                    : 'bg-surface border-border text-text-secondary hover:border-white/20',
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit border border-border">
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              activeTab === 'templates'
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-foreground',
            )}
          >
            <BookOpen size={13} />
            Modelos do DDM Lab
            <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-bold">
              {filteredTemplates.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('meus')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              activeTab === 'meus'
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-foreground',
            )}
          >
            <Sparkles size={13} />
            Meus Prompts
            {customPrompts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">
                {customPrompts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              activeTab === 'skills'
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-foreground',
            )}
          >
            <Bot size={13} />
            Skills
            {skills.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-bold">
                {skills.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab: Modelos do DDM Lab ─────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div
              key="tab-templates"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const isFav = favorites.includes(template.basePrompt);
                  return (
                    <Card key={template.id} hoverable className="group flex flex-col h-full border-border/40">
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                            {template.department}
                          </span>
                          {template.popular && (
                            <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                              Popular
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFavorite(template)}
                          className={cn(
                            'transition-colors shrink-0',
                            isFav ? 'text-yellow-500' : 'text-text-secondary hover:text-yellow-500',
                          )}
                        >
                          <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>

                      {/* Description — "O que é / para que serve" */}
                      <p className="text-sm text-text-secondary mb-1">{template.description}</p>

                      {/* Prompt preview */}
                      <PromptBox text={template.basePrompt} />

                      <div className="mt-4 space-y-4 flex-1 flex flex-col justify-end">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          {template.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] text-text-secondary bg-surface-hover px-2 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-text-secondary">
                            <Info size={14} />
                            <span className="text-[10px] font-medium uppercase tracking-widest">
                              {template.complexity}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary group-hover:translate-x-1 transition-transform"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Usar este modelo
                            <ChevronRight size={16} className="ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-text-secondary">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Nenhum template encontrado</h3>
                  <p className="text-text-secondary">Tente ajustar seus filtros ou busca.</p>
                  <Button
                    variant="secondary"
                    onClick={() => { setSelectedDept('Todos'); setSearch(''); }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab: Meus Prompts ──────────────────────────── */}
          {activeTab === 'meus' && (
            <motion.div
              key="tab-meus"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {customPrompts.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-text-secondary">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Nenhum prompt criado ainda</h3>
                  <p className="text-text-secondary">
                    Use o botão <span className="text-primary font-semibold">Criar Prompt com IA</span> para gerar seu primeiro template personalizado.
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Wand2 size={15} />
                    Criar Prompt com IA
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomPrompts.map((cp) => (
                    <Card key={cp.id} hoverable className="group flex flex-col h-full border-border/40">
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                            {cp.department}
                          </span>
                          <span className="px-2 py-1 rounded bg-surface-hover text-text-secondary text-[10px] font-bold uppercase tracking-wider">
                            {cp.tone}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteCustomPrompt(cp.id)}
                          className="text-text-secondary hover:text-rose-400 transition-colors"
                          title="Remover prompt"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        {cp.title}
                      </h3>

                      {/* Purpose */}
                      <p className="text-sm text-text-secondary mb-1">{cp.purpose}</p>

                      {/* Prompt preview */}
                      <PromptBox text={cp.prompt_text} />

                      <div className="mt-4 flex-1 flex flex-col justify-end">
                        <div className="pt-4 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-text-secondary">
                            {new Date(cp.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary group-hover:translate-x-1 transition-transform"
                            onClick={() => handleUseCustomPrompt(cp)}
                          >
                            Usar este prompt
                            <ChevronRight size={16} className="ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {filteredCustomPrompts.length === 0 && customPrompts.length > 0 && (
                    <div className="col-span-full text-center py-16 space-y-3">
                      <p className="text-text-secondary">Nenhum prompt encontrado com este filtro.</p>
                      <Button
                        variant="secondary"
                        onClick={() => { setSelectedDept('Todos'); setSearch(''); }}
                      >
                        Limpar Filtros
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab: Skills ─────────────────────────────────── */}
          {activeTab === 'skills' && (
            <motion.div
              key="tab-skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {skillsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                </div>
              ) : filteredSkills.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-text-secondary">
                    <Bot size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Nenhuma skill por aqui ainda</h3>
                  <p className="text-text-secondary">
                    Envie um .zip com sua skill do Claude para compartilhar com o time.
                  </p>
                  <Button onClick={() => setShowUploadSkillModal(true)}>
                    <UploadCloud size={15} />
                    Enviar Skill
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isOwner={skill.created_by === user?.id}
                      onSelect={setSelectedSkill}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create with AI modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWithAIModal
            userId={user?.id ?? ''}
            onClose={() => setShowCreateModal(false)}
            onSaved={handlePromptSaved}
          />
        )}
      </AnimatePresence>

      {/* Skills: upload e detalhes */}
      <AnimatePresence>
        {showUploadSkillModal && (
          <UploadSkillModal onClose={() => setShowUploadSkillModal(false)} onSaved={handleSkillUploaded} />
        )}
        {selectedSkill && (
          <SkillDetailsModal
            skill={selectedSkill}
            onClose={() => setSelectedSkill(null)}
            onChanged={() => {
              handleSkillChanged();
              setSelectedSkill(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
