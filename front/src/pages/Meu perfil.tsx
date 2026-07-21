import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Users,
  Target,
  Zap,
  Save,
  Trophy,
  Lock,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getMissionProgressAsync, getMissionRankLabel } from '../lib/missionProgress';

const BADGE_CATALOG = [
  // RH
  { id: 'rh-olhar-de-aguia',              badgeName: 'Recrutador Ágil',         sector: 'RH',           xp: 40, emoji: '🦅', color: '#F97316' },
  { id: 'rh-entrevistador',               badgeName: 'Caçador de Talentos',     sector: 'RH',           xp: 40, emoji: '🎯', color: '#F97316' },
  { id: 'rh-comunicador',                 badgeName: 'Embaixador Interno',      sector: 'RH',           xp: 35, emoji: '📢', color: '#F97316' },
  { id: 'rh-avaliador',                   badgeName: 'Arquiteto de Pessoas',    sector: 'RH',           xp: 60, emoji: '🏗️', color: '#F97316' },
  { id: 'rh-mediador',                    badgeName: 'Gestor de Conflitos',     sector: 'RH',           xp: 60, emoji: '🕊️', color: '#F97316' },
  // Juridico
  { id: 'juridico-descodificador',        badgeName: 'Guardião da Clareza',     sector: 'Juridico',     xp: 40, emoji: '⚖️', color: '#0EA5E9' },
  { id: 'juridico-sintetizador-legal',    badgeName: 'Tradutor Jurídico',       sector: 'Juridico',     xp: 40, emoji: '📋', color: '#0EA5E9' },
  { id: 'juridico-redator',               badgeName: 'Voz do Direito',          sector: 'Juridico',     xp: 60, emoji: '🖊️', color: '#0EA5E9' },
  { id: 'juridico-analisador',            badgeName: 'Guardião Contratual',     sector: 'Juridico',     xp: 80, emoji: '🛡️', color: '#0EA5E9' },
  { id: 'juridico-argumentador',          badgeName: 'Defensor Estratégico',    sector: 'Juridico',     xp: 60, emoji: '📖', color: '#0EA5E9' },
  // Financeiro
  { id: 'financeiro-alquimista',          badgeName: 'Mestre das Planilhas',    sector: 'Financeiro',   xp: 60, emoji: '📊', color: '#10B981' },
  { id: 'financeiro-analisador',          badgeName: 'Intérprete dos Números',  sector: 'Financeiro',   xp: 60, emoji: '📈', color: '#10B981' },
  { id: 'financeiro-projetor',            badgeName: 'Arquiteto do Caixa',      sector: 'Financeiro',   xp: 80, emoji: '💰', color: '#10B981' },
  { id: 'financeiro-auditor',             badgeName: 'Fiscal Digital',          sector: 'Financeiro',   xp: 40, emoji: '🔍', color: '#10B981' },
  { id: 'financeiro-negociador',          badgeName: 'Mestre da Regularização', sector: 'Financeiro',   xp: 60, emoji: '💼', color: '#10B981' },
  // Backoffice
  { id: 'backoffice-sintetizador',        badgeName: 'Filtro de Elite',         sector: 'Backoffice',   xp: 35, emoji: '⚙️', color: '#D946EF' },
  { id: 'backoffice-organizador',         badgeName: 'Arquivista de Processos', sector: 'Backoffice',   xp: 40, emoji: '🗂️', color: '#D946EF' },
  { id: 'backoffice-redator-tecnico',     badgeName: 'Criador de Manuais',      sector: 'Backoffice',   xp: 60, emoji: '📝', color: '#D946EF' },
  { id: 'backoffice-analista',            badgeName: 'Destilador de Dados',     sector: 'Backoffice',   xp: 40, emoji: '🔬', color: '#D946EF' },
  { id: 'backoffice-gestor-tempo',        badgeName: 'Mestre da Prioridade',    sector: 'Backoffice',   xp: 35, emoji: '⏱️', color: '#D946EF' },
  // Planejamento
  { id: 'planejamento-arquiteto',         badgeName: 'Visionário Estratégico',  sector: 'Planejamento', xp: 60, emoji: '🏛️', color: '#8B5CF6' },
  { id: 'planejamento-estrategista',      badgeName: 'Arquiteto de OKRs',       sector: 'Planejamento', xp: 80, emoji: '🎯', color: '#8B5CF6' },
  { id: 'planejamento-analista-cenarios', badgeName: 'Antecipador de Riscos',   sector: 'Planejamento', xp: 60, emoji: '⚠️', color: '#8B5CF6' },
  { id: 'planejamento-definidor',         badgeName: 'Precisão Estratégica',    sector: 'Planejamento', xp: 40, emoji: '💡', color: '#8B5CF6' },
  { id: 'planejamento-narrador',          badgeName: 'Contador de Resultados',  sector: 'Planejamento', xp: 60, emoji: '🎙️', color: '#8B5CF6' },
  // Operacoes
  { id: 'operacoes-maestro',              badgeName: 'Eficiência Máxima',       sector: 'Operacoes',    xp: 40, emoji: '✅', color: '#06B6D4' },
  { id: 'operacoes-otimizador',           badgeName: 'Caçador de Gargalos',     sector: 'Operacoes',    xp: 60, emoji: '🔧', color: '#06B6D4' },
  { id: 'operacoes-padronizador',         badgeName: 'Guardião do Padrão',      sector: 'Operacoes',    xp: 60, emoji: '📐', color: '#06B6D4' },
  { id: 'operacoes-monitor',              badgeName: 'Arquiteto de KPIs',       sector: 'Operacoes',    xp: 40, emoji: '📊', color: '#06B6D4' },
  { id: 'operacoes-treinador',            badgeName: 'Formador de Times',       sector: 'Operacoes',    xp: 40, emoji: '👥', color: '#06B6D4' },
  // Comercial
  { id: 'comercial-persuasivo',           badgeName: 'Fechador de Deals',       sector: 'Comercial',    xp: 60, emoji: '🤝', color: '#F59E0B' },
  { id: 'comercial-pitchador',            badgeName: 'Mestre do Pitch',         sector: 'Comercial',    xp: 40, emoji: '🎤', color: '#F59E0B' },
  { id: 'comercial-negociador',           badgeName: 'Arquiteto de Propostas',  sector: 'Comercial',    xp: 60, emoji: '📄', color: '#F59E0B' },
  { id: 'comercial-seguidor',             badgeName: 'Rei do Follow-up',        sector: 'Comercial',    xp: 35, emoji: '👑', color: '#F59E0B' },
  { id: 'comercial-analisador',           badgeName: 'Destruidor de Objeções',  sector: 'Comercial',    xp: 60, emoji: '🛡️', color: '#F59E0B' },
  // Marketing
  { id: 'marketing-criativo',             badgeName: 'Mestre do Conteúdo',      sector: 'Marketing',    xp: 40, emoji: '✨', color: '#EC4899' },
  { id: 'marketing-estrategista',         badgeName: 'Planejador de Conteúdo',  sector: 'Marketing',    xp: 60, emoji: '📅', color: '#EC4899' },
  { id: 'marketing-copywriter',           badgeName: 'Alquimista de Palavras',  sector: 'Marketing',    xp: 60, emoji: '✍️', color: '#EC4899' },
  { id: 'marketing-analista-marca',       badgeName: 'Detetive de Marcas',      sector: 'Marketing',    xp: 60, emoji: '🔎', color: '#EC4899' },
  { id: 'marketing-roteirista',           badgeName: 'Diretor de Conteúdo',     sector: 'Marketing',    xp: 40, emoji: '🎬', color: '#EC4899' },
];

const normalizeDepartmentToMissionSector = (department?: string) => {
  const normalized = String(department || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (normalized.includes('jur')) return 'Juridico';
  if (normalized.includes('mark')) return 'Marketing';
  if (normalized.includes('finan')) return 'Financeiro';
  if (normalized.includes('planej')) return 'Planejamento';
  if (normalized.includes('oper')) return 'Operacoes';
  if (normalized.includes('comercial') || normalized.includes('vend')) return 'Comercial';
  if (normalized.includes('back')) return 'Backoffice';
  if (normalized.includes('rh')) return 'RH';
  return null;
};

const AVAILABLE_AVATARS = [
  'Acordito de Notebook Masculino - Escrit\u00f3rio.png',
  'Acordito Feminino - Call Center11.png',
  'Acordito Masculino - Call Center11.png',
  'Acordito Masculino - Escrit\u00f3rio.png',
  'Whisk_5a76a7624c1c5fcb87f4a15c5443b1eceg.png',
  'Whisk_709cc5ff79d14d3b2984bc7db7c00f55dr.png',
].map((fileName) => ({
  fileName,
  url: `/avatars/${encodeURIComponent(fileName)}`,
}));

const UNIT_OPTIONS = ['DDM - Sao Paulo', 'DDM - Rio de Janeiro'];
const SECTOR_OPTIONS = [
  'RH',
  'Jurídico',
  'Financeiro',
  'Backoffice',
  'Planejamento',
  'Comercial',
  'Marketing',
  'Gestão',
];

export const Profile = () => {
  const { profile, updateProfile, user } = useAuth();
  const [preferredName, setPreferredName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [focusArea, setFocusArea] = useState('Automacao de Campanhas B2B');
  const [avatarUrl, setAvatarUrl] = useState(AVAILABLE_AVATARS[0].url);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [missionXp, setMissionXp] = useState(0);

  useEffect(() => {
    setPreferredName(profile?.preferredName || '');
    setJobTitle(profile?.jobTitle || '');
    setDepartment(profile?.department || '');
    setUnit(profile?.unit || UNIT_OPTIONS[0]);
    setFocusArea('Automacao de Campanhas B2B');
    setAvatarUrl(profile?.avatarUrl || AVAILABLE_AVATARS[0].url);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getMissionProgressAsync(user.id).then((snap) => {
      setEarnedBadges(snap.badges);
      setMissionXp(snap.totalXp);
    }).catch(() => {});
  }, [user]);

  const userSector = normalizeDepartmentToMissionSector(profile?.department);
  const displayedBadges = userSector ? BADGE_CATALOG.filter((b) => b.sector === userSector) : BADGE_CATALOG;
  const earnedInSector = displayedBadges.filter((b) => earnedBadges.includes(b.badgeName)).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    setSaveError('');

    try {
      await updateProfile({
        preferredName: preferredName.trim(),
        avatarUrl,
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        unit,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferredName(profile?.preferredName || '');
    setJobTitle(profile?.jobTitle || '');
    setDepartment(profile?.department || '');
    setUnit(profile?.unit || UNIT_OPTIONS[0]);
    setFocusArea('Automacao de Campanhas B2B');
    setAvatarUrl(profile?.avatarUrl || AVAILABLE_AVATARS[0].url);
    setSaved(false);
    setSaveError('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-text-secondary">Visualize suas informacoes profissionais e personalize como voce aparece no Hub.</p>
      </header>

      <Card className="border-none bg-surface/50 p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-border bg-surface-hover text-text-secondary">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar do perfil" className="h-full w-full object-cover" />
            ) : (
              <User size={56} />
            )}
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">{profile?.displayName || 'Colaborador'}</h2>
              <p className="text-sm font-medium text-primary">
                {profile?.preferredName ? `Chamado no Hub como ${profile.preferredName}` : 'Defina como voce quer ser chamado'}
              </p>
              <div className="flex items-center justify-center gap-2 text-text-secondary md:justify-start">
                <Mail size={16} />
                <span className="text-sm">{profile?.email || 'colaborador@grupoddm.com.br'}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-1 md:justify-start">
              <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                <Building2 size={14} />
                {profile?.department || 'Geral'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 border-border px-3 py-1 text-text-secondary">
                <Building2 size={14} />
                {profile?.unit || UNIT_OPTIONS[0]}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 border-border px-3 py-1 text-text-secondary">
                <Briefcase size={14} />
                {profile?.jobTitle || 'Colaborador'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-hover text-foreground">
            <Users size={20} />
          </div>
          <h3 className="text-xl font-bold">Seus Dados</h3>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <ProfileField icon={User} label="Nome completo" value={profile?.displayName || ''} readOnly />
              <EditableField
                icon={User}
                label="Como voce quer ser chamado?"
                value={preferredName}
                onChange={setPreferredName}
                placeholder="Ex: Gisele"
              />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {profile?.department && profile.department !== 'Geral' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Setor</label>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                      <Building2 size={16} className="text-text-secondary" />
                      <span className="flex-1 text-sm text-foreground">{department}</span>
                      <Lock size={13} className="text-text-secondary/40" />
                    </div>
                  </div>
                ) : (
                  <SelectField
                    icon={Building2}
                    label="Setor"
                    value={department}
                    onChange={setDepartment}
                    options={SECTOR_OPTIONS}
                  />
                )}
                <SelectField icon={Building2} label="Unidade" value={unit} onChange={setUnit} options={UNIT_OPTIONS} />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <EditableField
                  icon={Briefcase}
                  label="Cargo"
                  value={jobTitle}
                  onChange={setJobTitle}
                  placeholder="Ex: Analista"
                />
                <EditableField
                  icon={Target}
                  label="Foco Atual"
                  value={focusArea}
                  onChange={setFocusArea}
                  placeholder="Ex: Automação de Campanhas B2B"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Escolha sua foto de perfil
              </label>
              <div className="grid grid-cols-6 gap-6 p-2">
                {AVAILABLE_AVATARS.map((avatar) => {
                  const isSelected = avatarUrl === avatar.url;

                  return (
                    <motion.button
                      key={avatar.url}
                      type="button"
                      onClick={() => setAvatarUrl(avatar.url)}
                      animate={
                        isSelected
                          ? {
                              scale: [1, 1.03, 1],
                              boxShadow: [
                                '0 0 0 2px #ff6a00, 0 0 30px rgba(255,106,0,0.24)',
                                '0 0 0 2px #ff6a00, 0 0 30px rgba(255,106,0,0.4)',
                                '0 0 0 2px #ff6a00, 0 0 30px rgba(255,106,0,0.24)',
                              ],
                            }
                          : {
                              scale: 1,
                              boxShadow: '0 0 0 0 rgba(0,0,0,0)',
                            }
                      }
                      transition={{
                        duration: 5,
                        repeat: isSelected ? Infinity : 0,
                        ease: 'easeInOut',
                      }}
                      className={`relative aspect-square rounded-full border-2 bg-surface-hover p-2 transition-all duration-200 ${
                        isSelected
                          ? 'z-10 border-orange-500'
                          : 'border-border hover:scale-105 hover:border-border'
                      }`}
                    >
                      <img src={avatar.url} alt="Avatar" className="h-full w-full rounded-full object-contain" />
                      {isSelected && (
                        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white shadow-lg">
                          ✓
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <button
                type="submit"
                disabled={isSaving || !preferredName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
              {saved && <span className="text-sm font-medium text-emerald-400">Perfil atualizado com sucesso.</span>}
              {saveError && <span className="text-sm font-medium text-red-400">{saveError}</span>}
            </div>
          </form>
        </Card>
      </section>

      {/* Badges Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Minhas Conquistas</h3>
              <p className="text-xs text-text-secondary">
                {userSector
                  ? `${earnedInSector} de ${displayedBadges.length} conquistas do setor`
                  : `${earnedBadges.length} de ${BADGE_CATALOG.length} badges desbloqueados`}
              </p>
            </div>
          </div>
          {missionXp > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2">
              <Zap size={14} className="text-primary" />
              <span className="text-sm font-bold text-primary">{missionXp} XP</span>
              <span className="text-xs text-text-secondary">· {getMissionRankLabel(missionXp)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {displayedBadges.map((badge) => {
            const isEarned = earnedBadges.includes(badge.badgeName);
            return (
              <div
                key={badge.id}
                className="relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200"
                style={
                  isEarned
                    ? {
                        background: 'rgba(255,215,0,0.06)',
                        border: '1px solid rgba(255,215,0,0.25)',
                        boxShadow: '0 0 20px rgba(255,215,0,0.08)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                {!isEarned && (
                  <div className="absolute right-3 top-3 text-white/20">
                    <Lock size={12} />
                  </div>
                )}

                <div
                  className="relative flex h-16 w-16 items-center justify-center rounded-full text-2xl"
                  style={
                    isEarned
                      ? { background: `${badge.color}18`, border: `1.5px solid ${badge.color}40` }
                      : { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }
                  }
                >
                  <span style={isEarned ? {} : { filter: 'grayscale(1)', opacity: 0.3 }}>{badge.emoji}</span>
                  {isEarned && (
                    <div
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                      style={{ background: '#FFD700', color: '#000' }}
                    >
                      ✓
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: isEarned ? '#fff' : 'rgba(255,255,255,0.25)' }}
                  >
                    {badge.badgeName}
                  </p>
                  <p className="text-[10px]" style={{ color: isEarned ? badge.color : 'rgba(255,255,255,0.15)' }}>
                    {badge.sector}
                  </p>
                  <p className="text-[10px]" style={{ color: isEarned ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.12)' }}>
                    {badge.xp} XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

interface ProfileFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  readOnly?: boolean;
}

const ProfileField = ({ icon: Icon, label, value, readOnly }: ProfileFieldProps) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">{label}</label>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <Icon size={16} className="text-text-secondary" />
      <input value={value} readOnly={readOnly} className="w-full bg-transparent text-sm text-foreground outline-none" />
    </div>
  </div>
);

interface EditableFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const EditableField = ({ icon: Icon, label, value, onChange, placeholder }: EditableFieldProps) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">{label}</label>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
      <Icon size={16} className="text-text-secondary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/25"
      />
    </div>
  </div>
);

interface SelectFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const SelectField = ({ icon: Icon, label, value, onChange, options }: SelectFieldProps) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">{label}</label>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
      <Icon size={16} className="text-text-secondary" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm text-foreground outline-none">
        {options.map((option) => (
          <option key={option} value={option} className="bg-surface text-foreground">
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);
