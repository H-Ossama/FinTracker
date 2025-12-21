/**
 * Simple Cloud Backup Service
 * 
 * A straightforward Firebase-only backup/restore solution that:
 * - Uses Firebase Authentication (already working)
 * - Stores all app data in Firestore under the user's document
 * - No dependency on external backend servers
 * - Simple, reliable, and easy to debug
 */

import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseAuthService } from './firebaseAuthService';
import { localStorageService, LocalWallet, LocalTransaction, LocalCategory } from './localStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface BackupData {
  // Core financial data (from SQLite)
  wallets: LocalWallet[];
  transactions: LocalTransaction[];
  categories: LocalCategory[];
  
  // Additional app data (from AsyncStorage)
  goals: any[];
  budgets: any[];
  bills: any[];
  reminders: any[];
  
  // Settings
  settings: {
    appSettings?: any;
    notificationPreferences?: any;
  };
  
  // Metadata
  metadata: {
    version: string;
    createdAt: string;
    deviceInfo?: string;
    itemCounts: {
      wallets: number;
      transactions: number;
      categories: number;
      goals: number;
      budgets: number;
      bills: number;
      reminders: number;
    };
  };
}

export interface BackupResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  itemsBackedUp?: number;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  itemsRestored?: number;
  backupDate?: string;
}

export interface BackupInfo {
  exists: boolean;
  lastBackup?: string;
  itemCounts?: {
    wallets: number;
    transactions: number;
    categories: number;
    goals: number;
    budgets: number;
    bills: number;
    reminders: number;
  };
}

export interface SyncProgress {
  stage: 'preparing' | 'collecting' | 'uploading' | 'downloading' | 'restoring' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

type ProgressCallback = (progress: SyncProgress) => void;

class SimpleCloudBackupService {
  private readonly BACKUP_COLLECTION = 'userBackups';
  private readonly APP_VERSION = '2.5.1';

  /**
   * Check if user is authenticated with Firebase
   */
  isAuthenticated(): boolean {
    return firebaseAuthService.isAuthenticated();
  }

  /**
   * Get current Firebase user ID
   */
  getUserId(): string | null {
    return firebaseAuthService.getUserId();
  }

  /**
   * Get current user email
   */
  getUserEmail(): string | null {
    return firebaseAuthService.getUserEmail();
  }

  /**
   * Check if a backup exists for the current user
   */
  async getBackupInfo(): Promise<BackupInfo> {
    try {
      const userId = this.getUserId();
      if (!userId) {
        return { exists: false };
      }

      const backupRef = doc(db, this.BACKUP_COLLECTION, userId);
      const backupSnap = await getDoc(backupRef);

      if (!backupSnap.exists()) {
        return { exists: false };
      }

      const data = backupSnap.data();
      const lastBackup = data.metadata?.createdAt;
      
      return {
        exists: true,
        lastBackup: lastBackup instanceof Timestamp 
          ? lastBackup.toDate().toISOString() 
          : lastBackup,
        itemCounts: data.metadata?.itemCounts,
      };
    } catch (error) {
      console.error('❌ Error checking backup info:', error);
      return { exists: false };
    }
  }

  /**
   * Collect all app data for backup
   */
  private async collectAllData(onProgress?: ProgressCallback): Promise<BackupData> {
    onProgress?.({
      stage: 'collecting',
      progress: 10,
      message: 'Collecting wallet data...',
    });

    // Collect SQLite data
    const wallets = await localStorageService.getWallets();
    
    onProgress?.({
      stage: 'collecting',
      progress: 25,
      message: 'Collecting transactions...',
    });

    const transactions = await localStorageService.getTransactions();
    
    onProgress?.({
      stage: 'collecting',
      progress: 40,
      message: 'Collecting categories...',
    });

    const categories = await localStorageService.getCategories();

    onProgress?.({
      stage: 'collecting',
      progress: 55,
      message: 'Collecting goals and budgets...',
    });

    // Collect AsyncStorage data
    const [
      goalsData,
      budgetData,
      billsData,
      remindersData,
      appSettings,
      notificationPreferences,
    ] = await Promise.all([
      AsyncStorage.getItem('goals_data'),
      AsyncStorage.getItem('budget_data'),
      AsyncStorage.getItem('bills_data'),
      AsyncStorage.getItem('reminders_data'),
      AsyncStorage.getItem('app_settings'),
      AsyncStorage.getItem('notification_preferences'),
    ]);

    onProgress?.({
      stage: 'collecting',
      progress: 70,
      message: 'Preparing backup package...',
    });

    const goals = goalsData ? JSON.parse(goalsData) : [];
    const budgets = budgetData ? JSON.parse(budgetData) : [];
    const bills = billsData ? JSON.parse(billsData) : [];
    const reminders = remindersData ? JSON.parse(remindersData) : [];

    const backupData: BackupData = {
      wallets,
      transactions,
      categories,
      goals,
      budgets,
      bills,
      reminders,
      settings: {
        appSettings: appSettings ? JSON.parse(appSettings) : null,
        notificationPreferences: notificationPreferences ? JSON.parse(notificationPreferences) : null,
      },
      metadata: {
        version: this.APP_VERSION,
        createdAt: new Date().toISOString(),
        itemCounts: {
          wallets: wallets.length,
          transactions: transactions.length,
          categories: categories.length,
          goals: goals.length,
          budgets: budgets.length,
          bills: bills.length,
          reminders: reminders.length,
        },
      },
    };

    console.log(`📦 Collected: ${wallets.length} wallets, ${transactions.length} transactions, ${categories.length} categories`);
    console.log(`📦 Additional: ${goals.length} goals, ${budgets.length} budgets, ${bills.length} bills, ${reminders.length} reminders`);

    return backupData;
  }

  /**
   * Backup all app data to Firebase
   */
  async backup(onProgress?: ProgressCallback): Promise<BackupResult> {
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing backup...',
      });

      // Check authentication
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Please sign in with Google to backup your data',
        };
      }

      const userId = this.getUserId();
      if (!userId) {
        return {
          success: false,
          error: 'User ID not found',
        };
      }

      // Collect all data
      const backupData = await this.collectAllData(onProgress);

      onProgress?.({
        stage: 'uploading',
        progress: 80,
        message: 'Uploading to cloud...',
      });

      // Save to Firestore
      const backupRef = doc(db, this.BACKUP_COLLECTION, userId);
      await setDoc(backupRef, {
        ...backupData,
        userId,
        email: this.getUserEmail(),
        updatedAt: serverTimestamp(),
      });

      // Update local last backup time
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem('last_cloud_backup', timestamp);

      const totalItems = 
        backupData.wallets.length +
        backupData.transactions.length +
        backupData.categories.length +
        backupData.goals.length +
        backupData.budgets.length +
        backupData.bills.length +
        backupData.reminders.length;

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Backup complete! ${totalItems} items saved.`,
      });

      console.log(`✅ Backup complete: ${totalItems} items saved to cloud`);

      return {
        success: true,
        timestamp,
        itemsBackedUp: totalItems,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      console.error('❌ Backup failed:', error);

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Backup failed',
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Restore all app data from Firebase
   */
  async restore(onProgress?: ProgressCallback): Promise<RestoreResult> {
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing restore...',
      });

      // Check authentication
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Please sign in with Google to restore your data',
        };
      }

      const userId = this.getUserId();
      if (!userId) {
        return {
          success: false,
          error: 'User ID not found',
        };
      }

      onProgress?.({
        stage: 'downloading',
        progress: 10,
        message: 'Downloading backup...',
      });

      // Get backup from Firestore
      const backupRef = doc(db, this.BACKUP_COLLECTION, userId);
      const backupSnap = await getDoc(backupRef);

      if (!backupSnap.exists()) {
        return {
          success: false,
          error: 'No backup found. Create a backup first!',
        };
      }

      const backupData = backupSnap.data() as BackupData & { updatedAt?: Timestamp };

      onProgress?.({
        stage: 'restoring',
        progress: 20,
        message: 'Clearing existing data...',
      });

      // Clear existing local data
      await localStorageService.clearAllData();
      await localStorageService.initializeDatabase();

      onProgress?.({
        stage: 'restoring',
        progress: 30,
        message: 'Restoring wallets...',
      });

      // Restore wallets
      let restoredCount = 0;
      const totalWallets = backupData.wallets?.length || 0;
      for (let i = 0; i < totalWallets; i++) {
        const wallet = backupData.wallets[i];
        await localStorageService.restoreWallet(wallet);
        restoredCount++;
        
        const progress = 30 + Math.round((i / Math.max(totalWallets, 1)) * 15);
        onProgress?.({
          stage: 'restoring',
          progress,
          message: `Restored ${i + 1}/${totalWallets} wallets...`,
        });
      }

      onProgress?.({
        stage: 'restoring',
        progress: 45,
        message: 'Restoring transactions...',
      });

      // Restore transactions
      const totalTransactions = backupData.transactions?.length || 0;
      for (let i = 0; i < totalTransactions; i++) {
        const transaction = backupData.transactions[i];
        await localStorageService.restoreTransaction(transaction);
        restoredCount++;
        
        // Update progress every 10 transactions
        if (i % 10 === 0 || i === totalTransactions - 1) {
          const progress = 45 + Math.round((i / Math.max(totalTransactions, 1)) * 25);
          onProgress?.({
            stage: 'restoring',
            progress,
            message: `Restored ${i + 1}/${totalTransactions} transactions...`,
          });
        }
      }

      onProgress?.({
        stage: 'restoring',
        progress: 75,
        message: 'Restoring goals and budgets...',
      });

      // Restore AsyncStorage data
      if (backupData.goals && backupData.goals.length > 0) {
        await AsyncStorage.setItem('goals_data', JSON.stringify(backupData.goals));
        restoredCount += backupData.goals.length;
      }

      if (backupData.budgets && backupData.budgets.length > 0) {
        await AsyncStorage.setItem('budget_data', JSON.stringify(backupData.budgets));
        restoredCount += backupData.budgets.length;
      }

      if (backupData.bills && backupData.bills.length > 0) {
        await AsyncStorage.setItem('bills_data', JSON.stringify(backupData.bills));
        restoredCount += backupData.bills.length;
      }

      if (backupData.reminders && backupData.reminders.length > 0) {
        await AsyncStorage.setItem('reminders_data', JSON.stringify(backupData.reminders));
        restoredCount += backupData.reminders.length;
      }

      onProgress?.({
        stage: 'restoring',
        progress: 90,
        message: 'Restoring settings...',
      });

      // Restore settings
      if (backupData.settings?.appSettings) {
        await AsyncStorage.setItem('app_settings', JSON.stringify(backupData.settings.appSettings));
      }

      if (backupData.settings?.notificationPreferences) {
        await AsyncStorage.setItem('notification_preferences', JSON.stringify(backupData.settings.notificationPreferences));
      }

      // Update restore timestamp
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem('last_cloud_restore', timestamp);

      const backupDate = backupData.updatedAt instanceof Timestamp
        ? backupData.updatedAt.toDate().toISOString()
        : backupData.metadata?.createdAt;

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Restore complete! ${restoredCount} items restored.`,
      });

      console.log(`✅ Restore complete: ${restoredCount} items restored from cloud`);

      return {
        success: true,
        timestamp,
        itemsRestored: restoredCount,
        backupDate,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      console.error('❌ Restore failed:', error);

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Restore failed',
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete cloud backup
   */
  async deleteBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Please sign in to delete your backup',
        };
      }

      const userId = this.getUserId();
      if (!userId) {
        return {
          success: false,
          error: 'User ID not found',
        };
      }

      const backupRef = doc(db, this.BACKUP_COLLECTION, userId);
      await deleteDoc(backupRef);

      await AsyncStorage.removeItem('last_cloud_backup');
      await AsyncStorage.removeItem('last_cloud_restore');

      console.log('✅ Cloud backup deleted');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      console.error('❌ Delete backup failed:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get last backup/restore timestamps
   */
  async getLastSyncTimes(): Promise<{
    lastBackup: string | null;
    lastRestore: string | null;
  }> {
    const [lastBackup, lastRestore] = await Promise.all([
      AsyncStorage.getItem('last_cloud_backup'),
      AsyncStorage.getItem('last_cloud_restore'),
    ]);

    return { lastBackup, lastRestore };
  }

  /**
   * Quick check if backup is needed (more than 24 hours since last backup)
   */
  async isBackupRecommended(): Promise<boolean> {
    try {
      const lastBackup = await AsyncStorage.getItem('last_cloud_backup');
      if (!lastBackup) {
        return true; // No backup ever made
      }

      const lastBackupDate = new Date(lastBackup);
      const now = new Date();
      const hoursSinceBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);

      return hoursSinceBackup > 24;
    } catch {
      return true;
    }
  }
}

export const simpleCloudBackupService = new SimpleCloudBackupService();
export default simpleCloudBackupService;
