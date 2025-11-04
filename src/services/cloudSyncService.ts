import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser } from './googleAuthService';

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
  private readonly STORAGE_ENDPOINT = 'https://fintracker-secure-storage.vercel.app'; // Mock endpoint for demonstration
  private readonly ENCRYPTION_KEY = 'fintracker_user_data_encryption';
  private readonly SYNC_CONFIG_KEY = 'sync_config';
  private readonly AUTH_TOKEN_KEY = 'auth_token';

  // Storage keys for compatibility
  private readonly STORAGE_KEYS = {
    CLOUD_SYNC_ENABLED: 'cloud_sync_enabled',
  } as const;

  // Helper methods for analytics service
  getApiBaseUrl(): string {
    return this.STORAGE_ENDPOINT;
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
      const encryptedData = await this.encryptData(userData);
      
      // In a real implementation, this would upload to a secure cloud service
      // For now, we'll simulate cloud storage with encrypted local storage
      const cloudKey = `cloud_backup_${googleUser.id}`;
      await SecureStore.setItemAsync(cloudKey, JSON.stringify({
        data: encryptedData,
        userEmail: googleUser.email,
        lastSync: new Date().toISOString(),
      }));

      // Store sync metadata
      await AsyncStorage.setItem('last_cloud_sync', new Date().toISOString());
      await AsyncStorage.setItem('cloud_sync_user_id', googleUser.id);

      console.log('✅ User data uploaded to cloud successfully');
      return {
        success: true,
        lastSync: new Date().toISOString(),
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
      const cloudKey = `cloud_backup_${googleUser.id}`;
      const cloudDataStr = await SecureStore.getItemAsync(cloudKey);

      if (!cloudDataStr) {
        console.log('ℹ️ No cloud backup found for user');
        return {
          success: true,
          error: 'No cloud backup found',
        };
      }

      const cloudData = JSON.parse(cloudDataStr);
      const decryptedData = await this.decryptData(cloudData.data);
      
      await this.restoreUserData(decryptedData);

      // Update sync metadata
      await AsyncStorage.setItem('last_cloud_sync', cloudData.lastSync || new Date().toISOString());
      await AsyncStorage.setItem('cloud_sync_user_id', googleUser.id);

      console.log('✅ User data downloaded from cloud successfully');
      return {
        success: true,
        lastSync: cloudData.lastSync,
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
      const localLastSync = await AsyncStorage.getItem('last_cloud_sync');
      const cloudKey = `cloud_backup_${googleUser.id}`;
      const cloudDataStr = await SecureStore.getItemAsync(cloudKey);

      let shouldUpload = true;
      let shouldDownload = false;

      if (cloudDataStr) {
        const cloudData = JSON.parse(cloudDataStr);
        const cloudLastSync = new Date(cloudData.lastSync || 0).getTime();
        const localLastSyncTime = new Date(localLastSync || 0).getTime();

        if (cloudLastSync > localLastSyncTime) {
          // Cloud data is newer, download it
          shouldDownload = true;
          shouldUpload = false;
        }
      }

      if (shouldDownload) {
        return await this.downloadUserData(googleUser);
      } else if (shouldUpload) {
        return await this.uploadUserData(googleUser);
      }

      return {
        success: true,
        lastSync: localLastSync || new Date().toISOString(),
      };
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
  async deleteCloudData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
      const cloudKey = `cloud_backup_${googleUser.id}`;
      await SecureStore.deleteItemAsync(cloudKey);
      
      // Clear sync metadata
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
  async hasCloudBackup(googleUser: GoogleUser): Promise<boolean> {
    try {
      const cloudKey = `cloud_backup_${googleUser.id}`;
      const cloudData = await SecureStore.getItemAsync(cloudKey);
      return cloudData !== null;
    } catch (error) {
      console.error('❌ Error checking cloud backup:', error);
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
        const { hybridDataService } = await import('./hybridDataService');
        const [wallets, transactions] = await Promise.all([
          hybridDataService.getAllWallets(),
          hybridDataService.getAllTransactions(),
        ]);
        hybridData = { wallets, transactions };
      } catch (error) {
        console.log('Could not load hybrid data service');
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
          categories: [], // Add category data if available
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
        const { hybridDataService } = await import('./hybridDataService');
        
        // Clear existing data first
        await hybridDataService.clearAllData();
        
        // Restore wallets
        for (const wallet of backup.appData.wallets) {
          await hybridDataService.saveWallet(wallet);
        }
        
        // Restore transactions
        for (const transaction of backup.appData.transactions) {
          await hybridDataService.saveTransaction(transaction);
        }
      } catch (error) {
        console.log('Could not restore hybrid data service data');
      }

      console.log('✅ User data restored successfully');
    } catch (error) {
      console.error('❌ Error restoring user data:', error);
      throw error;
    }
  }

  private async encryptData(data: UserDataBackup): Promise<string> {
    try {
      // In a real implementation, use proper encryption
      // For now, we'll just base64 encode the JSON string
      const jsonString = JSON.stringify(data);
      return Buffer.from(jsonString).toString('base64');
    } catch (error) {
      console.error('❌ Error encrypting data:', error);
      throw error;
    }
  }

  private async decryptData(encryptedData: string): Promise<UserDataBackup> {
    try {
      // In a real implementation, use proper decryption
      // For now, we'll just base64 decode the string
      const jsonString = Buffer.from(encryptedData, 'base64').toString('utf-8');
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('❌ Error decrypting data:', error);
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
    
    return {
      enabled: config.enabled || cloudSyncEnabled === 'true',
      authenticated: await this.isAuthenticated(),
      lastSync: lastSync ? new Date(lastSync) : null,
      unsyncedItems: 0, // Google sync doesn't track individual items
      nextReminderDue: null, // Simplified for Google sync
    };
  }

  async shouldShowSyncReminder(): Promise<boolean> {
    // Simplified for Google sync - don't show reminders for Google users
    const cloudSyncEnabled = await AsyncStorage.getItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    return cloudSyncEnabled !== 'true'; // Only show for non-Google users
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

      // Report progress
      if (onProgress) {
        onProgress({ stage: 'uploading', progress: 25, message: 'Uploading data...' });
      }

      // For now, we'll use a simplified sync approach
      // In a real implementation, this would perform full bidirectional sync
      const authToken = await this.getAuthToken();
      if (!authToken) {
        return {
          success: false,
          error: 'Authentication token not found',
        };
      }

      // Report progress
      if (onProgress) {
        onProgress({ stage: 'processing', progress: 50, message: 'Processing sync...' });
      }

      // Simulate sync process for demo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Report progress
      if (onProgress) {
        onProgress({ stage: 'downloading', progress: 75, message: 'Downloading updates...' });
      }

      // Update last sync time
      await AsyncStorage.setItem('last_cloud_sync', new Date().toISOString());

      // Report completion
      if (onProgress) {
        onProgress({ stage: 'complete', progress: 100, message: 'Sync complete!' });
      }

      return {
        success: true,
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
      // For demo purposes, we'll simulate a registration
      console.log('📝 Registering user:', email);
      
      // In a real implementation, this would call your backend API
      // For now, we'll just store a mock auth token
      const mockToken = `auth_token_${Date.now()}`;
      await this.setAuthToken(mockToken);
      
      // Store user data
      await AsyncStorage.setItem('user_email', email);
      await AsyncStorage.setItem('user_name', `${firstName} ${lastName}`);
      
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
      // For demo purposes, we'll simulate a login
      console.log('🔑 Logging in user:', email);
      
      // In a real implementation, this would call your backend API
      // For now, we'll just store a mock auth token
      const mockToken = `auth_token_${Date.now()}`;
      await this.setAuthToken(mockToken);
      
      // Store user data
      await AsyncStorage.setItem('user_email', email);
      
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
      await this.clearAuthToken();
      await AsyncStorage.removeItem('user_email');
      await AsyncStorage.removeItem('user_name');
      console.log('👋 User logged out successfully');
    } catch (error) {
      console.error('❌ Logout failed:', error);
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