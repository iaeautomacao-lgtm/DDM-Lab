import { api } from './apiClient';

export interface MissionProgressSnapshot {
  completedMissionIds: string[];
  totalXp: number;
  savedMinutes: number;
  badges: string[];
}

export interface MissionRewardPayload {
  id: string;
  xp: number;
  badge: string;
  savedMinutes: number;
}

// ── Helpers locais (localStorage como fallback offline) ───────────────────────

const getStorageKey = (userId: string) => `ddm-mission-progress:${userId}`;

export const emptySnapshot = (): MissionProgressSnapshot => ({
  completedMissionIds: [],
  totalXp: 0,
  savedMinutes: 0,
  badges: [],
});

const readLocal = (userId: string): MissionProgressSnapshot => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return emptySnapshot();

    const parsed = JSON.parse(raw) as Partial<MissionProgressSnapshot> | string[];
    if (Array.isArray(parsed)) return { ...emptySnapshot(), completedMissionIds: parsed };

    return {
      completedMissionIds: parsed.completedMissionIds || [],
      totalXp: parsed.totalXp || 0,
      savedMinutes: parsed.savedMinutes || 0,
      badges: parsed.badges || [],
    };
  } catch {
    return emptySnapshot();
  }
};

const writeLocal = (userId: string, snapshot: MissionProgressSnapshot) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
  } catch {}
};

// ── API ────────────────────────────────────────────────────────────────────

const upsertProgress = async (snapshot: MissionProgressSnapshot) => {
  await api.put('/progress', {
    completedMissionIds: snapshot.completedMissionIds,
    totalXp: snapshot.totalXp,
    savedMinutes: snapshot.savedMinutes,
    badges: snapshot.badges,
  });
};

/**
 * Busca progresso da API. Faz migração do localStorage se for o primeiro acesso.
 * Em caso de erro de rede, retorna dados do localStorage.
 */
export const getMissionProgressAsync = async (userId: string): Promise<MissionProgressSnapshot> => {
  try {
    const { progress } = await api.get<{ progress: MissionProgressSnapshot | null }>('/progress');

    if (progress) {
      writeLocal(userId, progress);
      return progress;
    }

    // Sem registro no DB (ex: após reset admin) — limpa cache local e retorna vazio
    writeLocal(userId, emptySnapshot());
    return emptySnapshot();
  } catch {
    return readLocal(userId);
  }
};

/**
 * Registra conclusão de missão na API (e localStorage como backup).
 * Idempotente — ignora se a missão já foi concluída.
 */
export const completeMissionProgressAsync = async (
  userId: string,
  mission: MissionRewardPayload,
): Promise<MissionProgressSnapshot> => {
  const current = await getMissionProgressAsync(userId);

  if (current.completedMissionIds.includes(mission.id)) return current;

  const next: MissionProgressSnapshot = {
    completedMissionIds: [...current.completedMissionIds, mission.id],
    totalXp: current.totalXp + mission.xp,
    savedMinutes: current.savedMinutes + mission.savedMinutes,
    badges: current.badges.includes(mission.badge) ? current.badges : [...current.badges, mission.badge],
  };

  writeLocal(userId, next); // salva imediatamente no localStorage
  await upsertProgress(next).catch(() => {}); // persiste na API (fail-safe)

  return next;
};

// ── Funções síncronas mantidas para compatibilidade ──────────────────────────

/** @deprecated Use getMissionProgressAsync */
export const getMissionProgress = (userId?: string | null): MissionProgressSnapshot => {
  if (!userId) return emptySnapshot();
  return readLocal(userId);
};

/** @deprecated Use completeMissionProgressAsync */
export const completeMissionProgress = (userId: string, mission: MissionRewardPayload) => {
  const current = readLocal(userId);
  if (current.completedMissionIds.includes(mission.id)) return current;
  const next: MissionProgressSnapshot = {
    completedMissionIds: [...current.completedMissionIds, mission.id],
    totalXp: current.totalXp + mission.xp,
    savedMinutes: current.savedMinutes + mission.savedMinutes,
    badges: current.badges.includes(mission.badge) ? current.badges : [...current.badges, mission.badge],
  };
  writeLocal(userId, next);
  return next;
};

// ── Ranking global de setores ─────────────────────────────────────────────────

export interface SectorRankingEntry {
  sector: string;
  completed: number;
  total: number;
  adoption: number;
}

/**
 * Busca da API o ranking coletivo de setores (todos os colaboradores).
 * @param missions lista de missões com id e sector para fazer o mapeamento
 */
export const fetchGlobalSectorRanking = async (
  missions: Array<{ id: string; sector: string }>,
): Promise<SectorRankingEntry[]> => {
  const { rows } = await api.get<{ rows: Array<{ mission_id: string; completion_count: number }> }>(
    '/progress/sector-ranking',
  );

  const countByMission: Record<string, number> = {};
  for (const row of rows) {
    countByMission[row.mission_id] = Number(row.completion_count);
  }

  const bySector: Record<string, { completed: number; total: number }> = {};
  for (const mission of missions) {
    if (!bySector[mission.sector]) bySector[mission.sector] = { completed: 0, total: 0 };
    bySector[mission.sector].total += 1;
    bySector[mission.sector].completed += countByMission[mission.id] || 0;
  }

  return Object.entries(bySector)
    .map(([sector, { completed, total }]) => ({
      sector,
      completed,
      total,
      adoption: Math.round((completed / total) * 100),
    }))
    .filter((s) => s.completed > 0)
    .sort((a, b) => b.adoption - a.adoption)
    .slice(0, 3);
};

// ── Utilitários ───────────────────────────────────────────────────────────────

export const getMissionRankLabel = (xp: number) => {
  if (xp >= 4000) return 'Mestre do DDM Lab';
  if (xp >= 2500) return 'Líder de Automação Inteligente';
  if (xp >= 1500) return 'Arquiteto de Processos com IA';
  if (xp >= 800) return 'Especialista de Eficiência';
  if (xp >= 300) return 'Operador de IA';
  return 'Aspirante a Prompt Engineer';
};

export const formatSavedTime = (minutes: number) => {
  if (minutes <= 0) return '0min';
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours <= 0) return `${rem}min`;
  return `${hours}h${String(rem).padStart(2, '0')}min`;
};
