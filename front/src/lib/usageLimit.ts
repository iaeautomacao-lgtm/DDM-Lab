import { supabase } from './supabaseClient';

export const IMAGE_DAILY_LIMIT = 20;
export const TEXT_TOKEN_DAILY_LIMIT = 60_000;

export interface DailyUsage {
  imageCount: number;
  textTokens: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const getDailyUsage = async (userId: string): Promise<DailyUsage> => {
  const { data } = await supabase
    .from('daily_usage')
    .select('image_count, text_tokens')
    .eq('user_id', userId)
    .eq('date', todayStr())
    .maybeSingle();
  return { imageCount: data?.image_count ?? 0, textTokens: data?.text_tokens ?? 0 };
};

const upsertUsage = async (userId: string, deltaImages: number, deltaTokens: number): Promise<void> => {
  const { data } = await supabase
    .from('daily_usage')
    .select('image_count, text_tokens')
    .eq('user_id', userId)
    .eq('date', todayStr())
    .maybeSingle();

  if (data) {
    await supabase
      .from('daily_usage')
      .update({
        image_count: data.image_count + deltaImages,
        text_tokens: data.text_tokens + deltaTokens,
      })
      .eq('user_id', userId)
      .eq('date', todayStr());
  } else {
    await supabase.from('daily_usage').insert({
      user_id: userId,
      date: todayStr(),
      image_count: deltaImages,
      text_tokens: deltaTokens,
    });
  }
};

export const incrementImageCount = (userId: string, count = 1) =>
  upsertUsage(userId, count, 0);

export const incrementTextTokens = (userId: string, tokens: number) =>
  upsertUsage(userId, 0, tokens);
