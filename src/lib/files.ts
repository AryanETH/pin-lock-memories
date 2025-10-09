import { supabase } from '@/integrations/supabase/client';
import { MemoryFile } from './db';

export async function uploadFileToStorage(
  file: File,
  pinId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  // Check file size (50MB limit from database)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  // Create unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = file.name.split('.').pop();
  const storagePath = `${pinId}/${timestamp}-${randomStr}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('memory-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage
    .from('memory-files')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: data.publicUrl,
  };
}

export async function processFile(
  file: File,
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): Promise<string> {
  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  // For images, compress them
  if (file.type.startsWith('image/')) {
    return compressImage(file);
  }

  // For other files, convert to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedReader = new FileReader();
              compressedReader.readAsDataURL(blob);
              compressedReader.onloadend = () => {
                resolve(compressedReader.result as string);
              };
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export function getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export const ACCEPTED_FILE_TYPES = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/quicktime,video/x-msvideo,video/webm',
  audio: 'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a',
  document: 'application/pdf,.doc,.docx,.txt',
};

export const ALL_ACCEPTED_TYPES = Object.values(ACCEPTED_FILE_TYPES).join(',');
