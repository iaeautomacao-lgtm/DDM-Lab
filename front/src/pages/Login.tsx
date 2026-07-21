import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Loader2,
  Lock,
  LogIn,
  Mail,
  User,
  UserPlus,
  Briefcase,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const SECTORS = [
  'Marketing',
  'Comercial / Vendas',
  'Call Center / Atendimento',
  'Jurídico',
  'Financeiro',
  'Backoffice / Operações',
  'RH',
  'TI',
  'Diretoria',
  'Outro',
];

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background py-3 pr-4 pl-11 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20';

const LABEL_CLASS =
  'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40';

export function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [sector, setSector] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.passwordReset) {
      setSuccess('Senha redefinida com sucesso. Entre com sua nova senha.');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, {
        password,
        isLogin,
        displayName,
        preferredName,
        sector,
        jobTitle: role,
      });
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="flex min-h-screen bg-background">
      
      {/* ── Coluna esquerda — Branding ── */}
      {/* Ajustado para 50% exatos e com justify-center para não esticar */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#0D0D0D] p-12 lg:flex lg:w-1/2 border-r border-white/5">
        
        {/* Gradiente decorativo */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        {/* CONTAINER INVISÍVEL - Mantém o conteúdo agrupado e alinhado */}
        <div className="relative z-10 flex h-full w-full max-w-lg flex-col justify-between py-10">
          
          {/* Logo */}
          <div className="w-36 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2.5 shadow-lg shadow-primary/10">
            <img src="/logo-ddm.webp" alt="Grupo DDM" className="block h-auto w-full object-contain" />
          </div>

          {/* Conteúdo central */}
          <div className="space-y-8 my-auto">
            <div className="space-y-5">
              <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                Plataforma Interna · Grupo DDM
              </span>
              <h1 className="text-5xl font-extrabold leading-tight text-white tracking-tight">
                DDM Lab.<br />
                <span className="text-primary">IA aplicada ao dia a dia da empresa.</span><br />
                
              </h1>
              <p className="max-w-md text-base leading-relaxed text-white/50">
                Centralize ferramentas de Inteligência Artificial, prompts, cases reais e métricas de uso em um único ambiente.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-10">
              {[['48+', 'Modelos prontos'], ['7', 'Setores'], ['320h', 'Economia/mês']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div className="text-2xl font-bold text-primary">{val}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mt-1">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Acordito decorativo */}
          <div className="mt-15 flex items-center gap-3">
            <div className="h-30 w-30 rounded-[18px] bg-orange-500 p-[1px] shadow-lg shadow-primary/20">
              <div className="h-full w-full overflow-hidden rounded-[17px] bg-surface">
                <video
                  src="/acordito.phone.mp4"
                  className="block h-full w-full object-cover object-center"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Olá, eu sou o Acordito!</p> 
              <p className="text-[10px] text-white/40 font-medium">Seu assistente de IA interno</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Coluna direita — Formulário ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* Logo mobile */}
        <div className="mb-8 w-32 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2.5 lg:hidden">
          <img src="/logo-ddm.webp" alt="Grupo DDM" className="block h-auto w-full object-contain" />
        </div>

        {/* Alterado de max-w-sm (pequeno) para max-w-md (médio) para o formulário respirar */}
        <div className="w-full max-w-md">
          {/* Header do form */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isLogin ? 'Bem-vindo(a)!' : 'Criar sua conta'}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isLogin
                ? 'Entre com seu e-mail DDM para acessar o Lab.'
                : 'Preencha os dados abaixo para começar a usar o DDM Lab.'}
            </p>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Nome — só no cadastro */}
              {!isLogin && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>Nome completo</label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Seu nome completo"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Como você quer ser chamado?</label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                      <input
                        type="text"
                        required
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        placeholder="Ex: Gisele"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* E-mail */}
              <div>
                <label className={LABEL_CLASS}>E-mail DDM</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@grupoddm.com.br"
                    className={INPUT_CLASS}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className={LABEL_CLASS}>Senha</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={INPUT_CLASS}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
                {isLogin && (
                  <div className="mt-2 flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                )}
              </div>

              {/* Setor e Cargo — só no cadastro */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Setor</label>
                    <div className="relative">
                      <Building2 className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                      <select
                        required
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className={INPUT_CLASS + ' appearance-none cursor-pointer text-xs'}
                      >
                        <option value="" disabled>Selecione...</option>
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-white/30" size={15} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>Cargo</label>
                    <div className="relative">
                      <Briefcase className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Ex: Analista..."
                        className={INPUT_CLASS + ' text-xs'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-400">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : isLogin ? (
                  <><LogIn size={17} /> Entrar no Hub</>
                ) : (
                  <><UserPlus size={17} /> Criar minha conta</>
                )}
              </button>

              {/* Troca de modo */}
              <p className="pt-4 text-center text-sm text-text-secondary">
                {isLogin ? 'Ainda não tem acesso?' : 'Já tem uma conta?'}{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  {isLogin ? 'Cadastre-se' : 'Entrar agora'}
                </button>
              </p>
            </motion.form>
          </AnimatePresence>

          {/* Rodapé */}
          <p className="mt-12 text-center text-[11px] text-white/20">
            Uso exclusivo para colaboradores do Grupo DDM.<br />
            Dúvidas? Fale com o time de Automação & IA.
          </p>
        </div>
      </div>
    </div>
  );
}
