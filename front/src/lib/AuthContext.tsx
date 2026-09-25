import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ApiError } from './apiClient';
import { RH_EMAILS, isAllowedDomain } from './accessConfig';

// Checagem local e so uma conveniencia de UX (erro antes de bater na rede) —
// o servidor (ALLOWED_EMAIL_DOMAINS/RH_EMAILS em backend/.env) e quem decide de fato.
const isAllowedEmail = (email: string) => isAllowedDomain(email) || RH_EMAILS.includes(email.trim().toLowerCase());

export interface AppUser {
  id: string;
  email: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  preferredName: string;
  avatarUrl: string;
  role: 'admin' | 'user' | 'rh' | 'gestor' | 'diretor';
  department: string;
  unit: string;
  jobTitle: string;
  maturityLevel: string;
  createdAt: string;
}

interface LoginOptions {
  password: string;
  isLogin: boolean;
  displayName?: string;
  preferredName?: string;
  sector?: string;
  jobTitle?: string;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isRH: boolean;
  /** Diretor ou admin — quem pode ver soluções marcadas como restritas (dados sensíveis). */
  canViewRestricted: boolean;
  login: (email: string, options: LoginOptions) => Promise<void>;
  rhLogin: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryCode: (email: string, token: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<UserProfile, 'displayName' | 'preferredName' | 'avatarUrl' | 'department' | 'unit' | 'jobTitle' | 'maturityLevel'>>
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface SessionResponse {
  user: AppUser;
  profile: UserProfile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = (session: SessionResponse | null) => {
    setUser(session?.user ?? null);
    setProfile(session?.profile ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const session = await api.get<SessionResponse>('/auth/me');
        if (isMounted) applySession(session);
      } catch {
        // Sem sessao valida (cookie ausente/expirado) — usuario deslogado, sem erro visivel.
        if (isMounted) applySession(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, options: LoginOptions) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      throw new Error('Use seu e-mail corporativo DDM para acessar o Lab.');
    }
    if (!options.password.trim()) {
      throw new Error('Informe sua senha para continuar.');
    }

    try {
      const session = options.isLogin
        ? await api.post<SessionResponse>('/auth/login', { email: normalizedEmail, password: options.password })
        : await api.post<SessionResponse>('/auth/register', {
            email: normalizedEmail,
            password: options.password,
            displayName: options.displayName?.trim(),
            preferredName: options.preferredName?.trim(),
            sector: options.sector?.trim(),
            jobTitle: options.jobTitle?.trim(),
          });
      applySession(session);
    } catch (error) {
      throw new Error(error instanceof ApiError ? error.message : 'Nao foi possivel entrar. Tente novamente.');
    }
  };

  const rhLogin = async (email: string, password: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      throw new Error('Use seu e-mail corporativo DDM para acessar o painel de RH.');
    }
    if (!password.trim()) {
      throw new Error('Informe a senha para continuar.');
    }

    try {
      const session = await api.post<SessionResponse>('/auth/rh-login', { email: normalizedEmail, password });
      applySession(session);
    } catch (error) {
      throw new Error(error instanceof ApiError ? error.message : 'Nao foi possivel entrar.');
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      throw new Error('Use seu e-mail corporativo DDM para recuperar a senha.');
    }

    await api.post('/auth/password-reset/request', { email: normalizedEmail }).catch(() => {
      // Resposta identica com ou sem sucesso — nao revela se o e-mail existe.
    });
  };

  const verifyRecoveryCode = async (email: string, token: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    if (!isAllowedEmail(normalizedEmail)) {
      throw new Error('Use seu e-mail corporativo DDM para continuar.');
    }
    if (!normalizedToken) {
      throw new Error('Informe o codigo recebido por e-mail.');
    }

    try {
      await api.post('/auth/password-reset/verify', { email: normalizedEmail, token: normalizedToken });
    } catch (error) {
      throw new Error(
        error instanceof ApiError ? error.message : 'Codigo invalido ou expirado. Solicite um novo codigo.',
      );
    }
  };

  const updatePassword = async (password: string) => {
    const normalizedPassword = password.trim();

    if (normalizedPassword.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    try {
      await api.post('/auth/password-reset/confirm', { password: normalizedPassword });
    } catch (error) {
      throw new Error(error instanceof ApiError ? error.message : 'Nao foi possivel redefinir a senha.');
    }
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    applySession(null);
  };

  const updateProfile = async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'preferredName' | 'avatarUrl' | 'department' | 'unit' | 'jobTitle' | 'maturityLevel'>>
  ) => {
    if (!user) {
      throw new Error('Sessao expirada. Faca login novamente para salvar o perfil.');
    }

    try {
      const { profile: nextProfile } = await api.patch<{ profile: UserProfile }>('/profile', updates);
      setProfile(nextProfile);
    } catch (error) {
      throw new Error(error instanceof ApiError ? error.message : 'Nao foi possivel salvar o perfil.');
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isRH = profile?.role === 'rh';
  const canViewRestricted = isAdmin || profile?.role === 'diretor';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isRH,
        canViewRestricted,
        login,
        rhLogin,
        requestPasswordReset,
        verifyRecoveryCode,
        updatePassword,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
