import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleUser } from './googleAuthService';
import { hybridDataService } from './hybridDataService';
import { firebaseDataService, FirebaseUserData } from './firebaseDataService';
import { firebaseAuthService } from './firebaseAuthService';

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
  private syncConfig: SyncConfig = {
    enabled: false,
    autoSync: true,
    lastSyncReminder: null,
    reminderInterval: 7, // 7 days
  };

  // Firebase-based configuration
  private readonly STORAGE_ENDPOINT = 'firebase'; // Identifier for Firebase backend
  private readonly ENCRYPTION_KEY = 'fintracker_user_data_encryption';
  private readonly SYNC_CONFIG_KEY = 'sync_config';
  private readonly AUTH_TOKEN_KEY = 'auth_token';

  // Storage keys for compatibility
  private readonly STORAGE_KEYS = {
    CLOUD_SYNC_ENABLED: 'cloud_sync_enabled',
  } as const;

  // Helper methods for analytics service compatibility
  getApiBaseUrl(): string {
    return 'firebase'; // Return identifier instead of URL
  }
  
  async isAuthenticated(): Promise<boolean> {
    return firebaseAuthService.isAuthenticated();
  }

  /**
   * Upload user data to Firebase Firestore
   */
  async uploadUserData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
      console.log('🔄 Starting Firebase upload for user:', googleUser.user.email);

      // Ensure user is authenticated with Firebase
      if (!firebaseAuthService.isAuthenticated()) {
        throw new Error('User not authenticated with Firebase');
      }

      // Collect all user data
      const userData = await this.collectUserData(googleUser);
      console.log('📦 Collected user data for Firebase upload');

      // Upload to Firebase
      const uploadResult = await firebaseDataService.uploadUserData({
        userId: firebaseAuthService.getUserId()!,
        email: googleUser.user.email,
        displayName: googleUser.user.name,
        wallets: userData.appData.wallets,
        transactions: userData.appData.transactions,
        goals: userData.appData.goals,
        reminders: userData.appData.bills, // Map bills to reminders
        categories: userData.appData.categories,
        budgets: userData.appData.budgets,
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.message);
      }

      // Update local sync timestamp
      await this.updateLastSyncTime();

      console.log('✅ Firebase upload completed successfully');

      return {
        success: true,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Firebase upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Download user data from Firebase Firestore
   */
  async downloadUserData(googleUser: GoogleUser): Promise<{ 
    success: boolean; 
    userData?: UserDataBackup; 
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔄 Starting Firebase download for user:', googleUser.user.email);

      // Ensure user is authenticated with Firebase
      if (!firebaseAuthService.isAuthenticated()) {
        throw new Error('User not authenticated with Firebase');
      }

      // Download from Firebase
      const downloadResult = await firebaseDataService.downloadUserData();

      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.message);
      }

      const firebaseData = downloadResult.data;

      // Convert Firebase data to app format
      const userData: UserDataBackup = {
        user: {
          id: firebaseData.userId,
          email: firebaseData.email,
          name: firebaseData.displayName,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          preferences: {},
        },
        appData: {
          wallets: firebaseData.wallets || [],
          transactions: firebaseData.transactions || [],
          budgets: firebaseData.budgets || [],
          goals: firebaseData.goals || [],
          bills: firebaseData.reminders || [], // Map reminders to bills
          reminders: firebaseData.reminders || [],
          categories: firebaseData.categories || [],
          settings: {},
          insights: {},
        },
        metadata: {
          version: '2.0',
          lastSync: firebaseData.lastSync.toISOString(),
          platform: 'firebase',
          appVersion: '2.0.1',
        },
      };

      console.log('✅ Firebase download completed successfully');

      return {
        success: true,
        userData,
        message: 'User data downloaded from Firebase successfully',
      };
    } catch (error) {
      console.error('❌ Firebase download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error',
      };
    }
  }

  /**
   * Restore user data from backup (Firebase integration)
   */
  async restoreUserData(googleUser: GoogleUser): Promise<SyncResult> {
    try {
      console.log('🔄 Starting Firebase restore for user:', googleUser.user.email);

      // Download data from Firebase
      const downloadResult = await this.downloadUserData(googleUser);

      if (!downloadResult.success || !downloadResult.userData) {
        throw new Error(downloadResult.error || 'No data found to restore');
      }

      const userData = downloadResult.userData;

      // Clear existing local data first
      console.log('🗑️ Clearing all user data...');
      await this.clearAllUserData();

      // Restore data using hybrid data service
      console.log('🏦 Restoring wallets...');
      for (const wallet of userData.appData.wallets) {
        try {
          const type = (wallet as any).type ? String((wallet as any).type).toUpperCase() : 'CASH';
          await hybridDataService.createWallet({
            name: (wallet as any).name || 'Wallet',
            type,
            balance: (wallet as any).balance ?? 0,
            color: (wallet as any).color,
            icon: (wallet as any).icon,
          } as any);
        } catch (e) {
          console.warn('⚠️ Could not restore wallet:', e);
        }
      }

      console.log('💰 Restoring transactions...');
      for (const transaction of userData.appData.transactions) {
        try {
          const type = (transaction as any).type ? String((transaction as any).type).toUpperCase() : 'EXPENSE';
          await hybridDataService.addTransaction({
            amount: Number((transaction as any).amount ?? 0),
            description: (transaction as any).title || (transaction as any).description,
            type,
            date: (transaction as any).date,
            notes: (transaction as any).notes,
            walletId: (transaction as any).walletId,
            categoryId: (transaction as any).categoryId,
          } as any);
        } catch (e) {
          console.warn('⚠️ Could not restore transaction:', e);
        }
      }

      console.log('ℹ️ Skipping goals/budgets/reminders restore (not supported in current service layer)');

      await this.updateLastSyncTime();

      console.log('✅ User data restored successfully from Firebase');

      return {
        success: true,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Firebase restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  /**
   * Collect all user data for backup
   */
  private async collectUserData(googleUser: GoogleUser): Promise<UserDataBackup> {
    console.log('📊 Collecting user data for backup...');

    // Get all data from hybrid data service
    const [wallets, transactions] = await Promise.all([
      hybridDataService.getWallets(),
      hybridDataService.getTransactions(),
    ]);

    const goals: any[] = [];
    const budgets: any[] = [];
    const bills: any[] = [];

    // Get categories from local storage or default
    const categories = await hybridDataService.getCategories();

    console.log(`📊 Collected ${wallets.length} wallets, ${transactions.length} transactions`);

    const userData: UserDataBackup = {
      user: {
        id: googleUser.user.id,
        email: googleUser.user.email,
        name: googleUser.user.name,
        avatar: googleUser.user.photo,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        preferences: {},
      },
      appData: {
        wallets,
        transactions,
        budgets,
        goals,
        bills,
        reminders: bills, // Bills serve as reminders
        categories,
        settings: {},
        insights: {},
      },
      metadata: {
        version: '2.0',
        lastSync: new Date().toISOString(),
        platform: 'firebase',
        appVersion: '2.0.1',
      },
    };

    return userData;
  }

  /**
   * Clear all user data (for restore operations)
   */
  private async clearAllUserData(): Promise<void> {
    await hybridDataService.clearAllData();
    console.log('✅ All user data cleared successfully');
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    await AsyncStorage.setItem('last_cloud_sync', new Date().toISOString());
  }

  /**
   * Get auth token (Firebase ID token)
   */
  async getAuthToken(): Promise<string | null> {
    try {
      if (firebaseAuthService.isAuthenticated()) {
        // In Firebase, we could get the ID token, but for this app we'll use a simple check
        return firebaseAuthService.getUserId();
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Set auth token (for compatibility)
   */
  async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.AUTH_TOKEN_KEY, token);
  }

  /**
   * Enable cloud sync
   */
  async enableCloudSync(): Promise<void> {
    this.syncConfig.enabled = true;
    await AsyncStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfig));
    await AsyncStorage.setItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED, 'true');
    console.log('✅ Cloud sync enabled');
  }

  /**
   * Disable cloud sync
   */
  async disableCloudSync(): Promise<void> {
    this.syncConfig.enabled = false;
    await AsyncStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfig));
    await AsyncStorage.setItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED, 'false');
    console.log('❌ Cloud sync disabled');
  }

  /**
   * Check if cloud sync is enabled
   */
  async isCloudSyncEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      return enabled === 'true';
    } catch (error) {
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
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Check if sync reminder is needed
   */
  async isSyncReminderNeeded(): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) return true;

      const lastSyncDate = new Date(lastSync);
      const daysSinceLastSync = Math.floor(
        (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastSync >= this.syncConfig.reminderInterval;
    } catch (error) {
      console.error('Error checking sync reminder:', error);
      return true;
    }
  }

  /**
   * Setup basic connectivity check (simplified for now)
   */
  setupRealtimeSync(): () => void {
    if (!firebaseAuthService.isAuthenticated()) {
      console.log('User not authenticated, skipping realtime sync setup');
      return () => {};
    }

    console.log('🔄 Firebase realtime sync ready (basic version)');

    // For now, return a simple cleanup function
    // We can implement real-time listeners later
    return () => {
      console.log('🔄 Firebase realtime sync stopped');
    };
  }
}

export const cloudSyncService = new CloudSyncService();
export default cloudSyncService;