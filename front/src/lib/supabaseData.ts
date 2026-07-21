import { supabase } from './supabaseClient';
import type { Template } from '../types';

export interface UsageLogRecord {
  id: string;
  user_id: string | null;
  prompt_text: string;
  response_text: string;
  ia_used: string | null;
  sector: string | null;
  created_at: string | null;
}

interface CreateUsageLogInput {
  userId: string;
  promptText: string;
  responseText: string;
  iaUsed?: string | null;
  sector?: string | null;
}

export interface ConversationRecord {
  id: string;
  user_id: string | null;
  title: string;
  current_model: string | null;
  created_at: string | null;
}

export interface ConversationMessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  created_at: string | null;
}

export interface UserJourneyStats {
  aiScore: number;
  topIA: string;
  totalPrompts: number;
  maturityLevel: string;
  skills: string[];
}

export interface PromptRecord {
  id: string;
  title: string;
  description: string;
  department: string;
  objective: string;
  complexity: string;
  tags: string[];
  base_prompt: string;
  variables: string[];
  popular: boolean;
}

export interface InsightsPersonRow {
  id: string;
  name: string;
  email: string;
  sector: string;
  unit: string;
  prompts: number;
  maturity: string;
}

export interface InsightsPageData {
  summary: {
    avgMaturityScore: number;
    activeUsers: number;
    totalPrompts: number;
    timeSavedHours: number;
  };
  maturityData: Array<{ month: string; level: number }>;
  sectorData: Array<{ name: string; usage: number; color: string }>;
  people: InsightsPersonRow[];
}

type RawPromptRow = Record<string, any>;
type RawLogRow = Record<string, any>;
type RawConversationRow = Record<string, any>;
type RawConversationMessageRow = Record<string, any>;

const FAVORITES_STORAGE_KEY = 'hub_ddm_favorite_prompts';

const maturityToScore = (maturityLevel: string | null | undefined) => {
  const normalized = String(maturityLevel || '').trim().toLowerCase();

  if (normalized.includes('expert')) return 9.5;
  if (normalized.includes('avanc')) return 8.5;
  if (normalized.includes('intermed')) return 6.5;
  if (normalized.includes('basic') || normalized.includes('basic')) return 3.5;
  return 1.5;
};

const sectorColorMap = (sectorName: string) => {
  const normalized = sectorName.trim().toLowerCase();
  if (normalized.includes('marketing')) return '#FF5100';
  if (normalized.includes('vendas') || normalized.includes('comercial')) return '#F59E0B';
  if (normalized.includes('rh')) return '#EC4899';
  if (normalized.includes('jur')) return '#8B5CF6';
  if (normalized.includes('ti')) return '#3B82F6';
  if (normalized.includes('finance')) return '#10B981';
  return '#71717A';
};

const isMissingResourceError = (error: unknown) => {
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('could not find') || message.includes('schema cache');
};

const normalizeStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const mapPromptRow = (row: RawPromptRow): Template => ({
  id: String(row.id),
  name: String(row.title || row.name || 'Modelo sem titulo'),
  description: String(row.description || row.descricao || 'Sem descricao.'),
  department: String(row.department || row.departamento || row.sector || 'Marketing') as Template['department'],
  objective: String(row.objective || row.objetivo || 'Apoiar a rotina com IA.'),
  complexity: String(row.complexity || row.nivel || 'Basico') as Template['complexity'],
  tags: normalizeStringArray(row.tags),
  basePrompt: String(row.base_prompt || row.prompt || row.content || ''),
  variables: normalizeStringArray(row.variables),
  popular: Boolean(row.popular),
});

const mapUsageLogRow = (row: RawLogRow): UsageLogRecord => ({
  id: String(row.id),
  user_id: row.user_id || row.usuario_id || row.criado_por || null,
  prompt_text: String(row.prompt_text || row.prompt || ''),
  response_text: String(row.response_text || row.resposta || ''),
  ia_used: row.ia_used || row.ferramenta || row.modelo_usado || null,
  sector: row.sector || row.department || row.setor || null,
  created_at: row.created_at || row.criado_em || null,
});

const mapConversationRow = (row: RawConversationRow): ConversationRecord => ({
  id: String(row.id),
  user_id: row.criado_por || null,
  title: String(row.titulo || 'Nova conversa'),
  current_model: row.modelo_atual || null,
  created_at: row.created_at || null,
});

const mapConversationMessageRow = (row: RawConversationMessageRow): ConversationMessageRecord => ({
  id: String(row.id),
  conversation_id: String(row.conversa_id),
  role: String(row.role || 'assistant').toLowerCase() === 'user' ? 'user' : 'assistant',
  content: String(row.conteudo || ''),
  model_used: row.modelo_usado || null,
  created_at: row.created_at || null,
});

const readFavoritePrompts = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]') as string[];
  } catch {
    return [] as string[];
  }
};

const writeFavoritePrompts = (favorites: string[]) => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

export const fetchFavoritePrompts = async () => readFavoritePrompts();

export const addFavoritePrompt = async (prompt: string) => {
  const favorites = readFavoritePrompts();
  if (!favorites.includes(prompt)) {
    writeFavoritePrompts([...favorites, prompt]);
  }
};

export const removeFavoritePrompt = async (prompt: string) => {
  const favorites = readFavoritePrompts().filter((item) => item !== prompt);
  writeFavoritePrompts(favorites);
};

export const fetchPromptTemplates = async () => {
  const { data, error } = await supabase.from('prompts').select('*').order('title', { ascending: true });

  if (error) {
    if (isMissingResourceError(error)) return [] as Template[];
    throw error;
  }

  return (data || []).map((row) => mapPromptRow(row));
};

export const fetchUsageLogsByUser = async (userId: string) => {
  const fetchByColumn = async (column: 'user_id' | 'usuario_id' | 'criado_por') => {
    const { data, error } = await supabase
      .from('logs_uso_ia')
      .select('*')
      .eq(column, userId)
      .order('created_at', { ascending: false });

    return { data, error };
  };

  const attempts = [
    await fetchByColumn('user_id'),
    await fetchByColumn('usuario_id'),
    await fetchByColumn('criado_por'),
  ];

  for (const attempt of attempts) {
    if (!attempt.error) {
      return (attempt.data || []).map((row) => mapUsageLogRow(row));
    }
  }

  const firstRealError = attempts.find((attempt) => attempt.error && !isMissingResourceError(attempt.error))?.error;
  if (firstRealError) throw firstRealError;

  return [] as UsageLogRecord[];
};

export const deleteUsageLogById = async (logId: string) => {
  const { error } = await supabase.from('logs_uso_ia').delete().eq('id', logId);
  if (error && !isMissingResourceError(error)) throw error;
};

export const createUsageLog = async ({
  userId,
  promptText,
  responseText,
  iaUsed,
  sector,
}: CreateUsageLogInput) => {
  const candidatePayloads = [
    {
      user_id: userId,
      prompt_text: promptText,
      response_text: responseText,
      ia_used: iaUsed || 'Acordito',
      sector: sector || null,
    },
    {
      usuario_id: userId,
      prompt: promptText,
      resposta: responseText,
      ferramenta: iaUsed || 'Acordito',
      setor: sector || null,
    },
    {
      criado_por: userId,
      prompt: promptText,
      resposta: responseText,
      modelo_usado: iaUsed || 'Acordito',
      setor: sector || null,
    },
  ];

  let lastError: unknown = null;

  for (const payload of candidatePayloads) {
    const { error } = await supabase.from('logs_uso_ia').insert(payload);

    if (!error) {
      return true;
    }

    const message = String(error.message || '').toLowerCase();
    const looksLikeSchemaMismatch =
      message.includes('column') ||
      message.includes('schema cache') ||
      message.includes('could not find') ||
      message.includes('does not exist');

    if (!looksLikeSchemaMismatch && !isMissingResourceError(error)) {
      throw error;
    }

    lastError = error;
  }

  if (lastError && !isMissingResourceError(lastError)) {
    throw lastError;
  }

  return null;
};

export const fetchConversationThreads = async (userId: string) => {
  const { data, error } = await supabase
    .from('conversas')
    .select('*')
    .eq('criado_por', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingResourceError(error)) return [] as ConversationRecord[];
    throw error;
  }

  return (data || []).map((row) => mapConversationRow(row));
};

export const fetchConversationMessages = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('conversa_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingResourceError(error)) return [] as ConversationMessageRecord[];
    throw error;
  }

  return (data || []).map((row) => mapConversationMessageRow(row));
};

export const createConversationThread = async (userId: string, title: string, currentModel?: string | null) => {
  const { data, error } = await supabase
    .from('conversas')
    .insert({
      titulo: title,
      modelo_atual: currentModel || null,
      criado_por: userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingResourceError(error)) return null;
    throw error;
  }

  return mapConversationRow(data);
};

export const deleteConversationThread = async (conversationId: string) => {
  const { error } = await supabase.from('conversas').delete().eq('id', conversationId);

  if (error) {
    if (isMissingResourceError(error)) return;
    throw error;
  }
};

export const appendConversationMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  modelUsed?: string | null,
  createdBy?: string | null,
) => {
  const { data, error } = await supabase
    .from('mensagens')
    .insert({
      conversa_id: conversationId,
      role,
      conteudo: content,
      modelo_usado: modelUsed || null,
      criado_por: createdBy || null,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingResourceError(error)) return null;
    throw error;
  }

  return mapConversationMessageRow(data);
};

export const fetchUserJourneyStats = async (userId: string, maturityLevel?: string) => {
  const logs = await fetchUsageLogsByUser(userId);
  const iaCounts = new Map<string, number>();
  const sectorCounts = new Map<string, number>();

  logs.forEach((log) => {
    if (log.ia_used) {
      iaCounts.set(log.ia_used, (iaCounts.get(log.ia_used) || 0) + 1);
    }

    if (log.sector) {
      sectorCounts.set(log.sector, (sectorCounts.get(log.sector) || 0) + 1);
    }
  });

  const topIAEntry = Array.from(iaCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const skills = Array.from(sectorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sector]) => sector);

  const resolvedMaturity = maturityLevel || 'Iniciante';

  return {
    aiScore: maturityToScore(resolvedMaturity),
    topIA: topIAEntry?.[0] || '',
    totalPrompts: logs.length,
    maturityLevel: resolvedMaturity,
    skills,
  } as UserJourneyStats;
};

export const fetchAdminStats = async () => {
  const { count: totalUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (usersError && !isMissingResourceError(usersError)) throw usersError;

  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, department, maturity_level');
  if (profilesError && !isMissingResourceError(profilesError)) throw profilesError;

  const { data: usageLogs, count: totalPrompts, error: logsError } = await supabase
    .from('logs_uso_ia')
    .select('*', { count: 'exact' });

  if (logsError && !isMissingResourceError(logsError)) throw logsError;

  const mappedLogs = (usageLogs || []).map((row) => mapUsageLogRow(row));
  const activeUserIds = new Set<string>();
  const sectorCounts = new Map<string, number>();
  const iaCounts = new Map<string, number>();
  const maturityScores = (profiles || []).map((profile: any) => maturityToScore(profile.maturity_level));

  mappedLogs.forEach((item) => {
    if (item.user_id) activeUserIds.add(item.user_id);
    if (item.sector) sectorCounts.set(item.sector, (sectorCounts.get(item.sector) || 0) + 1);
    if (item.ia_used) iaCounts.set(item.ia_used, (iaCounts.get(item.ia_used) || 0) + 1);
  });

  if (mappedLogs.length === 0 && profiles?.length) {
    profiles.forEach((profile: any) => {
      const department = profile.department || 'Geral';
      sectorCounts.set(department, (sectorCounts.get(department) || 0) + 1);
    });
  }

  return {
    totalUsers: totalUsers || 0,
    totalPrompts: totalPrompts || 0,
    activeUsers: activeUserIds.size,
    avgMaturityScore: maturityScores.length
      ? Number((maturityScores.reduce((total, score) => total + score, 0) / maturityScores.length).toFixed(1))
      : 0,
    sectorUsage: Array.from(sectorCounts.entries()).map(([name, value]) => ({ name, value })),
    iaUsage: Array.from(iaCounts.entries()).map(([name, value]) => ({ name, value })),
    recentInteractions: mappedLogs,
  };
};

export const fetchInsightsPageData = async (): Promise<InsightsPageData> => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department, unit, maturity_level');

  if (profilesError && !isMissingResourceError(profilesError)) throw profilesError;

  const { data: logs, error: logsError } = await supabase
    .from('logs_uso_ia')
    .select('id, user_id, ia_used, sector, created_at');

  if (logsError && !isMissingResourceError(logsError)) throw logsError;

  const profileList = profiles || [];
  const logList = (logs || []).map((row) => mapUsageLogRow(row));
  const profileById = new Map(profileList.map((profile: any) => [profile.id, profile]));
  const activeUserIds = new Set(logList.map((log) => log.user_id).filter(Boolean) as string[]);
  const avgMaturityScore = profileList.length
    ? Number(
        (
          profileList.reduce((total: number, profile: any) => total + maturityToScore(profile.maturity_level), 0) /
          profileList.length
        ).toFixed(1)
      )
    : 0;

  const sectorCounts = new Map<string, number>();
  logList.forEach((log) => {
    const sector = log.sector || 'Geral';
    sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);
  });

  const sectorData = Array.from(sectorCounts.entries())
    .map(([name, usage]) => ({ name, usage, color: sectorColorMap(name) }))
    .sort((a, b) => b.usage - a.usage);

  const monthlyBuckets = new Map<string, { total: number; count: number }>();
  logList.forEach((log) => {
    if (!log.created_at || !log.user_id) return;
    const date = new Date(log.created_at);
    const month = date.toLocaleDateString('pt-BR', { month: 'short' });
    const maturity = maturityToScore(profileById.get(log.user_id)?.maturity_level);
    const current = monthlyBuckets.get(month) || { total: 0, count: 0 };
    monthlyBuckets.set(month, { total: current.total + maturity, count: current.count + 1 });
  });

  const maturityData = Array.from(monthlyBuckets.entries()).map(([month, data]) => ({
    month,
    level: Number((data.total / data.count).toFixed(1)),
  }));

  const promptCountByUser = new Map<string, number>();
  logList.forEach((log) => {
    if (log.user_id) {
      promptCountByUser.set(log.user_id, (promptCountByUser.get(log.user_id) || 0) + 1);
    }
  });

  const people = profileList
    .map((profile: any) => ({
      id: String(profile.id),
      name: String(profile.full_name || profile.email?.split('@')[0] || 'Colaborador'),
      email: String(profile.email || ''),
      sector: String(profile.department || 'Geral'),
      unit: String(profile.unit || 'DDM - São Paulo'),
      prompts: promptCountByUser.get(profile.id) || 0,
      maturity: String(profile.maturity_level || 'Iniciante'),
    }))
    .sort((a, b) => b.prompts - a.prompts);

  return {
    summary: {
      avgMaturityScore,
      activeUsers: activeUserIds.size,
      totalPrompts: logList.length,
      timeSavedHours: logList.length * 0.25,
    },
    maturityData,
    sectorData,
    people,
  };
};

// ── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_sector: string | null;
  reaction_count: number;
  comment_count: number;
  user_reacted: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export const fetchFeedPosts = async (currentUserId: string): Promise<FeedPost[]> => {
  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('id, user_id, content, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !posts) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, department');

  const { data: reactions } = await supabase
    .from('feed_reactions')
    .select('post_id, user_id');

  const { data: comments } = await supabase
    .from('feed_comments')
    .select('post_id');

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return posts.map((post: any) => {
    const profile = profileMap.get(post.user_id) as any;
    const postReactions = (reactions || []).filter((r: any) => r.post_id === post.id);
    const postComments = (comments || []).filter((c: any) => c.post_id === post.id);
    return {
      ...post,
      author_name: profile?.full_name || 'Colaborador DDM',
      author_avatar: profile?.avatar_url || null,
      author_sector: profile?.department || null,
      reaction_count: postReactions.length,
      comment_count: postComments.length,
      user_reacted: postReactions.some((r: any) => r.user_id === currentUserId),
    };
  });
};

export const createFeedPost = async (userId: string, content: string, imageUrl?: string): Promise<FeedPost | null> => {
  const { data, error } = await supabase
    .from('feed_posts')
    .insert({ user_id: userId, content, image_url: imageUrl || null })
    .select()
    .single();

  if (error || !data) return null;
  return { ...data, author_name: '', author_avatar: null, author_sector: null, reaction_count: 0, comment_count: 0, user_reacted: false };
};

export const deleteFeedPost = async (postId: string): Promise<void> => {
  await supabase.from('feed_posts').delete().eq('id', postId);
};

export const toggleFeedReaction = async (postId: string, userId: string, currentlyReacted: boolean): Promise<void> => {
  if (currentlyReacted) {
    await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('feed_reactions').insert({ post_id: postId, user_id: userId }).select();
  }
};

export const fetchFeedComments = async (postId: string): Promise<FeedComment[]> => {
  const { data: comments, error } = await supabase
    .from('feed_comments')
    .select('id, post_id, user_id, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !comments) return [];

  const userIds = [...new Set(comments.map((c: any) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return comments.map((c: any) => {
    const profile = profileMap.get(c.user_id) as any;
    return { ...c, author_name: profile?.full_name || 'Colaborador DDM', author_avatar: profile?.avatar_url || null };
  });
};

export const createFeedComment = async (postId: string, userId: string, content: string): Promise<void> => {
  await supabase.from('feed_comments').insert({ post_id: postId, user_id: userId, content });
};

export const deleteFeedComment = async (commentId: string): Promise<void> => {
  await supabase.from('feed_comments').delete().eq('id', commentId);
};

// ─── Custom prompts (prompts_customizados) ────────────────────────────────────

export interface CustomPromptRecord {
  id: string;
  user_id: string;
  title: string;
  department: string;
  tone: string;
  purpose: string;
  prompt_text: string;
  created_at: string;
}

export const fetchCustomPrompts = async (userId: string): Promise<CustomPromptRecord[]> => {
  const { data, error } = await supabase
    .from('prompts_customizados')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomPromptRecord[];
};

export const insertCustomPrompt = async (
  userId: string,
  prompt: Omit<CustomPromptRecord, 'id' | 'user_id' | 'created_at'>,
): Promise<CustomPromptRecord> => {
  const { data, error } = await supabase
    .from('prompts_customizados')
    .insert({ user_id: userId, ...prompt })
    .select()
    .single();
  if (error) throw error;
  return data as CustomPromptRecord;
};

export const deleteCustomPrompt = async (id: string): Promise<void> => {
  const { error } = await supabase.from('prompts_customizados').delete().eq('id', id);
  if (error) throw error;
};
