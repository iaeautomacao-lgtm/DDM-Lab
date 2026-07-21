import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Info, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20';

const LABEL_CLASS = 'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40';
type RecoveryStage = 'request' | 'verify' | 'reset';
const RECOVERY_STAGE_KEY = 'ddm_recovery_stage';
const RECOVERY_EMAIL_KEY = 'ddm_recovery_email';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { requestPasswordReset, verifyRecoveryCode, updatePassword, logout } = useAuth();

  const [email, setEmail] = useState(() => window.sessionStorage.getItem(RECOVERY_EMAIL_KEY) || '');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState<RecoveryStage>(() => {
    const savedStage = window.sessionStorage.getItem(RECOVERY_STAGE_KEY);
    return savedStage === 'verify' || savedStage === 'reset' ? savedStage : 'request';
  });
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recoveryInUrl = useMemo(() => {
    const href = window.location.href;
    return href.includes('type=recovery') || href.includes('access_token=');
  }, []);

  useEffect(() => {
    if (recoveryInUrl) {
      window.sessionStorage.setItem(RECOVERY_STAGE_KEY, 'reset');
      setStage('reset');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage('reset');
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [recoveryInUrl]);

  useEffect(() => {
    window.sessionStorage.setItem(RECOVERY_STAGE_KEY, stage);
  }, [stage]);

  useEffect(() => {
    if (email.trim()) {
      window.sessionStorage.setItem(RECOVERY_EMAIL_KEY, email);
      return;
    }

    window.sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
  }, [email]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRequest(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setStage('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a recuperação.');
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingVerify(true);
    setError(null);

    try {
      await verifyRecoveryCode(email, token);
      window.sessionStorage.setItem(RECOVERY_STAGE_KEY, 'reset');
      setStage('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível validar o código.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingReset(true);
    setError(null);

    try {
      if (password.trim().length < 6) {
        throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
      }

      if (password !== confirmPassword) {
        throw new Error('A confirmação da senha não confere.');
      }

      await updatePassword(password);
      window.sessionStorage.removeItem(RECOVERY_STAGE_KEY);
      window.sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
      await logout();
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden flex-col justify-center overflow-hidden border-r border-white/5 bg-[#0D0D0D] p-12 lg:flex lg:w-1/2">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-lg space-y-6">
          <div className="w-36 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2.5 shadow-lg shadow-primary/10">
            <img src="/logo-ddm.webp" alt="Grupo DDM" className="block h-auto w-full object-contain" />
          </div>

          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Recuperação de acesso
          </span>

          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white">
              Redefina sua senha com segurança.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/50">
              Solicite a recuperação pelo e-mail corporativo e conclua a troca da senha com o código recebido ou com o link enviado pelo Supabase.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 w-32 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2.5 lg:hidden">
          <img src="/logo-ddm.webp" alt="Grupo DDM" className="block h-auto w-full object-contain" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar ao login
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-white">Esqueci minha senha</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Informe seu e-mail DDM para receber a recuperação e definir uma nova senha.
            </p>
          </div>

          {stage === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-5">
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

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingRequest}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingRequest ? <Loader2 className="animate-spin" size={18} /> : <Mail size={17} />}
                {loadingRequest ? 'Enviando...' : 'Enviar recuperação'}
              </button>
            </form>
          )}

          {stage === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
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

              <div>
                <label className={LABEL_CLASS}>Código recebido</label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Digite o código"
                    className={INPUT_CLASS}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-secondary">
                <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>Digite o código enviado para o seu e-mail corporativo para continuar a recuperação da senha.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={loadingVerify}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingVerify ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={17} />}
                  {loadingVerify ? 'Validando...' : 'Validar código'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('request');
                    setToken('');
                    setError(null);
                    window.sessionStorage.removeItem(RECOVERY_STAGE_KEY);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full rounded-xl border border-border py-3.5 text-sm font-semibold text-white transition-colors hover:border-primary hover:text-primary"
                >
                  Reenviar e-mail
                </button>
              </div>
            </form>
          )}

          {stage === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className={LABEL_CLASS}>Nova senha</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className={INPUT_CLASS}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={INPUT_CLASS}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-secondary">
                <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>Defina sua nova senha para concluir a recuperação da conta.</span>
              </div>

              <button
                type="submit"
                disabled={loadingReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingReset ? <Loader2 className="animate-spin" size={18} /> : <Lock size={17} />}
                {loadingReset ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
