import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Users,
  Target,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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
  const { profile, updateProfile } = useAuth();
  const [preferredName, setPreferredName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [focusArea, setFocusArea] = useState('Automacao de Campanhas B2B');
  const [avatarUrl, setAvatarUrl] = useState(AVAILABLE_AVATARS[0].url);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setPreferredName(profile?.preferredName || '');
    setJobTitle(profile?.jobTitle || '');
    setDepartment(profile?.department || '');
    setUnit(profile?.unit || UNIT_OPTIONS[0]);
    setFocusArea('Automacao de Campanhas B2B');
    setAvatarUrl(profile?.avatarUrl || AVAILABLE_AVATARS[0].url);
  }, [profile]);

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
