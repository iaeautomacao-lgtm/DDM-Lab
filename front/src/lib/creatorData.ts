import { supabase } from './supabaseClient';

export interface CreatorImage {
  id: string;
  user_id: string;
  image_url: string;
  optimized_prompt: string | null;
  caption: string | null;
  aspect_ratio: string;
  created_at: string;
}

export const uploadCreatorImage = async (base64DataUrl: string, userId: string): Promise<string> => {
  const mimeType = base64DataUrl.split(';')[0].split(':')[1] || 'image/png';
  const ext = mimeType.split('/')[1] || 'png';
  const base64Data = base64DataUrl.split(',')[1];
  const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: mimeType });
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('creator-images')
    .upload(filePath, blob, { contentType: mimeType, upsert: false });
  if (error) throw error;

  return supabase.storage.from('creator-images').getPublicUrl(filePath).data.publicUrl;
};

export const saveCreatorImage = async ({
  userId,
  imageUrl,
  optimizedPrompt,
  caption,
  aspectRatio,
}: {
  userId: string;
  imageUrl: string;
  optimizedPrompt?: string;
  caption?: string;
  aspectRatio?: string;
}): Promise<void> => {
  const { error } = await supabase.from('creator_images').insert({
    user_id: userId,
    image_url: imageUrl,
    optimized_prompt: optimizedPrompt ?? null,
    caption: caption ?? null,
    aspect_ratio: aspectRatio ?? '1:1',
  });
  if (error) throw error;
};

export const fetchCreatorImages = async (userId: string): Promise<CreatorImage[]> => {
  const { data, error } = await supabase
    .from('creator_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
};

export const deleteCreatorImage = async (imageId: string, imageUrl: string): Promise<void> => {
  const parts = imageUrl.split('/creator-images/');
  if (parts.length > 1) {
    await supabase.storage.from('creator-images').remove([parts[1]]).catch(() => {});
  }
  const { error } = await supabase.from('creator_images').delete().eq('id', imageId);
  if (error) throw error;
};
