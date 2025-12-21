import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser } from './googleAuthService';
import { syncProgressService } from './syncProgressService';
import { notificationService } from './notificationService';
import { hybridDataService } from './hybridDataService';
import { getBackendApiBaseUrl, getBackendApiRoot } from '../config/apiConfig';
import { backendAuthService } from './backendAuthService';
import { cloudSyncDiagnostics } from '../utils/cloudSyncDiagnostics';
import { Buffer } from 'buffer';


export interface UserDataBackup {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    createdAt: string;
    lastLogin: string;
    preferences: any;
  };
  appData: {
    wallets: any[];
    transactions: any[];
    budgets: any[];
    goals: any[];
    bills: any[];
    reminders: any[];
    categories: any[];
    settings: any;
    insights: any;
  };
  metadata: {
    version: string;
    lastSync: string;
    platform: string;
    appVersion: string;
  };
}

export interface SyncResult {
  success: boolean;
  error?: string;
  lastSync?: string;
}

interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  lastSyncReminder: string | null;
  reminderInterval: number; // days
}

interface CloudSyncResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface SyncProgress {
  stage: 'uploading' | 'downloading' | 'processing' | 'complete';
  progress: number; // 0-100
  message: string;
}

type CloudOperation = 'sync' | 'backup' | 'restore';

const maskToken = (token: string): string => {
  if (!token) return '';
  if (token.length <= 12) return `${token.slice(0, 3)}…`;
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
};

class CloudSyncService {
  private readonly SYNC_CONFIG_KEY = 'sync_config';
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly apiBaseUrl: string;
  private readonly syncEndpoint: string;
  private authToken: string | null = null;

  private isJwtToken(token: string | null | undefined): boolean {
    return typeof token === 'string' && token.includes('.') && token.split('.').length === 3;
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      if (!this.isJwtToken(token)) return null;
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const json = Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private isGoogleIdToken(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const iss = typeof payload?.iss === 'string' ? payload.iss : '';
    return iss.includes('accounts.google.com');
  }

  private async ensureBackendSessionToken(onProgress?: (p: any) => void): Promise<boolean> {
    // Backend expects its own session JWT stored in `auth_token`.
    try {
      if (this.authToken) return true;
      const stored = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
      if (stored) {
        this.authToken = stored;
        await cloudSyncDiagnostics.append('info', 'Restored backend session from AsyncStorage auth_token', {
          token: maskToken(stored),
        });
        if (__DEV__) {
          console.log('🔑 CloudSync: restored backend session from AsyncStorage auth_token', maskToken(stored));
        }
        return true;
      }
    } catch {}

    // Email/password sign-in stores the session token in SecureStore (`user_token`).
    // Load it here so cloud sync works after re-login without requiring a separate enable step.
    try {
      const secureToken = await SecureStore.getItemAsync('user_token');
      if (this.isJwtToken(secureToken)) {
        this.authToken = secureToken as string;
        await cloudSyncDiagnostics.append('info', 'Restored backend session from SecureStore user_token', {
          token: maskToken(secureToken as string),
        });
        if (__DEV__) {
          console.log('🔑 CloudSync: restored backend session from SecureStore user_token', maskToken(secureToken as string));
        }
        return true;
      }
    } catch {}

    // If SecureStore is unavailable/failing, AuthContext can fall back to AsyncStorage backups.
    // Accept those only if they look like a real backend JWT.
    try {
      const backupCandidates = ['auth_token_backup', 'demo_token_backup'];
      for (const key of backupCandidates) {
        const candidate = await AsyncStorage.getItem(key);
        if (this.isJwtToken(candidate)) {
          this.authToken = candidate as string;
          try {
            // Persist into the canonical key so future lookups are fast.
            await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, candidate as string);
          } catch {}
          await cloudSyncDiagnostics.append('warn', `Restored backend session from AsyncStorage ${key}`, {
            token: maskToken(candidate as string),
          });
          if (__DEV__) {
            console.log(`🔑 CloudSync: restored backend session from AsyncStorage ${key}`, maskToken(candidate as string));
          }
          return true;
        }
      }
    } catch {}

    // If user signed in with Google, we can exchange the stored Google ID token for a backend JWT.
    try {
      const googleIdToken = await SecureStore.getItemAsync('google_id_token');
      if (!googleIdToken) {
        return false;
      }

      onProgress?.({ operation: 'sync', stage: 'connecting', progress: 8, message: 'Signing in to cloud…' });
      try { syncProgressService.setProgress({ operation: 'sync', stage: 'connecting', progress: 8, message: 'Signing in to cloud…' }); } catch {}

      const backendLogin = await backendAuthService.loginWithGoogle(googleIdToken);
      if (backendLogin.success) {
        await this.setAuthToken(backendLogin.token);
        await cloudSyncDiagnostics.append('info', 'Created backend session via Google token exchange', {
          token: maskToken(backendLogin.token),
        });
        if (__DEV__) {
          console.log('🔑 CloudSync: created backend session via Google token exchange', maskToken(backendLogin.token));
        }
        return true;
      }

      await cloudSyncDiagnostics.append('error', 'Google token exchange failed to create backend session', {
        error: (backendLogin as any).error,
        status: (backendLogin as any).status,
        networkError: (backendLogin as any).networkError,
      });
    } catch {
      // ignore
    }

    return false;
  }

  private async handleUnauthorized(debug?: any): Promise<void> {
    // If backend rejects our token, stop trying in background.
    // This avoids repeated heavy collect+upload cycles that can lag the UI.
    try {
      this.authToken = null;
    } catch {}

    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    } catch {}

    try {
      await AsyncStorage.setItem('cloud_sync_last_auth_error', new Date().toISOString());
    } catch {}

    try {
      if (debug) {
        console.warn('⚠️ Cloud sync disabled due to auth error', debug);
      } else {
        console.warn('⚠️ Cloud sync disabled due to auth error');
      }
    } catch {}
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableNetworkError(error: any): boolean {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    if (error?.name === 'AbortError') return true;
    if (message.includes('network request failed')) return true;
    if (message.includes('failed to fetch')) return true;
    if (message.includes('timeout')) return true;
    const status = error?.debug?.status ?? error?.status;
    if (typeof status === 'number' && [408, 429, 502, 503, 504].includes(status)) return true;
    return false;
  }

  private async ensureBackendAwake(operation: CloudOperation, onProgress?: (p: any) => void): Promise<void> {
    const healthUrl = `${this.apiBaseUrl}/health`;

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
        throw new Error('Cancelled by user');
      }

      const message =
        attempt === 1
          ? 'Waking cloud server…'
          : `Cloud server waking… (retry ${attempt}/${maxAttempts})`;

      try {
        onProgress?.({ operation, stage: 'waking_server', progress: 8, message });
        try { syncProgressService.setProgress({ operation, stage: 'waking_server', progress: 8, message }); } catch {}

        const controller = new AbortController();
        const timeoutMs = 25000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          syncProgressService.setAbortHandler(() => controller.abort());
        } catch {}

        const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const err: any = new Error(`Health check failed: ${res.status}`);
          err.debug = { url: healthUrl, method: 'GET', status: res.status, statusText: res.statusText };
          throw err;
        }

        return;
      } catch (e) {
        try { syncProgressService.clearAbortHandler(); } catch {}
        if (attempt >= maxAttempts || !this.isRetryableNetworkError(e)) {
          const err = new Error('Cloud server is unavailable (possibly sleeping). Please try again in a moment.');
          (err as any).cause = e;
          throw err;
        }
        await this.sleep(1000 * attempt);
      } finally {
        try { syncProgressService.clearAbortHandler(); } catch {}
      }
    }
  }

  constructor() {
    this.apiBaseUrl = getBackendApiBaseUrl();
    const apiRoot = getBackendApiRoot();
    this.syncEndpoint = `${apiRoot}/sync`;
  }

  // Storage keys for compatibility
  private readonly STORAGE_KEYS = {
    CLOUD_SYNC_ENABLED: 'cloud_sync_enabled',
  } as const;

  // Helper methods for analytics service
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
  
  async isAuthenticated(): Promise<boolean> {
    try {
      const ok = await this.ensureBackendSessionToken();
      if (!ok) {
        await cloudSyncDiagnostics.append('warn', 'No backend session available for cloud sync');
      }
      return ok;
    } catch {
      return false;
    }
  }

  /**
   * Upload user data to secure cloud storage
   */
  async uploadUserData(googleUser: GoogleUser, onProgress?: (p: any) => void): Promise<SyncResult> {
    try {
      await this.ensureBackendAwake('backup', onProgress);
      const userData = await this.collectUserData();

      const payload = {
        wallets: userData.appData.wallets || [],
        transactions: userData.appData.transactions || [],
        categories: userData.appData.categories || [],
        budgets: userData.appData.budgets || [],
        bills: userData.appData.bills || [],
        reminders: userData.appData.reminders || [],
        goals: userData.appData.goals || [],
        timestamp: new Date().toISOString(),
        version: userData.metadata.version,
      };

      if (onProgress) onProgress({ operation: 'backup', stage: 'uploading', progress: 40, message: 'Uploading backup to cloud...' });
      // Check for cancellation before network request
      try { if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
        syncProgressService.setProgress({ stage: 'cancelled', progress: 0, message: 'Upload cancelled', cancelled: true });
        return { success: false, error: 'Cancelled by user' };
      }} catch {}
      const responseData = await this.requestWithAuth('/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, onProgress, 'backup');

      const lastSync = responseData?.backup?.timestamp || new Date().toISOString();

      await AsyncStorage.setItem('last_cloud_sync', lastSync);
      const syncUserId = googleUser?.id || userData.user.id;
      if (syncUserId) {
        await AsyncStorage.setItem('cloud_sync_user_id', syncUserId);
      }

      console.log('✅ User data uploaded to cloud successfully');
      if (onProgress) onProgress({ operation: 'backup', stage: 'complete', progress: 100, message: 'Upload complete', lastSync });
      return {
        success: true,
        lastSync,
      };
    } catch (error) {
      const dbg = (error as any)?.debug;
      console.error('❌ Error uploading user data to cloud:', error instanceof Error ? error.message : error, dbg ? { debug: dbg } : '');
      try { syncProgressService.setProgress({ stage: 'error', progress: 0, message: 'Cloud upload failed', failed: true, error: error instanceof Error ? error.message : String(error) }); } catch {}
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Download and restore user data from secure cloud storage
   */
  async downloadUserData(googleUser: GoogleUser, onProgress?: (p: any) => void): Promise<SyncResult> {
    try {
      await this.ensureBackendAwake('restore', onProgress);
      if (onProgress) onProgress({ operation: 'restore', stage: 'downloading', progress: 5, message: 'Checking cloud backup...' });
      syncProgressService.setProgress({ operation: 'restore', stage: 'downloading', progress: 5, message: 'Checking cloud backup...' });
      const responseData = await this.requestWithAuth('/restore', undefined, onProgress, 'restore');

      if (!responseData?.data) {
        console.log('ℹ️ No cloud backup found for user');
        return {
          success: true,
          error: 'No cloud backup found',
        };
      }

      const serverData = responseData.data;
      const lastSync = responseData.timestamp || new Date().toISOString();

      const backupData: UserDataBackup = {
        user: {
          id: googleUser?.id || serverData.user?.id || '',
          email: googleUser?.email || serverData.user?.email || '',
          name: googleUser?.name || serverData.user?.name || '',
          avatar: googleUser?.photo || serverData.user?.avatar,
          createdAt: serverData.user?.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          preferences: {
            settings: serverData.preferences?.settings || {},
            sync: serverData.preferences?.sync || {},
            notifications: serverData.preferences?.notifications || {},
          },
        },
        appData: {
          wallets: serverData.wallets || [],
          transactions: serverData.transactions || [],
          budgets: serverData.budgets || [],
          goals: serverData.goals || [],
          bills: serverData.bills || [],
          reminders: serverData.reminders || [],
          categories: serverData.categories || [],
          settings: serverData.settings || {},
          insights: serverData.insights || {},
        },
        metadata: {
          version: responseData.version || '1.0.0',
          lastSync,
          platform: 'backend',
          appVersion: '2.5.1',
        },
      };

      // Provide progress callbacks during restore
      try {
        await this.restoreUserData(backupData, (stage: string, progress?: number, message?: string) => {
          if (onProgress) onProgress({ stage, progress, message });
          try { syncProgressService.setProgress({ stage, progress: progress ?? 0, message: message ?? '' }); } catch {}
        });
      } catch (err: any) {
        if (err && err.message && err.message.includes('Cancelled')) {
          console.log('ℹ️  Restore cancelled by user');
          return { success: false, error: 'Cancelled by user' };
        }
        throw err;
      }

      await AsyncStorage.setItem('last_cloud_sync', lastSync);
      const syncUserId = googleUser?.id || backupData.user.id;
      if (syncUserId) {
        await AsyncStorage.setItem('cloud_sync_user_id', syncUserId);
      }

      console.log('✅ User data downloaded from cloud successfully');
      return {
        success: true,
        lastSync,
      };
    } catch (error) {
      const dbg = (error as any)?.debug;
      console.error('❌ Error downloading user data from cloud:', error instanceof Error ? error.message : error, dbg ? { debug: dbg } : '');
      try { syncProgressService.setProgress({ stage: 'error', progress: 0, message: 'Cloud download failed', failed: true, error: error instanceof Error ? error.message : String(error) }); } catch {}
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Sync user data bidirectionally
   */
  async syncUserData(googleUser: GoogleUser, onProgress?: (p: any) => void): Promise<SyncResult> {
    try {
      const downloadResult = await this.downloadUserData(googleUser);

      if (downloadResult.success && !downloadResult.error) {
        return downloadResult;
      }

      if (downloadResult.error === 'No cloud backup found') {
        return await this.uploadUserData(googleUser, onProgress);
      }

      return downloadResult;
    } catch (error) {
      console.error('❌ Error syncing user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Delete user data from cloud storage
   */
  async deleteCloudData(_googleUser: GoogleUser): Promise<SyncResult> {
    try {
      await this.ensureBackendAwake('backup');
      await this.requestWithAuth('/backup', { method: 'DELETE' }, undefined, 'backup');

      await AsyncStorage.removeItem('last_cloud_sync');
      await AsyncStorage.removeItem('cloud_sync_user_id');

      console.log('✅ User data deleted from cloud successfully');
      return { success: true };
    } catch (error) {
      const dbg = (error as any)?.debug;
      console.error('❌ Error deleting user data from cloud:', error instanceof Error ? error.message : error, dbg ? { debug: dbg } : '');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Check if cloud backup exists for user
   */
  async hasCloudBackup(_googleUser: GoogleUser): Promise<boolean> {
    try {
      await this.ensureBackendAwake('restore');
      const responseData = await this.requestWithAuth('/restore', undefined, undefined, 'restore');
      return !!responseData?.data;
    } catch (error) {
      // Handle backend unavailability by notifying progress listeners
      const errorMsg = error instanceof Error ? error.message : String(error);
      const dbg = (error as any)?.debug;
      if (errorMsg.includes('Application not found') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network')) {
        console.log('ℹ️  Cloud sync backend not available - using local storage only', dbg ? { debug: dbg } : '');
        try { syncProgressService.setProgress({ stage: 'error', progress: 0, message: 'Cloud backend unavailable', failed: true, error: errorMsg }); } catch {}
      } else {
        console.warn('⚠️ Cloud backup check failed:', errorMsg, dbg ? { debug: dbg } : '');
        try { syncProgressService.setProgress({ stage: 'error', progress: 0, message: 'Cloud backup check failed', failed: true, error: errorMsg }); } catch {}
      }
      return false;
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('last_cloud_sync');
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return null;
    }
  }

  private async getAuthTokenOrThrow(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    // Attempt to obtain/restore a backend session token.
    const ok = await this.ensureBackendSessionToken();
    if (ok && this.authToken) {
      return this.authToken;
    }

    throw new Error('No backend session token set');
  }

  private async requestWithAuth(
    path: string,
    options: RequestInit = {},
    onProgress?: (p: any) => void,
    operation: CloudOperation = 'sync'
  ): Promise<any> {
    const url = `${this.syncEndpoint}${path}`;
    const maxAttempts = 3;
    const timeoutMs = 30000;

    let didReloadAfter401 = false;

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const token = await this.getAuthTokenOrThrow();

      const headers: Record<string, string> = {
        ...(options.headers ? (options.headers as Record<string, string>) : {}),
        Authorization: `Bearer ${token}`,
      };

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
        const err = new Error('Cancelled by user');
        (err as any).cancelled = true;
        throw err;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        try {
          syncProgressService.setAbortHandler(() => controller.abort());
        } catch {}

        if (attempt > 1) {
          const msg = `Retrying cloud request… (${attempt}/${maxAttempts})`;
          onProgress?.({ operation, stage: 'connecting', progress: 15, message: msg });
          try { syncProgressService.setProgress({ operation, stage: 'connecting', progress: 15, message: msg }); } catch {}
        }

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let data: any = null;
        try {
          data = await response.json();
        } catch (_error) {
          data = null;
        }

        if (response.status === 401) {
          const message = data?.error?.message || data?.error || 'Authentication failed. Please sign in again.';
          await cloudSyncDiagnostics.append('warn', 'Cloud sync request returned 401', {
            path,
            message,
          });

          // Backend tokens can be rotated by login; re-load once and retry.
          if (!didReloadAfter401) {
            didReloadAfter401 = true;
            try {
              const stored = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
              if (stored && stored !== this.authToken) {
                this.authToken = stored;
                const msg = 'Retrying with updated session…';
                onProgress?.({ operation, stage: 'connecting', progress: 12, message: msg });
                try { syncProgressService.setProgress({ operation, stage: 'connecting', progress: 12, message: msg }); } catch {}
                await this.sleep(200);
                continue;
              }
            } catch {
              // ignore
            }

            // Also check SecureStore for email/password sessions.
            try {
              const secureToken = await SecureStore.getItemAsync('user_token');
              if (this.isJwtToken(secureToken) && secureToken !== this.authToken) {
                this.authToken = secureToken as string;
                const msg = 'Retrying with refreshed session…';
                onProgress?.({ operation, stage: 'connecting', progress: 12, message: msg });
                try { syncProgressService.setProgress({ operation, stage: 'connecting', progress: 12, message: msg }); } catch {}
                await this.sleep(200);
                continue;
              }
            } catch {
              // ignore
            }

            // Finally, try AsyncStorage backups (when SecureStore is unavailable).
            try {
              const backupCandidates = ['auth_token_backup', 'demo_token_backup'];
              for (const key of backupCandidates) {
                const candidate = await AsyncStorage.getItem(key);
                if (this.isJwtToken(candidate) && candidate !== this.authToken) {
                  this.authToken = candidate as string;
                  try {
                    await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, candidate as string);
                  } catch {}
                  await cloudSyncDiagnostics.append('warn', `Reloaded session from AsyncStorage ${key} after 401`, {
                    token: maskToken(candidate as string),
                  });
                  const msg = 'Retrying with recovered session…';
                  onProgress?.({ operation, stage: 'connecting', progress: 12, message: msg });
                  try { syncProgressService.setProgress({ operation, stage: 'connecting', progress: 12, message: msg }); } catch {}
                  await this.sleep(200);
                  continue;
                }
              }
            } catch {
              // ignore
            }
          }

          const err = new Error(message);
          (err as any).debug = {
            url,
            method: options.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            responseBody: data,
            usedTokenPreview: token ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : '',
          };

          // Disable cloud sync so we don't keep retrying and lagging the UI.
          await this.handleUnauthorized((err as any).debug);
          throw err;
        }

        if (!response.ok) {
          const debug = {
            url,
            method: options.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            responseBody: data,
            usedTokenPreview: maskToken(token),
          };
          try {
            console.error('Cloud request failed:', debug);
          } catch (logErr) {
            console.error('Error logging failed cloud request details:', logErr);
          }

          const message = data?.error?.message || data?.error || data?.message || response.statusText;
          const err: any = new Error(message || `Request failed: ${response.status} ${response.statusText}`);
          err.debug = debug;
          throw err;
        }

        if (data && typeof data === 'object' && 'success' in data && data.success === false) {
          const message = data.error || data.message || 'Request failed';
          throw new Error(message);
        }

        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
          const err = new Error('Cancelled by user');
          (err as any).cancelled = true;
          throw err;
        }

        if (attempt >= maxAttempts || !this.isRetryableNetworkError(error)) {
          throw error;
        }

        await this.sleep(700 * attempt);
      } finally {
        try { syncProgressService.clearAbortHandler(); } catch {}
      }
    }

    throw lastError || new Error('Cloud request failed');
  }

  private async collectUserData(): Promise<UserDataBackup> {
    try {
      // Collect all user data from various storage locations
      const [
        userData,
        appSettings,
        syncSettings,
        notificationPreferences,
        remindersData,
        billsData,
        budgetData,
        goalsData,
      ] = await Promise.all([
        AsyncStorage.getItem('user_data'),
        AsyncStorage.getItem('app_settings'),
        AsyncStorage.getItem('sync_settings'),
        AsyncStorage.getItem('notification_preferences'),
        AsyncStorage.getItem('reminders_data'),
        AsyncStorage.getItem('bills_data'),
        AsyncStorage.getItem('budget_data'),
        AsyncStorage.getItem('goals_data'),
      ]);

      // Get data from the hybrid data service
      let hybridData = {};
      try {
        const [wallets, transactions, categories] = await Promise.all([
          hybridDataService.getWallets(),
          hybridDataService.getTransactions(),
          hybridDataService.getCategories(),
        ]);
        hybridData = { wallets, transactions, categories };
        console.log(`📊 Collected ${wallets.length} wallets and ${transactions.length} transactions`);
      } catch (error) {
        console.error('❌ Could not load hybrid data service:', error);
      }

      const user = userData ? JSON.parse(userData) : {};

      return {
        user: {
          id: user.id || '',
          email: user.email || '',
          name: user.name || '',
          avatar: user.avatar,
          createdAt: user.createdAt || '',
          lastLogin: user.lastLogin || '',
          preferences: {
            settings: appSettings ? JSON.parse(appSettings) : {},
            sync: syncSettings ? JSON.parse(syncSettings) : {},
            notifications: notificationPreferences ? JSON.parse(notificationPreferences) : {},
          },
        },
        appData: {
          wallets: (hybridData as any).wallets || [],
          transactions: (hybridData as any).transactions || [],
          budgets: budgetData ? JSON.parse(budgetData) : [],
          goals: goalsData ? JSON.parse(goalsData) : [],
          bills: billsData ? JSON.parse(billsData) : [],
          reminders: remindersData ? JSON.parse(remindersData) : [],
          categories: (hybridData as any).categories || [],
          settings: appSettings ? JSON.parse(appSettings) : {},
          insights: {}, // Add insights data if available
        },
        metadata: {
          version: '1.0.0',
          lastSync: new Date().toISOString(),
          platform: 'react-native',
          appVersion: '2.5.1',
        },
      };
    } catch (error) {
      console.error('❌ Error collecting user data:', error);
      throw error;
    }
  }

  private async restoreUserData(backup: UserDataBackup, onProgress?: (stage: string, progress?: number, message?: string) => void): Promise<void> {
    try {
      // Restore user data to various storage locations
      if (onProgress) onProgress('restoring', 5, 'Restoring basic settings');
      await AsyncStorage.setItem('user_data', JSON.stringify(backup.user));
      
      if (backup.user.preferences.settings) {
        await AsyncStorage.setItem('app_settings', JSON.stringify(backup.user.preferences.settings));
      }
      
      if (backup.user.preferences.sync) {
        await AsyncStorage.setItem('sync_settings', JSON.stringify(backup.user.preferences.sync));
      }
      
      if (backup.user.preferences.notifications) {
        await AsyncStorage.setItem('notification_preferences', JSON.stringify(backup.user.preferences.notifications));
      }

      if (backup.appData.reminders) {
        await AsyncStorage.setItem('reminders_data', JSON.stringify(backup.appData.reminders));
      }

      if (backup.appData.bills) {
        await AsyncStorage.setItem('bills_data', JSON.stringify(backup.appData.bills));
      }

      if (backup.appData.budgets) {
        await AsyncStorage.setItem('budget_data', JSON.stringify(backup.appData.budgets));
      }

      if (backup.appData.goals) {
        await AsyncStorage.setItem('goals_data', JSON.stringify(backup.appData.goals));
      }

      // Restore hybrid data service data with progress
      try {
          await hybridDataService.clearAllData();

          // Restore wallets with original IDs
          const totalWallets = backup.appData.wallets.length || 0;
          console.log(`🏦 Restoring ${totalWallets} wallets...`);
          for (let i = 0; i < totalWallets; i++) {
            // allow cancellation
            if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
              throw new Error('Cancelled by user');
            }
            const wallet = backup.appData.wallets[i];
            await hybridDataService.restoreWallet(wallet);
            const pct = Math.round(((i + 1) / Math.max(1, totalWallets)) * 40);
            const msg = `Restored ${i + 1} of ${totalWallets} wallets`;
            if (onProgress) onProgress('restoring_wallets', pct, msg);
            try { syncProgressService.setProgress({ stage: 'restoring_wallets', progress: pct, message: msg }); } catch {}
          }
          console.log('✅ Wallets restored successfully');

          // Restore transactions with original IDs
          const totalTx = backup.appData.transactions.length || 0;
          console.log(`💰 Restoring ${totalTx} transactions...`);
          for (let i = 0; i < totalTx; i++) {
            if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
              throw new Error('Cancelled by user');
            }
            const transaction = backup.appData.transactions[i];
            await hybridDataService.restoreTransaction(transaction);
            const pct = 40 + Math.round(((i + 1) / Math.max(1, totalTx)) * 50);
            const msg = `Restored ${i + 1} of ${totalTx} transactions`;
            if (onProgress) onProgress('restoring_transactions', pct, msg);
            try { syncProgressService.setProgress({ stage: 'restoring_transactions', progress: pct, message: msg }); } catch {}
          }
          console.log('✅ Transactions restored successfully');
      } catch (error) {
        console.error('❌ Could not restore hybrid data service data:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw here to allow other data to be restored
      }

      console.log('✅ User data restored successfully');
      try {
        syncProgressService.setProgress({ stage: 'complete', progress: 100, message: 'Restore complete', complete: true });
      } catch {}
      try {
        notificationService.scheduleLocalNotification('Data Restored', 'Your cloud backup has been downloaded to this device.').catch(() => {});
      } catch {}
    } catch (error) {
      console.error('❌ Error restoring user data:', error);
      throw error;
    }
  }

  // Legacy sync configuration methods (maintained for compatibility)
  async getSyncConfig(): Promise<SyncConfig> {
    try {
      const config = await AsyncStorage.getItem(this.SYNC_CONFIG_KEY);
      if (config) {
        return JSON.parse(config);
      }
      
      // Default configuration
      const defaultConfig: SyncConfig = {
        enabled: false,
        autoSync: false,
        lastSyncReminder: null,
        reminderInterval: 7
      };
      
      await this.setSyncConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      console.error('Error getting sync config:', error);
      return {
        enabled: false,
        autoSync: false,
        lastSyncReminder: null,
        reminderInterval: 7
      };
    }
  }

  async setSyncConfig(config: SyncConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error setting sync config:', error);
      throw error;
    }
  }

  async enableSync(autoSync: boolean = false): Promise<void> {
    const config = await this.getSyncConfig();
    config.enabled = true;
    config.autoSync = autoSync;
    await this.setSyncConfig(config);
  }

  async disableSync(): Promise<void> {
    const config = await this.getSyncConfig();
    config.enabled = false;
    config.autoSync = false;
    await this.setSyncConfig(config);
  }

  // Authentication
  async getAuthToken(): Promise<string | null> {
    return this.authToken;
  }

  async setAuthToken(token: string): Promise<void> {
    // Backend session JWT used for /api/sync/* routes.
    this.authToken = token;
    try {
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, token);
    } catch {}
  }

  async clearAuthToken(): Promise<void> {
    this.authToken = null;
    try {
      await AsyncStorage.removeItem(this.AUTH_TOKEN_KEY);
    } catch {}
  }

  // Clear sync data (for account deletion)
  async clearSyncData(): Promise<void> {
    try {
      console.log('🗑️ Clearing sync data...');
      
      // Clear sync settings from AsyncStorage
      await AsyncStorage.removeItem('sync_enabled');
      await AsyncStorage.removeItem('sync_settings');
      await AsyncStorage.removeItem('last_sync_date');
      await AsyncStorage.removeItem('sync_auth_token');
      await AsyncStorage.removeItem('sync_user_id');
      await AsyncStorage.removeItem('cloud_sync_config');
      await AsyncStorage.removeItem('last_cloud_sync');
      await AsyncStorage.removeItem('cloud_sync_user_id');
      
      console.log('✅ Sync data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing sync data:', error);
      throw error;
    }
  }

  // Legacy compatibility methods
  async getSyncStatus(): Promise<{
    enabled: boolean;
    authenticated: boolean;
    lastSync: Date | null;
    unsyncedItems: number;
    nextReminderDue: Date | null;
  }> {
    const [config, cloudSyncEnabled] = await Promise.all([
      this.getSyncConfig(),
      AsyncStorage.getItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED),
    ]);

    const lastSync = await this.getLastSyncTime();
    
    // Count unsynced items from local storage
    let unsyncedItems = 0;
    try {
      const { localStorageService } = await import('./localStorageService');
      const [wallets, transactions, categories] = await Promise.all([
        localStorageService.getWallets(),
        localStorageService.getTransactions(),
        localStorageService.getCategories()
      ]);
      
      // Count items that are dirty (need sync) or never synced
      unsyncedItems = wallets.filter(w => w.isDirty || !w.lastSynced).length +
                    transactions.filter(t => t.isDirty || !t.lastSynced).length +
                    categories.filter(c => c.isDirty || !c.lastSynced).length;
    } catch (error) {
      console.log('Could not count unsynced items:', error);
    }
    
    return {
      enabled: config.enabled || cloudSyncEnabled === 'true',
      authenticated: await this.isAuthenticated(),
      lastSync: lastSync ? new Date(lastSync) : null,
      unsyncedItems,
      nextReminderDue: null, // Simplified for now
    };
  }

  async shouldShowSyncReminder(): Promise<boolean> {
    try {
      // Only show reminders when:
      // 1. Cloud sync is disabled AND
      // 2. There is data that could be synced (unsynced items > 0)
      
      const cloudSyncEnabled = await AsyncStorage.getItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      const isSyncDisabled = cloudSyncEnabled !== 'true';
      
      if (!isSyncDisabled) {
        // Sync is already enabled, no need for reminders
        return false;
      }
      
      // Check if there's data to sync
      const syncStatus = await this.getSyncStatus();
      const hasUnsyncedData = syncStatus.unsyncedItems > 0;
      
      // Only show reminder if sync is disabled AND there's data to sync
      return isSyncDisabled && hasUnsyncedData;
    } catch (error) {
      console.error('Error checking should show sync reminder:', error);
      return false;
    }
  }

  async quickSyncCheck(): Promise<void> {
    try {
      const cloudSyncEnabled = await AsyncStorage.getItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      if (cloudSyncEnabled === 'true') {
        // For Google users, sync is automatic - no action needed
        console.log('📱 Google sync is enabled - automatic sync active');
      }
    } catch (error) {
      console.error('❌ Quick sync check failed:', error);
    }
  }

  async markReminderShown(): Promise<void> {
    const config = await this.getSyncConfig();
    config.lastSyncReminder = new Date().toISOString();
    await this.setSyncConfig(config);
  }

  async performFullSync(
    onProgress?: (progress: any) => void
  ): Promise<{ success: boolean; error?: string; syncedData?: any }> {
    try {
      // Report progress if callback provided
      if (onProgress) {
        onProgress({ operation: 'sync', stage: 'uploading', progress: 0, message: 'Starting sync...' });
      }

      // Ensure backend session exists (JWT checked by backend middleware)
      const isAuth = await this.ensureBackendSessionToken(onProgress);
      if (!isAuth) {
        const msg = 'Cloud sync requires a backend session. Please sign in again.';
        onProgress?.({ operation: 'sync', stage: 'error', progress: 0, message: msg, failed: true, error: msg });
        try { syncProgressService.setProgress({ operation: 'sync', stage: 'error', progress: 0, message: msg, failed: true, error: msg }); } catch {}
        return { success: false, error: msg };
      }

      // Get local data that needs syncing
      const { localStorageService } = await import('./localStorageService');
      
      // Report progress
      if (onProgress) {
        onProgress({ operation: 'sync', stage: 'uploading', progress: 15, message: 'Gathering local data...' });
      }

      // Get all local data
      const wallets = await localStorageService.getWallets();
      const transactions = await localStorageService.getTransactions();
      const categories = await localStorageService.getCategories();
      
      let syncedData = {
        wallets: 0,
        transactions: 0,
        categories: 0,
        errors: [] as string[]
      };

      // Report progress
      if (onProgress) {
        onProgress({ operation: 'sync', stage: 'uploading', progress: 25, message: `Syncing ${wallets.length} wallets...` });
      }

      // Sync wallets
      for (const wallet of wallets) {
        if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
          if (onProgress) onProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user' });
          syncProgressService.setProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user', cancelled: true });
          return { success: false, error: 'Cancelled by user' };
        }
        try {
          // Mark as synced (in real app, this would upload to cloud)
          await localStorageService.updateWallet(wallet.id, { 
            ...wallet, 
            lastSynced: new Date().toISOString(),
            isDirty: false 
          });
          syncedData.wallets++;
        } catch (error) {
          syncedData.errors.push(`Failed to sync wallet: ${wallet.name}`);
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({ operation: 'sync', stage: 'processing', progress: 50, message: `Syncing ${transactions.length} transactions...` });
      }

      // Sync transactions
      for (const transaction of transactions) {
        if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
          if (onProgress) onProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user' });
          syncProgressService.setProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user', cancelled: true });
          return { success: false, error: 'Cancelled by user' };
        }
        try {
          // Mark as synced (in real app, this would upload to cloud)
          await localStorageService.updateTransaction(transaction.id, { 
            ...transaction, 
            lastSynced: new Date().toISOString(),
            isDirty: false 
          });
          syncedData.transactions++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to sync transaction ${transaction.id}:`, errorMessage);
          syncedData.errors.push(`Failed to sync transaction: ${transaction.description || transaction.id}`);
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({ operation: 'sync', stage: 'downloading', progress: 75, message: `Syncing ${categories.length} categories...` });
      }

      // Sync categories
      for (const category of categories) {
        if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
          if (onProgress) onProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user' });
          syncProgressService.setProgress({ stage: 'cancelled', progress: 0, message: 'Sync cancelled by user', cancelled: true });
          return { success: false, error: 'Cancelled by user' };
        }
        try {
          // Mark as synced (in real app, this would upload to cloud)
          await localStorageService.updateCategory(category.id, { 
            ...category, 
            lastSynced: new Date().toISOString(),
            isDirty: false 
          });
          syncedData.categories++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to sync category ${category.name}:`, errorMessage);
          syncedData.errors.push(`Failed to sync category: ${category.name}`);
        }
      }

      // Update last sync time (local)
      await AsyncStorage.setItem('last_cloud_sync', new Date().toISOString());
      await AsyncStorage.setItem('last_sync_result', JSON.stringify(syncedData));

      // Attempt a real cloud upload. If this fails, surface it as a sync failure
      // so the UI doesn't claim success while backup didn't happen.
      if (isAuth) {
        // Build a minimal user-like object for bookkeeping.
        const storedUser = await AsyncStorage.getItem('google_user_info');
        const storedUserData = await AsyncStorage.getItem('user_data');
        const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;

        let googleUser: any = null;
        if (storedUser) {
          try {
            const info = JSON.parse(storedUser);
            googleUser = {
              id: info.id || info.email,
              email: info.email,
              name: info.name,
              photo: info.photo,
              user: info,
            } as any;
          } catch {
            googleUser = null;
          }
        }

        if (!googleUser) {
          googleUser = {
            id: parsedUserData?.id || parsedUserData?.email || 'user',
            email: parsedUserData?.email || '',
            name: parsedUserData?.name || 'User',
            photo: parsedUserData?.avatar,
          } as any;
        }

        if (syncProgressService.isCancelRequested && syncProgressService.isCancelRequested()) {
          if (onProgress) onProgress({ stage: 'cancelled', progress: 0, message: 'Cancelled before cloud upload' });
          syncProgressService.setProgress({ stage: 'cancelled', progress: 0, message: 'Cancelled before cloud upload', cancelled: true });
          return { success: false, error: 'Cancelled by user' };
        }

        if (onProgress) onProgress({ operation: 'backup', stage: 'uploading', progress: 20, message: 'Uploading synced data to cloud...' });
        const uploadResult = await this.uploadUserData(googleUser, onProgress);
        if (!uploadResult.success) {
          const msg = uploadResult.error || 'Cloud backup failed';
          onProgress?.({ operation: 'backup', stage: 'error', progress: 0, message: msg, failed: true, error: msg });
          try { syncProgressService.setProgress({ operation: 'backup', stage: 'error', progress: 0, message: msg, failed: true, error: msg }); } catch {}
          return { success: false, error: msg };
        }
        if (onProgress) onProgress({ operation: 'backup', stage: 'complete', progress: 100, message: 'Cloud upload complete', syncedData });
      }

      // Report completion
      if (onProgress) {
        onProgress({ 
          operation: 'sync',
          stage: 'complete', 
          progress: 100, 
          message: `Sync complete! ${syncedData.wallets + syncedData.transactions + syncedData.categories} items synced.`,
          syncedData 
        });
      }

      return {
        success: true,
        syncedData
      };
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      const msg = error instanceof Error ? error.message : 'Sync failed';
      try {
        onProgress?.({ operation: 'sync', stage: 'error', progress: 0, message: msg, failed: true, error: msg });
        syncProgressService.setProgress({ operation: 'sync', stage: 'error', progress: 0, message: msg, failed: true, error: msg });
      } catch {}
      return {
        success: false,
        error: msg,
      };
    }
  }

  async register(email: string, password: string, firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const name = `${firstName} ${lastName}`.trim();
      const backendResult = await backendAuthService.register({
        email: normalizedEmail,
        password,
        firstName,
        lastName,
      });

      if (backendResult.success) {
        await AsyncStorage.setItem('user_email', normalizedEmail);
        if (name.length > 0) {
          await AsyncStorage.setItem('user_name', name);
        }
        return { success: true };
      }

      if (!backendResult.networkError) {
        return {
          success: false,
          error: backendResult.error,
        };
      }

      console.warn('⚠️ Backend registration unavailable, falling back to local mock registration');
      await this.createMockSession(normalizedEmail, name);
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const backendResult = await backendAuthService.login({ email: normalizedEmail, password });

      if (backendResult.success) {
        const backendUser = backendResult.user;
        const name = `${backendUser.firstName ?? ''} ${backendUser.lastName ?? ''}`.trim();
        await AsyncStorage.setItem('user_email', normalizedEmail);
        if (name.length > 0) {
          await AsyncStorage.setItem('user_name', name);
        }

        return { success: true };
      }

      if (!backendResult.networkError) {
        return {
          success: false,
          error: backendResult.error,
        };
      }

      console.warn('⚠️ Backend login unavailable, falling back to local mock login');
      await this.createMockSession(normalizedEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (token && this.isJwtToken(token) && !this.isGoogleIdToken(token)) {
        const result = await backendAuthService.logout(token);
        if (!result.success && __DEV__) {
          // Backend logout is best-effort; never block local logout or spam warnings.
          console.log('ℹ️ Backend logout skipped/failed:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Logout request failed:', error);
    } finally {
      try {
        await this.clearAuthToken();
        await AsyncStorage.removeItem('user_email');
        await AsyncStorage.removeItem('user_name');
        console.log('👋 User logged out successfully');
      } catch (cleanupError) {
        console.error('❌ Logout cleanup failed:', cleanupError);
      }
    }
  }

  private async createMockSession(email: string, name?: string): Promise<void> {
    const mockToken = `auth_token_${Date.now()}`;
    await AsyncStorage.setItem('user_email', email);
    if (name && name.length > 0) {
      await AsyncStorage.setItem('user_name', name);
    }
  }

  async registerPushToken(tokenData: { token: string; deviceId?: string; platform?: string; appVersion?: string }): Promise<void> {
    try {
      // Store push token locally for now
      await AsyncStorage.setItem('push_token', JSON.stringify(tokenData));
      console.log('📱 Push token registered:', tokenData.token.substring(0, 20) + '...');
    } catch (error) {
      console.error('❌ Failed to register push token:', error);
    }
  }

  async getNotifications(): Promise<any[]> {
    try {
      // Return empty array for now - in real implementation would fetch from backend
      return [];
    } catch (error) {
      console.error('❌ Failed to get notifications:', error);
      return [];
    }
  }

  async getNotificationPreferences(): Promise<any> {
    try {
      // Return default preferences for now
      return {
        enablePushNotifications: true,
        enableEmailNotifications: false,
        reminderFrequency: 'daily',
      };
    } catch (error) {
      console.error('❌ Failed to get notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      // Store preferences locally for now
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
      console.log('⚙️ Notification preferences updated');
    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
export type { CloudSyncService };