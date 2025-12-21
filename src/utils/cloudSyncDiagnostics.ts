import AsyncStorage from '@react-native-async-storage/async-storage';

export type CloudSyncDiagLevel = 'info' | 'warn' | 'error';

export interface CloudSyncDiagEntry {
  ts: string;
  level: CloudSyncDiagLevel;
  message: string;
  data?: Record<string, any>;
}

const STORAGE_KEY = 'cloud_sync_diag_logs';
const MAX_ENTRIES = 200;

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const cloudSyncDiagnostics = {
  async append(level: CloudSyncDiagLevel, message: string, data?: Record<string, any>): Promise<void> {
    try {
      const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = safeJsonParse<CloudSyncDiagEntry[]>(existingRaw, []);

      const next: CloudSyncDiagEntry[] = [
        ...existing,
        {
          ts: new Date().toISOString(),
          level,
          message,
          data,
        },
      ].slice(-MAX_ENTRIES);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // never throw from diagnostics
    }
  },

  async getAll(): Promise<CloudSyncDiagEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return safeJsonParse<CloudSyncDiagEntry[]>(raw, []);
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
