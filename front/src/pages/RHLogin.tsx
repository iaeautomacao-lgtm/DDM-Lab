import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Loader2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20';

const LABEL_CLASS = 'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40';

export function RHLogin() {
  const { rhLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await rhLogin(email, password);
      navigate('/rh');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo-ddm.webp" alt="DDM Lab" className="h-9 object-contain mx-auto mb-5" />
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">RH</span>
          </div>
          <h1 className="text-xl font-bold text-white">Painel de Recursos Humanos</h1>
          <p className="text-text-secondary text-sm mt-1.5">
            Acesso restrito ao setor de RH
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>E-mail</label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rh@grupoddm.com.br"
                className={INPUT_CLASS}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Senha</label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLASS}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar no Painel RH'}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary mt-6">
          Plataforma interna do{' '}
          <span className="text-white font-medium">Grupo DDM</span>
        </p>
      </motion.div>
    </div>
  );
}
