// Nome do arquivo mantido por compatibilidade com os 8 imports existentes —
// o backend agora e a API propria (server/routes.js + MariaDB), nao mais o
// Supabase. Ver front/src/lib/apiClient.ts.
import { api } from './apiClient';
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

const maturityToScore = (maturityLevel: string | null | undefined) => {
  const normalized = String(maturityLevel || '').trim().toLowerCase();

  if (normalized.includes('expert')) return 9.5;
  if (normalized.includes('avanc')) return 8.5;
  if (normalized.includes('intermed')) return 6.5;
  if (normalized.includes('basic') || normalized.includes('basic')) return 3.5;
  return 1.5;
};

const FAVORITES_STORAGE_KEY = 'hub_ddm_favorite_prompts';

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
  const { prompts } = await api.get<{ prompts: Array<Record<string, unknown>> }>('/prompts');
  return prompts.map((row) => ({
    id: String(row.id),
    name: String(row.title || 'Modelo sem titulo'),
    description: String(row.description || 'Sem descricao.'),
    department: String(row.department || 'Marketing') as Template['department'],
    objective: String(row.objective || 'Apoiar a rotina com IA.'),
    complexity: String(row.complexity || 'Basico') as Template['complexity'],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    basePrompt: String(row.base_prompt || ''),
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    popular: Boolean(row.popular),
  })) as Template[];
};

export const fetchUsageLogsByUser = async (_userId: string) => {
  const { logs } = await api.get<{ logs: UsageLogRecord[] }>('/usage-logs');
  return logs;
};

export const deleteUsageLogById = async (logId: string) => {
  await api.delete(`/usage-logs/${logId}`);
};

export const createUsageLog = async ({ promptText, responseText, iaUsed, sector }: CreateUsageLogInput) => {
  await api.post('/usage-logs', { promptText, responseText, iaUsed: iaUsed || 'Acordito', sector: sector || null });
  return true;
};

export const fetchConversationThreads = async (_userId: string) => {
  const { conversations } = await api.get<{ conversations: ConversationRecord[] }>('/conversations');
  return conversations;
};

export const fetchConversationMessages = async (conversationId: string) => {
  const { messages } = await api.get<{ messages: ConversationMessageRecord[] }>(`/conversations/${conversationId}/messages`);
  return messages;
};

export const createConversationThread = async (_userId: string, title: string, currentModel?: string | null) => {
  const { conversation } = await api.post<{ conversation: ConversationRecord }>('/conversations', { title, currentModel: currentModel || null });
  return conversation;
};

export const deleteConversationThread = async (conversationId: string) => {
  await api.delete(`/conversations/${conversationId}`);
};

export const appendConversationMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  modelUsed?: string | null,
  _createdBy?: string | null,
) => {
  const { message } = await api.post<{ message: ConversationMessageRecord }>(`/conversations/${conversationId}/messages`, {
    role,
    content,
    modelUsed: modelUsed || null,
  });
  return message;
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

export const fetchAdminStats = async () => api.get('/admin/stats');

export const fetchInsightsPageData = async (): Promise<InsightsPageData> => api.get('/admin/insights');

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

export const fetchFeedPosts = async (_currentUserId: string): Promise<FeedPost[]> => {
  const { posts } = await api.get<{ posts: FeedPost[] }>('/feed/posts');
  return posts;
};

export const createFeedPost = async (_userId: string, content: string, imageUrl?: string): Promise<FeedPost | null> => {
  try {
    const { post } = await api.post<{ post: Record<string, unknown> }>('/feed/posts', { content, imageUrl: imageUrl || null });
    return {
      ...(post as unknown as FeedPost),
      author_name: '',
      author_avatar: null,
      author_sector: null,
      reaction_count: 0,
      comment_count: 0,
      user_reacted: false,
    };
  } catch {
    return null;
  }
};

export const deleteFeedPost = async (postId: string): Promise<void> => {
  await api.delete(`/feed/posts/${postId}`).catch(() => {});
};

export const toggleFeedReaction = async (postId: string, _userId: string, _currentlyReacted: boolean): Promise<void> => {
  await api.post(`/feed/posts/${postId}/react`);
};

export const fetchFeedComments = async (postId: string): Promise<FeedComment[]> => {
  try {
    const { comments } = await api.get<{ comments: FeedComment[] }>(`/feed/posts/${postId}/comments`);
    return comments;
  } catch {
    return [];
  }
};

export const createFeedComment = async (postId: string, _userId: string, content: string): Promise<void> => {
  await api.post(`/feed/posts/${postId}/comments`, { content });
};

export const deleteFeedComment = async (commentId: string): Promise<void> => {
  await api.delete(`/feed/comments/${commentId}`).catch(() => {});
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

export const fetchCustomPrompts = async (_userId: string): Promise<CustomPromptRecord[]> => {
  const { prompts } = await api.get<{ prompts: CustomPromptRecord[] }>('/custom-prompts');
  return prompts;
};

export const insertCustomPrompt = async (
  _userId: string,
  prompt: Omit<CustomPromptRecord, 'id' | 'user_id' | 'created_at'>,
): Promise<CustomPromptRecord> => {
  const { prompt: created } = await api.post<{ prompt: CustomPromptRecord }>('/custom-prompts', prompt);
  return created;
};

export const deleteCustomPrompt = async (id: string): Promise<void> => {
  await api.delete(`/custom-prompts/${id}`);
};
