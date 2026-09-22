import { api } from './apiClient';

export interface CreatorImage {
  id: string;
  user_id: string;
  image_url: string;
  optimized_prompt: string | null;
  caption: string | null;
  aspect_ratio: string;
  created_at: string;
}

export const uploadCreatorImage = async (base64DataUrl: string, _userId: string): Promise<string> => {
  const { imageUrl } = await api.post<{ imageUrl: string }>('/creator-images/upload', { dataUrl: base64DataUrl });
  return imageUrl;
};

export const saveCreatorImage = async ({
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
  await api.post('/creator-images', {
    imageUrl,
    optimizedPrompt: optimizedPrompt ?? null,
    caption: caption ?? null,
    aspectRatio: aspectRatio ?? '1:1',
  });
};

export const fetchCreatorImages = async (_userId: string): Promise<CreatorImage[]> => {
  const { images } = await api.get<{ images: CreatorImage[] }>('/creator-images');
  return images;
};

export const deleteCreatorImage = async (imageId: string, _imageUrl: string): Promise<void> => {
  await api.delete(`/creator-images/${imageId}`);
};
