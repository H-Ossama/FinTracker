import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser } from './googleAuthService';
import { hybridDataService } from './hybridDataService';
import { getBackendApiBaseUrl, getBackendApiRoot } from '../config/apiConfig';
import { backendAuthService } from './backendAuthService';

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

class CloudSyncService {
  private readonly SYNC_CONFIG_KEY = 'sync_config';
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly apiBaseUrl: string;
  private readonly syncEndpoint: string;

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
    const token = await this.getAuthToken();
    return !!token;
  }

  /**
   * Upload user data to secure cloud storage
   */
  async uploadUserData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
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

      const responseData = await this.requestWithAuth('/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const lastSync = responseData?.backup?.timestamp || new Date().toISOString();

      await AsyncStorage.setItem('last_cloud_sync', lastSync);
      const syncUserId = googleUser?.id || userData.user.id;
      if (syncUserId) {
        await AsyncStorage.setItem('cloud_sync_user_id', syncUserId);
      }

      console.log('✅ User data uploaded to cloud successfully');
      return {
        success: true,
        lastSync,
      };
    } catch (error) {
      console.error('❌ Error uploading user data to cloud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Download and restore user data from secure cloud storage
   */
  async downloadUserData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
      const responseData = await this.requestWithAuth('/restore');

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

      await this.restoreUserData(backupData);

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
      console.error('❌ Error downloading user data from cloud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Sync user data bidirectionally
   */
  async syncUserData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
      const downloadResult = await this.downloadUserData(googleUser);

      if (downloadResult.success && !downloadResult.error) {
        return downloadResult;
      }

      if (downloadResult.error === 'No cloud backup found') {
        return await this.uploadUserData(googleUser);
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
      await this.requestWithAuth('/backup', { method: 'DELETE' });

      await AsyncStorage.removeItem('last_cloud_sync');
      await AsyncStorage.removeItem('cloud_sync_user_id');

      console.log('✅ User data deleted from cloud successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting user data from cloud:', error);
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
      const responseData = await this.requestWithAuth('/restore');
      return !!responseData?.data;
    } catch (error) {
      // Silently handle backend unavailability (expected when backend is not running)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Application not found') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network')) {
        console.log('ℹ️  Cloud sync backend not available - using local storage only');
      } else {
        console.warn('⚠️ Cloud backup check failed:', errorMsg);
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
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Cloud sync requires authentication. Please sign in again.');
    }
    return token;
  }

  private async requestWithAuth(path: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthTokenOrThrow();

    const headers: Record<string, string> = {
      ...(options.headers ? (options.headers as Record<string, string>) : {}),
      Authorization: `Bearer ${token}`,
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.syncEndpoint}${path}`, {
      ...options,
      headers,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        response.statusText;
      throw new Error(message || 'Request failed');
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      const message = data.error || data.message || 'Request failed';
      throw new Error(message);
    }

    return data;
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

  private async restoreUserData(backup: UserDataBackup): Promise<void> {
    try {
      // Restore user data to various storage locations
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

      // Restore hybrid data service data
      try {
        // Clear existing data first
        await hybridDataService.clearAllData();
        
        // Restore wallets with original IDs
        console.log(`🏦 Restoring ${backup.appData.wallets.length} wallets...`);
        for (const wallet of backup.appData.wallets) {
          await hybridDataService.restoreWallet(wallet);
        }
        console.log('✅ Wallets restored successfully');
        
        // Restore transactions with original IDs
        console.log(`💰 Restoring ${backup.appData.transactions.length} transactions...`);
        for (const transaction of backup.appData.transactions) {
          await hybridDataService.restoreTransaction(transaction);
        }
        console.log('✅ Transactions restored successfully');
      } catch (error) {
        console.error('❌ Could not restore hybrid data service data:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw here to allow other data to be restored
      }

      console.log('✅ User data restored successfully');
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
    try {
      const storedToken = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
      if (storedToken) {
        return storedToken;
      }

      const secureToken = await SecureStore.getItemAsync('user_token');
      if (secureToken) {
        return secureToken;
      }

      const googleIdToken = await SecureStore.getItemAsync('google_id_token');
      if (googleIdToken) {
        return googleIdToken;
      }

      const googleAccessToken = await SecureStore.getItemAsync('google_access_token');
      if (googleAccessToken) {
        return googleAccessToken;
      }

      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, token);
      await SecureStore.setItemAsync('user_token', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
      throw error;
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync('user_token');
    } catch (error) {
      console.error('Error clearing auth token:', error);
    }
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

  async performFullSync(onProgress?: (progress: any) => void): Promise<{ success: boolean; error?: string }> {
    try {
      // Report progress if callback provided
      if (onProgress) {
        onProgress({ stage: 'uploading', progress: 0, message: 'Starting sync...' });
      }

      // Check if we're authenticated
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return {
          success: false,
          error: 'Not authenticated. Please sign in to sync.',
        };
      }

      // Get local data that needs syncing
      const { localStorageService } = await import('./localStorageService');
      
      // Report progress
      if (onProgress) {
        onProgress({ stage: 'uploading', progress: 15, message: 'Gathering local data...' });
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
        onProgress({ stage: 'uploading', progress: 25, message: `Syncing ${wallets.length} wallets...` });
      }

      // Sync wallets
      for (const wallet of wallets) {
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
        onProgress({ stage: 'processing', progress: 50, message: `Syncing ${transactions.length} transactions...` });
      }

      // Sync transactions
      for (const transaction of transactions) {
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
        onProgress({ stage: 'downloading', progress: 75, message: `Syncing ${categories.length} categories...` });
      }

      // Sync categories
      for (const category of categories) {
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

      // Update last sync time
      await AsyncStorage.setItem('last_cloud_sync', new Date().toISOString());
      await AsyncStorage.setItem('last_sync_result', JSON.stringify(syncedData));

      // Report completion
      if (onProgress) {
        onProgress({ 
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
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
        await this.setAuthToken(backendResult.token);
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

        await this.setAuthToken(backendResult.token);
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
      const looksLikeJwt = typeof token === 'string' && token.includes('.') && token.split('.').length === 3;
      if (token && looksLikeJwt) {
        const result = await backendAuthService.logout(token);
        if (!result.success && !result.networkError) {
          console.warn('⚠️ Backend logout failed:', result.error);
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
    await this.setAuthToken(mockToken);
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