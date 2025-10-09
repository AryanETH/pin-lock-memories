import { supabase } from '@/integrations/supabase/client';

export interface MemoryFile {
  id: string;
  url: string; // Public URL from Supabase Storage
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  name: string;
  timestamp: number;
  storagePath: string; // Path in Supabase Storage
}

export interface AccessLogEntry {
  timestamp: number;
  via: 'pin' | 'share';
}

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  pinHash: string;
  isPublic: boolean;
  shareToken: string | null;
  ownerUserId: string | null;
  files: MemoryFile[];
  createdAt: number;
  updatedAt: number;
  radius: number; // in meters (100-1000)
  accessLog?: AccessLogEntry[];
  failedAttempts?: number;
  lockUntil?: number; // timestamp until which unlock is blocked
}

export async function savePin(pin: Pin): Promise<void> {
  const { error: pinError } = await supabase
    .from('pins')
    .insert({
      id: pin.id,
      user_id: pin.ownerUserId,
      lat: pin.lat,
      lng: pin.lng,
      pin_hash: pin.pinHash,
      name: pin.name,
      is_public: pin.isPublic,
      share_token: pin.shareToken,
      radius: pin.radius,
    });

  if (pinError) throw pinError;

  // Save files
  if (pin.files.length > 0) {
    const fileRecords = pin.files.map(file => ({
      pin_id: pin.id,
      name: file.name,
      type: file.type,
      storage_path: file.storagePath,
    }));

    const { error: filesError } = await supabase
      .from('files')
      .insert(fileRecords);

    if (filesError) throw filesError;
  }
}

export async function getAllPins(): Promise<Pin[]> {
  const { data: pinsData, error: pinsError } = await supabase
    .from('pins')
    .select('*');

  if (pinsError) throw pinsError;
  if (!pinsData) return [];

  // Fetch files for all pins
  const pinIds = pinsData.map(p => p.id);
  const { data: filesData } = await supabase
    .from('files')
    .select('*')
    .in('pin_id', pinIds);

  // Convert to Pin format
  return pinsData.map(p => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    name: p.name,
    pinHash: p.pin_hash,
    isPublic: p.is_public,
    shareToken: p.share_token,
    ownerUserId: p.user_id,
    createdAt: new Date(p.created_at).getTime(),
    updatedAt: new Date(p.updated_at).getTime(),
    radius: p.radius,
    files: (filesData || [])
      .filter(f => f.pin_id === p.id)
      .map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as 'image' | 'video' | 'audio' | 'document',
        mimeType: getMimeTypeFromStoragePath(f.storage_path),
        timestamp: new Date(f.created_at).getTime(),
        storagePath: f.storage_path,
        url: getPublicUrl(f.storage_path),
      })),
  }));
}

export async function deletePin(id: string): Promise<void> {
  // Files will be cascade deleted by database
  const { error } = await supabase
    .from('pins')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPinById(id: string): Promise<Pin | undefined> {
  const { data: pinData, error: pinError } = await supabase
    .from('pins')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (pinError) throw pinError;
  if (!pinData) return undefined;

  const { data: filesData } = await supabase
    .from('files')
    .select('*')
    .eq('pin_id', id);

  return {
    id: pinData.id,
    lat: pinData.lat,
    lng: pinData.lng,
    name: pinData.name,
    pinHash: pinData.pin_hash,
    isPublic: pinData.is_public,
    shareToken: pinData.share_token,
    ownerUserId: pinData.user_id,
    createdAt: new Date(pinData.created_at).getTime(),
    updatedAt: new Date(pinData.updated_at).getTime(),
    radius: pinData.radius,
    files: (filesData || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.type as 'image' | 'video' | 'audio' | 'document',
      mimeType: getMimeTypeFromStoragePath(f.storage_path),
      timestamp: new Date(f.created_at).getTime(),
      storagePath: f.storage_path,
      url: getPublicUrl(f.storage_path),
    })),
  };
}

export async function updatePin(id: string, updates: Partial<Pin>): Promise<void> {
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
  if (updates.shareToken !== undefined) updateData.share_token = updates.shareToken;
  if (updates.radius !== undefined) updateData.radius = updates.radius;

  const { error } = await supabase
    .from('pins')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

export async function getPinByShareToken(token: string): Promise<Pin | undefined> {
  const { data: pinData, error: pinError } = await supabase
    .from('pins')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();

  if (pinError) throw pinError;
  if (!pinData) return undefined;

  const { data: filesData } = await supabase
    .from('files')
    .select('*')
    .eq('pin_id', pinData.id);

  return {
    id: pinData.id,
    lat: pinData.lat,
    lng: pinData.lng,
    name: pinData.name,
    pinHash: pinData.pin_hash,
    isPublic: pinData.is_public,
    shareToken: pinData.share_token,
    ownerUserId: pinData.user_id,
    createdAt: new Date(pinData.created_at).getTime(),
    updatedAt: new Date(pinData.updated_at).getTime(),
    radius: pinData.radius,
    files: (filesData || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.type as 'image' | 'video' | 'audio' | 'document',
      mimeType: getMimeTypeFromStoragePath(f.storage_path),
      timestamp: new Date(f.created_at).getTime(),
      storagePath: f.storage_path,
      url: getPublicUrl(f.storage_path),
    })),
  };
}

export async function logAccess(pinId: string, via: 'pin' | 'share'): Promise<void> {
  // For now, we'll skip access logging to simplify
  // Could be implemented with a separate access_logs table if needed
  console.log(`Access logged for pin ${pinId} via ${via}`);
}

export async function recordFailedAttempt(
  pinId: string, 
  maxAttempts = 5, 
  lockMs = 60_000
): Promise<{ lockedUntil?: number; attempts: number; } | undefined> {
  // For now, we'll implement this client-side only
  // In production, this should be server-side to prevent bypass
  const key = `failed-attempts-${pinId}`;
  const stored = localStorage.getItem(key);
  const data = stored ? JSON.parse(stored) : { attempts: 0, lockUntil: 0 };
  
  data.attempts += 1;
  
  if (data.attempts >= maxAttempts) {
    data.lockUntil = Date.now() + lockMs;
    data.attempts = 0;
  }
  
  localStorage.setItem(key, JSON.stringify(data));
  return { lockedUntil: data.lockUntil || undefined, attempts: data.attempts };
}

export async function clearFailedAttempts(pinId: string): Promise<void> {
  const key = `failed-attempts-${pinId}`;
  localStorage.removeItem(key);
}

export function getOrCreateDeviceId(): string {
  const key = 'geovault-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('memory-files')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

function getMimeTypeFromStoragePath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/x-m4a',
    pdf: 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
