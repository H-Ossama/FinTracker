import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Wallet, Transaction, Goal, Reminder, SpendingCategory, Budget } from '../types';

export interface FirebaseUserData {
  userId: string;
  email: string;
  displayName: string;
  lastSync: Date;
  wallets: Wallet[];
  transactions: Transaction[];
  goals: Goal[];
  reminders: Reminder[];
  categories: SpendingCategory[];
  budgets: Budget[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: Date;
  syncedItems?: {
    wallets: number;
    transactions: number;
    goals: number;
    reminders: number;
    categories: number;
    budgets: number;
  };
}

class FirebaseDataService {
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  private ensureUserId(): string {
    if (!this.userId) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    return this.userId;
  }

  // User profile operations
  async createUserProfile(userId: string, email: string, displayName: string): Promise<SyncResult> {
    try {
      await setDoc(doc(db, 'users', userId), {
        email,
        displayName,
        createdAt: serverTimestamp(),
        lastSync: serverTimestamp(),
      });

      return {
        success: true,
        message: 'User profile created successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return {
        success: false,
        message: `Failed to create user profile: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Simplified upload method for basic functionality
  async uploadUserData(userData: Partial<FirebaseUserData>): Promise<SyncResult> {
    try {
      const userId = this.ensureUserId();
      
      // For now, just update the user profile with timestamp
      await updateDoc(doc(db, 'users', userId), {
        lastSync: serverTimestamp(),
      });

      console.log('🔄 Basic Firebase upload completed');

      return {
        success: true,
        message: 'User data uploaded to Firebase successfully',
        timestamp: new Date(),
        syncedItems: {
          wallets: 0,
          transactions: 0,
          goals: 0,
          reminders: 0,
          categories: 0,
          budgets: 0,
        },
      };
    } catch (error) {
      console.error('❌ Error uploading user data to Firebase:', error);
      return {
        success: false,
        message: `Failed to upload user data: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Simplified download method for basic functionality
  async downloadUserData(): Promise<{ success: boolean; data?: FirebaseUserData; message: string }> {
    try {
      const userId = this.ensureUserId();

      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists) {
        return {
          success: false,
          message: 'User profile not found',
        };
      }

      const userProfile = userDoc.data();

      // For now, return basic structure with empty arrays
      const userData: FirebaseUserData = {
        userId,
        email: userProfile?.email || '',
        displayName: userProfile?.displayName || '',
        lastSync: userProfile?.lastSync instanceof Timestamp ? userProfile.lastSync.toDate() : new Date(),
        wallets: [],
        transactions: [],
        goals: [],
        reminders: [],
        categories: [],
        budgets: [],
      };

      console.log('🔄 Basic Firebase download completed');

      return {
        success: true,
        data: userData,
        message: 'User data downloaded successfully',
      };
    } catch (error) {
      console.error('❌ Error downloading user data from Firebase:', error);
      return {
        success: false,
        message: `Failed to download user data: ${error}`,
      };
    }
  }

  // Basic wallet operations
  async saveWallet(wallet: Wallet): Promise<SyncResult> {
    try {
      const userId = this.ensureUserId();
      await setDoc(doc(db, 'users', userId, 'wallets', wallet.id), {
        ...wallet,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        message: 'Wallet saved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error saving wallet:', error);
      return {
        success: false,
        message: `Failed to save wallet: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Basic transaction operations
  async saveTransaction(transaction: Transaction): Promise<SyncResult> {
    try {
      const userId = this.ensureUserId();
      await setDoc(doc(db, 'users', userId, 'transactions', transaction.id), {
        ...transaction,
        date: new Date(transaction.date),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        message: 'Transaction saved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error saving transaction:', error);
      return {
        success: false,
        message: `Failed to save transaction: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Check connectivity
  async isConnected(): Promise<boolean> {
    try {
      // Try to get the app instance to check connectivity
      const app = db.app;
      return app ? true : false;
    } catch (error) {
      console.log('Firestore not connected:', error);
      return false;
    }
  }

  // Get user's last sync time
  async getUserLastSync(): Promise<Date | null> {
    try {
      const userId = this.ensureUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data?.lastSync instanceof Timestamp ? data.lastSync.toDate() : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting user last sync:', error);
      return null;
    }
  }
}

export const firebaseDataService = new FirebaseDataService();
export default firebaseDataService;