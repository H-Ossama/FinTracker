import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform, Share } from 'react-native';

import { localStorageService } from './localStorageService';

export type ExportFormat = 'json' | 'pdf' | 'excel';

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
      const hasExpoSharingNativeModule = !!requireOptionalNativeModule('ExpoSharing');
      if (hasExpoSharingNativeModule) {
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

  private async shareUri(uri: string, mimeType: string, dialogTitle: string) {
    let didShare = false;
    const hasExpoSharingNativeModule = !!requireOptionalNativeModule('ExpoSharing');
    if (hasExpoSharingNativeModule) {
      try {
        const Sharing = await import('expo-sharing');
        if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, { mimeType, dialogTitle });
          didShare = true;
        }
      } catch {
        // ignore; fall back below
      }
    }

    if (!didShare) {
      await Share.share({
        title: dialogTitle,
        message: Platform.OS === 'android' ? uri : 'FinTracker export file created.',
        url: uri,
      });
    }
  }

  async exportAsPdf(): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      // expo-print is a native module; only available in dev-client / EAS builds.
      const hasExpoPrintNativeModule = !!requireOptionalNativeModule('ExpoPrint');
      if (!hasExpoPrintNativeModule) {
        return {
          success: false,
          error: 'PDF export is not available in this runtime. Please use a native build (dev client / production build).',
        };
      }

      const payload = await this.buildExportPayload();

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; padding: 18px; color: #111827; }
              h1 { margin: 0 0 8px; font-size: 18px; }
              .meta { color: #6B7280; font-size: 12px; margin-bottom: 14px; }
              .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
              .row { display: flex; justify-content: space-between; gap: 10px; }
              .k { color: #6B7280; font-size: 12px; }
              .v { font-weight: 700; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 6px; font-size: 11px; text-align: left; }
              th { color: #6B7280; font-weight: 700; }
            </style>
          </head>
          <body>
            <h1>FinTracker Export</h1>
            <div class="meta">Generated: ${payload.exportedAt} • Platform: ${payload.app.platform}</div>

            <div class="card">
              <div class="row">
                <div>
                  <div class="k">Wallets</div>
                  <div class="v">${payload.data.wallets.length}</div>
                </div>
                <div>
                  <div class="k">Transactions</div>
                  <div class="v">${payload.data.transactions.length}</div>
                </div>
                <div>
                  <div class="k">Categories</div>
                  <div class="v">${payload.data.categories.length}</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="k" style="margin-bottom: 8px;">Recent Transactions (first 50)</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  ${payload.data.transactions.slice(0, 50).map((tx: any) => `
                    <tr>
                      <td>${String(tx.date || '').slice(0, 10)}</td>
                      <td>${tx.type || ''}</td>
                      <td>${tx.amount ?? ''}</td>
                      <td>${tx.category || tx.categoryId || ''}</td>
                      <td>${tx.wallet || tx.walletId || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `;

      const Print = await import('expo-print');
      const fileName = `fintracker-export-${payload.exportedAt.replace(/[:.]/g, '-')}.pdf`;
      const result = await Print.printToFileAsync({ html });

      // The printed file already exists at result.uri; attempt to share it.
      await this.shareUri(result.uri, 'application/pdf', 'Export FinTracker Data');

      // Best-effort: also write a copy into cache with stable filename (not strictly required)
      try {
        const out = new File(Paths.cache, fileName);
        // expo-print outputs a file; we keep it as-is if copying isn't supported.
        // (No-op to avoid extra FS dependencies.)
        void out;
      } catch {
        // ignore
      }

      return { success: true, uri: result.uri };
    } catch (e: any) {
      const message = e?.message || String(e);
      return { success: false, error: message };
    }
  }

  async exportAsExcel(): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const payload = await this.buildExportPayload();

      // Ensure Buffer exists for libraries that expect Node-style globals.
      try {
        const { Buffer } = await import('buffer');
        (global as any).Buffer = (global as any).Buffer ?? Buffer;
      } catch {
        // ignore
      }

      // xlsx is a JS library; works in RN with base64 output.
      const XLSX = await import('xlsx');

      const transactions = (payload.data.transactions || []).map((tx: any) => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category: tx.category || tx.categoryId,
        wallet: tx.wallet || tx.walletId,
        note: tx.note || tx.description,
      }));

      const wallets = (payload.data.wallets || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        balance: w.balance,
        currency: w.currency,
        type: w.type,
      }));

      const wb = XLSX.utils.book_new();
      const wsTx = XLSX.utils.json_to_sheet(transactions);
      const wsWallets = XLSX.utils.json_to_sheet(wallets);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');
      XLSX.utils.book_append_sheet(wb, wsWallets, 'Wallets');

      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      const fileName = `fintracker-export-${payload.exportedAt.replace(/[:.]/g, '-')}.xlsx`;
      const file = new File(Paths.cache, fileName);
      file.write(base64, { encoding: 'base64' });
      const uri = file.uri;

      await this.shareUri(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Export FinTracker Data');

      return { success: true, uri };
    } catch (e: any) {
      const message = e?.message || String(e);
      return { success: false, error: message };
    }
  }
}

export const dataExportService = new DataExportService();
export default dataExportService;
