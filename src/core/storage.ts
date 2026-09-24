/**
 * Storage Engine supporting Dual-Target execution (PWA and Chrome Extension).
 * Utilizes IndexedDB for large audio blobs and transactional consistency,
 * and Platform-specific storage for configuration / preferences.
 */

import { PlatformAdapter } from './platform';

export interface AudioRecord {
  id: string;
  title: string;
  blob: Blob;
  mimeType: string;
  duration: number;
  timestamp: number;
  size: number;
  peaks?: number[];
}

export interface AppSettings {
  ssmlEnforceLimit: boolean;
  noiseSuppression: boolean;
  playbackSpeed: number;
}

const DB_NAME = 'VoiceStudioAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export class StorageService {
  /**
   * Universal key-value getter for preferences and lightweight state.
   */
  public static async get<T>(key: string, defaultValue: T): Promise<T> {
    if (PlatformAdapter.isExtension()) {
      try {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T) ?? defaultValue;
      } catch (err) {
        console.warn('[StorageService] Extension storage read error:', err);
        return defaultValue;
      }
    }

    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Universal key-value setter.
   */
  public static async set<T>(key: string, value: T): Promise<void> {
    if (PlatformAdapter.isExtension()) {
      try {
        await chrome.storage.local.set({ [key]: value });
        return;
      } catch (err) {
        console.warn('[StorageService] Extension storage write error:', err);
      }
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[StorageService] LocalStorage quota exceeded or restricted:', e);
    }
  }

  public static async remove(key: string): Promise<void> {
    if (PlatformAdapter.isExtension()) {
      try {
        await chrome.storage.local.remove(key);
        return;
      } catch (err) {
        console.warn('[StorageService] Extension storage remove error:', err);
      }
    }

    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[StorageService] LocalStorage remove error:', e);
    }
  }
}

export class AudioRecordingRepository {
  private db: IDBDatabase | null = null;

  public async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[AudioRepo] IndexedDB Open Error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async ensureReady(): Promise<IDBDatabase> {
    if (!this.db) {
      return await this.init();
    }
    return this.db;
  }

  public async saveRecording(record: AudioRecord): Promise<AudioRecord> {
    const db = await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllRecordings(): Promise<AudioRecord[]> {
    const db = await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const req = index.getAll();
      req.onsuccess = () => {
        // Sort newest first
        const results = ((req.result as AudioRecord[]) || []).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getRecording(id: string): Promise<AudioRecord | undefined> {
    const db = await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as AudioRecord | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateRecordingTitle(id: string, newTitle: string): Promise<boolean> {
    const db = await this.ensureReady();
    const record = await this.getRecording(id);
    if (!record) return false;
    record.title = newTitle;
    await this.saveRecording(record);
    return true;
  }

  public async deleteRecording(id: string): Promise<boolean> {
    const db = await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAll(): Promise<boolean> {
    const db = await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}

export const StorageManagerHelper = {
  async checkPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  },

  async requestPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  },

  async getEstimate(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return { usage: est.usage || 0, quota: est.quota || 0 };
      } catch {
        return { usage: 0, quota: 0 };
      }
    }
    return { usage: 0, quota: 0 };
  }
};
