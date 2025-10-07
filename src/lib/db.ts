import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MemoryFile {
  id: string;
  data: string; // base64 encoded
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  name: string;
  timestamp: number;
}

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  pinHash: string;
  files: MemoryFile[];
  createdAt: number;
  radius: number; // in meters (100-1000)
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

  dbInstance = await openDB<GeoVaultDB>('geovault-db', 1, {
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
