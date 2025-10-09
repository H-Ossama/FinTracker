import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageService, LocalWallet, LocalTransaction, LocalCategory } from './localStorageService';

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
  private readonly API_BASE_URL = 'http://localhost:3001/api'; // Will be replaced with Vercel URL
  
  // Helper methods for analytics service
  getApiBaseUrl(): string {
    return this.API_BASE_URL;
  }
  
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
  private readonly SYNC_CONFIG_KEY = 'sync_config';
  private readonly AUTH_TOKEN_KEY = 'auth_token';

  // Sync Configuration Management
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
      return await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting auth token:', error);
      throw error;
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing auth token:', error);
    }
  }

  // API Helper
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<CloudSyncResponse> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // User Authentication
  async register(email: string, password: string, firstName: string, lastName: string): Promise<CloudSyncResponse> {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
      }),
    });

    if (response.success && response.data?.token) {
      await this.setAuthToken(response.data.token);
      await this.enableSync(); // Auto-enable sync after registration
    }

    return response;
  }

  async login(email: string, password: string): Promise<CloudSyncResponse> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (response.success && response.data?.token) {
      await this.setAuthToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.makeRequest('/auth/logout', { method: 'POST' });
    await this.clearAuthToken();
    await this.disableSync();
  }

  // Manual Sync Functions
  async performFullSync(onProgress?: (progress: SyncProgress) => void): Promise<CloudSyncResponse> {
    try {
      const config = await this.getSyncConfig();
      if (!config.enabled) {
        return {
          success: false,
          error: 'Sync is disabled. Please enable sync first.',
        };
      }

      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated. Please login first.',
        };
      }

      onProgress?.({
        stage: 'uploading',
        progress: 10,
        message: 'Preparing local data...',
      });

      // Get dirty (unsynced) items
      const dirtyItems = await localStorageService.getDirtyItems();
      const totalItems = dirtyItems.wallets.length + dirtyItems.transactions.length + dirtyItems.categories.length;

      if (totalItems === 0) {
        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'No changes to sync',
        });

        return {
          success: true,
          data: { message: 'No changes to sync' },
        };
      }

      onProgress?.({
        stage: 'uploading',
        progress: 30,
        message: `Uploading ${totalItems} items...`,
      });

      // Upload dirty items
      const uploadResult = await this.uploadDirtyItems(dirtyItems);
      if (!uploadResult.success) {
        await localStorageService.logSync('failed', 0, 0, uploadResult.error);
        return uploadResult;
      }

      onProgress?.({
        stage: 'downloading',
        progress: 60,
        message: 'Downloading updates...',
      });

      // Download updates from server
      const downloadResult = await this.downloadUpdates();
      if (!downloadResult.success) {
        await localStorageService.logSync('failed', totalItems, 0, downloadResult.error);
        return downloadResult;
      }

      onProgress?.({
        stage: 'processing',
        progress: 90,
        message: 'Finalizing sync...',
      });

      // Mark uploaded items as synced
      await this.markItemsAsSynced(dirtyItems);

      // Update sync timestamp
      const config2 = await this.getSyncConfig();
      config2.lastSyncReminder = new Date().toISOString();
      await this.setSyncConfig(config2);

      // Log successful sync
      await localStorageService.logSync('success', totalItems, downloadResult.data?.itemsDownloaded || 0);

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Sync completed successfully',
      });

      return {
        success: true,
        data: {
          itemsUploaded: totalItems,
          itemsDownloaded: downloadResult.data?.itemsDownloaded || 0,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await localStorageService.logSync('failed', 0, 0, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async uploadDirtyItems(dirtyItems: {
    wallets: LocalWallet[];
    transactions: LocalTransaction[];
    categories: LocalCategory[];
  }): Promise<CloudSyncResponse> {
    
    // Upload wallets
    for (const wallet of dirtyItems.wallets) {
      const result = await this.makeRequest('/wallets', {
        method: 'POST',
        body: JSON.stringify({
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          balance: wallet.balance,
          color: wallet.color,
          icon: wallet.icon,
          isActive: wallet.isActive,
        }),
      });

      if (!result.success) {
        return result;
      }
    }

    // Upload transactions
    for (const transaction of dirtyItems.transactions) {
      const result = await this.makeRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
          type: transaction.type,
          date: transaction.date,
          notes: transaction.notes,
          walletId: transaction.walletId,
          categoryId: transaction.categoryId,
        }),
      });

      if (!result.success) {
        return result;
      }
    }

    // Upload custom categories
    for (const category of dirtyItems.categories.filter(c => c.isCustom)) {
      const result = await this.makeRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isCustom: category.isCustom,
        }),
      });

      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  private async downloadUpdates(): Promise<CloudSyncResponse> {
    try {
      // For now, just return success
      // In full implementation, download server changes and resolve conflicts
      return {
        success: true,
        data: { itemsDownloaded: 0 },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  private async markItemsAsSynced(dirtyItems: {
    wallets: LocalWallet[];
    transactions: LocalTransaction[];
    categories: LocalCategory[];
  }): Promise<void> {
    const walletIds = dirtyItems.wallets.map(w => w.id);
    const transactionIds = dirtyItems.transactions.map(t => t.id);
    const categoryIds = dirtyItems.categories.map(c => c.id);

    await Promise.all([
      walletIds.length > 0 ? localStorageService.markAsSynced('wallets', walletIds) : Promise.resolve(),
      transactionIds.length > 0 ? localStorageService.markAsSynced('transactions', transactionIds) : Promise.resolve(),
      categoryIds.length > 0 ? localStorageService.markAsSynced('categories', categoryIds) : Promise.resolve(),
    ]);
  }

  // Sync Reminder Logic
  async shouldShowSyncReminder(): Promise<boolean> {
    try {
      const config = await this.getSyncConfig();
      
      // Don't show if sync is disabled
      if (!config.enabled) {
        return false;
      }

      // Don't show if auto-sync is enabled
      if (config.autoSync) {
        return false;
      }

      const lastReminder = config.lastSyncReminder ? new Date(config.lastSyncReminder) : null;
      const lastSync = await localStorageService.getLastSyncDate();
      
      // Check if it's been more than reminderInterval days since last sync or reminder
      const now = new Date();
      const daysSinceLastSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
      const daysSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

      // Show reminder if it's been more than interval days since last sync AND last reminder
      return daysSinceLastSync >= config.reminderInterval && daysSinceLastReminder >= config.reminderInterval;
    } catch (error) {
      console.error('Error checking sync reminder:', error);
      return false;
    }
  }

  async markReminderShown(): Promise<void> {
    const config = await this.getSyncConfig();
    config.lastSyncReminder = new Date().toISOString();
    await this.setSyncConfig(config);
  }

  async getUnsyncedItemsCount(): Promise<number> {
    try {
      const dirtyItems = await localStorageService.getDirtyItems();
      return dirtyItems.wallets.length + dirtyItems.transactions.length + dirtyItems.categories.length;
    } catch (error) {
      console.error('Error getting unsynced items count:', error);
      return 0;
    }
  }

  async getSyncStatus(): Promise<{
    enabled: boolean;
    authenticated: boolean;
    lastSync: Date | null;
    unsyncedItems: number;
    nextReminderDue: Date | null;
  }> {
    const [config, token, lastSync, unsyncedItems] = await Promise.all([
      this.getSyncConfig(),
      this.getAuthToken(),
      localStorageService.getLastSyncDate(),
      this.getUnsyncedItemsCount(),
    ]);

    let nextReminderDue: Date | null = null;
    if (config.enabled && !config.autoSync && config.lastSyncReminder) {
      const lastReminder = new Date(config.lastSyncReminder);
      nextReminderDue = new Date(lastReminder.getTime() + (config.reminderInterval * 24 * 60 * 60 * 1000));
    }

    return {
      enabled: config.enabled,
      authenticated: !!token,
      lastSync,
      unsyncedItems,
      nextReminderDue,
    };
  }

  // Quick sync check for app startup
  async quickSyncCheck(): Promise<void> {
    try {
      const config = await this.getSyncConfig();
      if (config.enabled && config.autoSync) {
        // Perform background sync without blocking UI
        this.performFullSync().catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Quick sync check failed:', error);
    }
  }

  // Notification methods
  async registerPushToken(tokenData: {
    token: string;
    deviceId?: string;
    platform?: string;
    appVersion?: string;
  }): Promise<void> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      throw new Error('Failed to register push token');
    }
  }

  async getNotifications(): Promise<any[]> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_BASE_URL}/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const result = await response.json();
    return result.data?.notifications || [];
  }

  async getNotificationPreferences(): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.log('User not authenticated, skipping notification preferences fetch');
        return null;
      }

      const response = await fetch(`${this.API_BASE_URL}/notifications/preferences`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.log('Error fetching notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(preferences: any): Promise<void> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification preferences');
    }
  }

  // Clear sync data (for account deletion)
  async clearSyncData(): Promise<void> {
    try {
      console.log('🗑️ Clearing sync data...');
      
      // Clear sync settings from AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('sync_enabled');
      await AsyncStorage.default.removeItem('sync_settings');
      await AsyncStorage.default.removeItem('last_sync_date');
      await AsyncStorage.default.removeItem('sync_auth_token');
      await AsyncStorage.default.removeItem('sync_user_id');
      await AsyncStorage.default.removeItem('cloud_sync_config');
      
      console.log('✅ Sync data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing sync data:', error);
      throw error;
    }
  }
}

export const cloudSyncService = new CloudSyncService();