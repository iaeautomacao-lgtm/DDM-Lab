import { api } from './apiClient';

export const IMAGE_DAILY_LIMIT = 20;
export const TEXT_TOKEN_DAILY_LIMIT = 60_000;

export interface DailyUsage {
  imageCount: number;
  textTokens: number;
}

export const getDailyUsage = async (_userId: string): Promise<DailyUsage> => {
  const { imageCount, textTokens } = await api.get<DailyUsage>('/daily-usage');
  return { imageCount, textTokens };
};

const incrementUsage = (images: number, tokens: number) => api.post('/daily-usage/increment', { images, tokens });

export const incrementImageCount = (_userId: string, count = 1) => incrementUsage(count, 0);

export const incrementTextTokens = (_userId: string, tokens: number) => incrementUsage(0, tokens);
