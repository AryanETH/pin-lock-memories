import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MemoryFile {
  id: string;
  data: string; // base64 encoded
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  name: string;
  timestamp: number;
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
  ownerUserId: string;
  files: MemoryFile[];
  createdAt: number;
  updatedAt: number;
  radius: number; // in meters (100-1000)
  accessLog?: AccessLogEntry[];
  failedAttempts?: number;
  lockUntil?: number; // timestamp until which unlock is blocked
}

interface GeoVaultDB extends DBSchema {
  pins: {
    key: string;
    value: Pin;
  };
}

let dbInstance: IDBPDatabase<GeoVaultDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<GeoVaultDB>> {
  if (dbInstance) return dbInstance;

  // Bump version to allow future migrations if needed
  dbInstance = await openDB<GeoVaultDB>('geovault-db', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pins')) {
        db.createObjectStore('pins', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function savePin(pin: Pin): Promise<void> {
  const db = await initDB();
  await db.put('pins', pin);
}

export async function getAllPins(): Promise<Pin[]> {
  const db = await initDB();
  return db.getAll('pins');
}

export async function deletePin(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('pins', id);
}

export async function getPinById(id: string): Promise<Pin | undefined> {
  const db = await initDB();
  return db.get('pins', id);
}

export async function updatePin(id: string, updates: Partial<Pin>): Promise<void> {
  const db = await initDB();
  const existing = await db.get('pins', id);
  if (!existing) return;
  const updated: Pin = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };
  await db.put('pins', updated);
}

export async function getPinByShareToken(token: string): Promise<Pin | undefined> {
  const db = await initDB();
  const all = await db.getAll('pins');
  return all.find((p) => p.shareToken === token);
}

export async function logAccess(pinId: string, via: 'pin' | 'share'): Promise<void> {
  const db = await initDB();
  const existing = await db.get('pins', pinId);
  if (!existing) return;
  const logEntry: AccessLogEntry = { timestamp: Date.now(), via };
  const accessLog = Array.isArray(existing.accessLog) ? existing.accessLog.slice() : [];
  accessLog.push(logEntry);
  await db.put('pins', { ...existing, accessLog, updatedAt: Date.now() });
}

export async function recordFailedAttempt(pinId: string, maxAttempts = 5, lockMs = 60_000): Promise<{ lockedUntil?: number; attempts: number; } | undefined> {
  const db = await initDB();
  const existing = await db.get('pins', pinId);
  if (!existing) return;
  const attempts = (existing.failedAttempts || 0) + 1;
  const update: Partial<Pin> = { failedAttempts: attempts };
  if (attempts >= maxAttempts) {
    update.lockUntil = Date.now() + lockMs;
    update.failedAttempts = 0; // reset counter after lock
  }
  await updatePin(pinId, update);
  const lockedUntil = (update.lockUntil || existing.lockUntil) as number | undefined;
  return { lockedUntil, attempts: update.failedAttempts ?? attempts };
}

export async function clearFailedAttempts(pinId: string): Promise<void> {
  await updatePin(pinId, { failedAttempts: 0, lockUntil: undefined });
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
