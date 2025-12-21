import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { localStorageService } from './localStorageService';

export type ExportFormat = 'json';

export type ExportPayload = {
  exportedAt: string;
  app: {
    name: string;
    version?: string;
    platform: string;
  };
  data: {
    wallets: any[];
    transactions: any[];
    categories: any[];
    goals: any[];
    budgets: any[];
    bills: any[];
    reminders: any[];
    settings: {
      appSettings: any | null;
      notificationPreferences: any | null;
    };
  };
};

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

class DataExportService {
  async buildExportPayload(): Promise<ExportPayload> {
    const [
      wallets,
      transactions,
      categories,
      goalsData,
      budgetData,
      billsData,
      remindersData,
      appSettings,
      notificationPreferences,
    ] = await Promise.all([
      localStorageService.getWallets(),
      localStorageService.getTransactions(),
      localStorageService.getCategories(),
      AsyncStorage.getItem('goals_data'),
      AsyncStorage.getItem('budget_data'),
      AsyncStorage.getItem('bills_data'),
      AsyncStorage.getItem('reminders_data'),
      AsyncStorage.getItem('app_settings'),
      AsyncStorage.getItem('notification_preferences'),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      app: {
        name: 'FinTracker',
        platform: Platform.OS,
      },
      data: {
        wallets: wallets || [],
        transactions: transactions || [],
        categories: categories || [],
        goals: safeJsonParse(goalsData, [] as any[]),
        budgets: safeJsonParse(budgetData, [] as any[]),
        bills: safeJsonParse(billsData, [] as any[]),
        reminders: safeJsonParse(remindersData, [] as any[]),
        settings: {
          appSettings: safeJsonParse(appSettings, null as any),
          notificationPreferences: safeJsonParse(notificationPreferences, null as any),
        },
      },
    };
  }

  async exportAsJson(): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const payload = await this.buildExportPayload();
      const json = JSON.stringify(payload, null, 2);

      const fileName = `fintracker-export-${payload.exportedAt.replace(/[:.]/g, '-')}.json`;
      const file = new File(Paths.cache, fileName);
      file.write(json, { encoding: 'utf8' });
      const uri = file.uri;

      // Prefer native share sheet with file attachment (when available).
      // Note: On some runtimes (e.g., Expo Go / stale native builds), expo-sharing may not be present.
      let didShare = false;
      try {
        const Sharing = await import('expo-sharing');
        if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export FinTracker Data',
          });
          didShare = true;
        }
      } catch {
        // ignore; fall back below
      }

      if (!didShare) {
        // Fallback: RN Share (may not attach file on all Android builds)
        await Share.share({
          title: 'Export FinTracker Data',
          message: Platform.OS === 'android' ? uri : 'FinTracker export file created.',
          url: uri,
        });
      }

      return { success: true, uri };
    } catch (e: any) {
      const message = e?.message || String(e);
      return { success: false, error: message };
    }
  }
}

export const dataExportService = new DataExportService();
export default dataExportService;
