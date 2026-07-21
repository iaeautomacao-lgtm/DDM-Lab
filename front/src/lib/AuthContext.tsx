import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { ADMIN_EMAILS, RH_EMAILS } from './accessConfig';

const DEFAULT_AVATAR_URL = `/avatars/${encodeURIComponent('Acordito_celular.png')}`;
const hasDdmInEmail = (email: string) => email.trim().toLowerCase().includes('ddm');
const isAllowedEmail = (email: string) => hasDdmInEmail(email) || RH_EMAILS.includes(email.trim().toLowerCase());

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  preferredName: string;
  avatarUrl: string;
  role: 'admin' | 'user' | 'rh';
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
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isRH: boolean;
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

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'rh' | null;
  department: string | null;
  unit: string | null;
  job_title: string | null;
  maturity_level: string | null;
  created_at: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfileRow = (row: ProfileRow): UserProfile => ({
  uid: row.id,
  email: row.email,
  displayName: row.full_name || row.email.split('@')[0],
  preferredName: row.preferred_name || row.full_name?.split(' ')[0] || row.email.split('@')[0],
  avatarUrl: row.avatar_url || DEFAULT_AVATAR_URL,
  role: row.role === 'admin' ? 'admin' : row.role === 'rh' ? 'rh' : 'user',
  department: row.department || 'Geral',
  unit: row.unit || 'DDM - São Paulo',
  jobTitle: row.job_title || 'Colaborador',
  maturityLevel: row.maturity_level || 'Iniciante',
  createdAt: row.created_at || new Date().toISOString(),
});

const buildProfilePayload = (user: SupabaseUser, options?: Partial<UserProfile>) => {
  const normalizedEmail = user.email?.trim().toLowerCase() || '';
  const displayName = options?.displayName || user.user_metadata?.full_name || normalizedEmail.split('@')[0];
  const preferredName =
    options?.preferredName || user.user_metadata?.preferred_name || displayName.split(' ')[0] || normalizedEmail.split('@')[0];

  const role = ADMIN_EMAILS.includes(normalizedEmail)
    ? 'admin'
    : RH_EMAILS.includes(normalizedEmail)
    ? 'rh'
    : 'user';

  return {
    id: user.id,
    email: normalizedEmail,
    full_name: displayName,
    preferred_name: preferredName,
    avatar_url: options?.avatarUrl || DEFAULT_AVATAR_URL,
    role,
    department: options?.department || user.user_metadata?.sector || 'Geral',
    unit: options?.unit || 'DDM - São Paulo',
    job_title: options?.jobTitle || user.user_metadata?.job_title || 'Colaborador',
    maturity_level: options?.maturityLevel || 'Iniciante',
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async (sessionUser: SupabaseUser | null) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    const normalizedEmail = sessionUser.email?.trim().toLowerCase() || '';

    if (!isAllowedEmail(normalizedEmail)) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(sessionUser);

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profileError) {
      // Não deixa o app sem nome/perfil por falha de RLS ou rede — usa os dados
      // do próprio auth.users como fallback local e loga o motivo real.
      console.error('Erro ao carregar profile no Supabase (RLS/policies?):', profileError);
      setProfile(mapProfileRow({ ...buildProfilePayload(sessionUser), created_at: null } as ProfileRow));
      return;
    }

    if (existingProfile) {
      const nextProfile = mapProfileRow(existingProfile);
      setProfile(nextProfile);

      const shouldUpgradeToAdmin = nextProfile.role !== 'admin' && ADMIN_EMAILS.includes(normalizedEmail);
      const shouldUpgradeToRH = nextProfile.role === 'user' && RH_EMAILS.includes(normalizedEmail);
      const shouldUpgradeRole = shouldUpgradeToAdmin || shouldUpgradeToRH;

      const hasMissingDefaults =
        !existingProfile.avatar_url ||
        !existingProfile.preferred_name ||
        !existingProfile.unit ||
        !existingProfile.job_title ||
        !existingProfile.maturity_level;

      if (shouldUpgradeRole || hasMissingDefaults) {
        const payload = buildProfilePayload(sessionUser, nextProfile);
        const { error: updateError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        if (!updateError) {
          setProfile(
            mapProfileRow({
              ...(existingProfile as ProfileRow),
              ...(payload as Partial<ProfileRow>),
              role: payload.role as 'admin' | 'user' | 'rh',
            }),
          );
        }
      }
      return;
    }

    const payload = buildProfilePayload(sessionUser);
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (insertError || !insertedProfile) {
      // Trigger de signup ausente + RLS bloqueando INSERT deixavam profile = null
      // (nome sumia e o perfil não salvava). Fallback local mantém o app usável;
      // o conserto definitivo é o script supabase/fix_profiles_trigger_rls.sql.
      console.error('Não foi possível criar o profile no Supabase (trigger/RLS):', insertError);
      setProfile(mapProfileRow({ ...payload, created_at: null } as ProfileRow));
      return;
    }

    setProfile(mapProfileRow(insertedProfile as ProfileRow));
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        await syncProfile(session?.user ?? null);
      } catch (error) {
        console.warn('Supabase session bootstrap failed:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setLoading(true);
      syncProfile(session?.user ?? null)
        .catch((error) => {
          console.warn('Supabase auth sync failed:', error);
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, options: LoginOptions) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!hasDdmInEmail(normalizedEmail)) {
      throw new Error('Use um e-mail DDM para acessar o Lab..');
    }

    if (!options.password.trim()) {
      throw new Error('Informe sua senha para continuar.');
    }

    if (options.isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: options.password,
      });

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: options.password,
      options: {
        data: {
          full_name: options.displayName?.trim() || normalizedEmail.split('@')[0],
          preferred_name:
            options.preferredName?.trim() || options.displayName?.trim().split(' ')[0] || normalizedEmail.split('@')[0],
          sector: options.sector?.trim() || 'Geral',
          job_title: options.jobTitle?.trim() || 'Colaborador',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('Conta criada. Verifique seu e-mail para confirmar o acesso antes de entrar.');
    }
  };

  const rhLogin = async (email: string, password: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!password.trim()) {
      throw new Error('Informe a senha para continuar.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error('E-mail ou senha inválidos. Verifique suas credenciais.');
    }

    // Verifica se o usuário tem role 'rh' ou está na lista de RH
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const allowed = RH_EMAILS.includes(normalizedEmail) || prof?.role === 'rh';

    if (!allowed) {
      await supabase.auth.signOut();
      throw new Error('Acesso restrito ao setor de RH.');
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!hasDdmInEmail(normalizedEmail)) {
      throw new Error('Use um e-mail DDM para recuperar a senha.');
    }

    const redirectTo = `${window.location.origin}/forgot-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

    if (error) {
      throw new Error(error.message);
    }
  };

  const verifyRecoveryCode = async (email: string, token: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    if (!hasDdmInEmail(normalizedEmail)) {
      throw new Error('Use um e-mail DDM para continuar.');
    }

    if (!normalizedToken) {
      throw new Error('Informe o código recebido por e-mail.');
    }

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: 'recovery',
    });

    if (error) {
      throw new Error('Código inválido ou expirado. Solicite um novo código.');
    }
  };

  const updatePassword = async (password: string) => {
    const normalizedPassword = password.trim();

    if (normalizedPassword.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const { error } = await supabase.auth.updateUser({ password: normalizedPassword });

    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'preferredName' | 'avatarUrl' | 'department' | 'unit' | 'jobTitle' | 'maturityLevel'>>
  ) => {
    if (!user) {
      throw new Error('Sessão expirada. Faça login novamente para salvar o perfil.');
    }

    // Se o profile não carregou (linha ausente no banco), reconstrói a base a
    // partir do auth.users para que o salvar funcione mesmo assim.
    const baseProfile = profile ?? mapProfileRow({ ...buildProfilePayload(user), created_at: null } as ProfileRow);

    const nextProfile: UserProfile = {
      ...baseProfile,
      ...updates,
      preferredName:
        updates.preferredName ||
        baseProfile.preferredName ||
        updates.displayName?.split(' ')[0] ||
        baseProfile.displayName?.split(' ')[0] ||
        baseProfile.email.split('@')[0],
    };

    // upsert (e não update): funciona também quando a linha ainda não existe.
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: baseProfile.email,
          role: baseProfile.role,
          full_name: nextProfile.displayName,
          preferred_name: nextProfile.preferredName,
          avatar_url: nextProfile.avatarUrl,
          department: nextProfile.department,
          unit: nextProfile.unit,
          job_title: nextProfile.jobTitle,
          maturity_level: nextProfile.maturityLevel,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    setProfile(mapProfileRow(data as ProfileRow));
  };

  const isAdmin = profile?.role === 'admin';
  const isRH = profile?.role === 'rh';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isRH,
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
