import { localStorageService, LocalWallet, LocalTransaction, LocalCategory } from './localStorageService';
import { cloudSyncService } from './cloudSyncService';

interface HybridWallet extends Omit<LocalWallet, 'isDirty'> {
  syncStatus: 'synced' | 'local_only' | 'pending_sync' | 'conflict';
}

interface HybridTransaction extends Omit<LocalTransaction, 'isDirty'> {
  syncStatus: 'synced' | 'local_only' | 'pending_sync' | 'conflict';
}

interface AppInitResult {
  success: boolean;
  error?: string;
  syncStatus: {
    enabled: boolean;
    authenticated: boolean;
    pendingItems: number;
  };
}

class HybridDataService {
  private isInitialized = false;

  // App Initialization
  async initializeApp(): Promise<AppInitResult> {
    try {
      // Initialize local database
      await localStorageService.initializeDatabase();
      
      // Seed default categories if needed
      const categories = await localStorageService.getCategories();
      if (categories.length === 0) {
        await localStorageService.seedDefaultCategories();
      }

      // Seed default wallets if needed
      const wallets = await localStorageService.getWallets();
      if (wallets.length === 0) {
        await this.seedDefaultWallets();
      }

      // Seed sample transactions if needed (only for demo purposes)
      const transactions = await localStorageService.getTransactions();
      if (transactions.length === 0) {
        await this.seedSampleTransactions();
      }

      // Check sync status
      const syncStatus = await cloudSyncService.getSyncStatus();
      
      // Perform quick sync check if enabled
      await cloudSyncService.quickSyncCheck();
      
      // Check if sync reminder should be shown
      const shouldRemind = await cloudSyncService.shouldShowSyncReminder();
      if (shouldRemind) {
        // This will be handled by the UI component
        console.log('Sync reminder needed');
      }

      this.isInitialized = true;

      return {
        success: true,
        syncStatus: {
          enabled: syncStatus.enabled,
          authenticated: syncStatus.authenticated,
          pendingItems: syncStatus.unsyncedItems,
        },
      };
    } catch (error) {
      console.error('App initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
        syncStatus: {
          enabled: false,
          authenticated: false,
          pendingItems: 0,
        },
      };
    }
  }

  // Wallet Operations (Always work locally first)
  async createWallet(walletData: {
    name: string;
    type: 'BANK' | 'CASH' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'OTHER';
    balance?: number;
    color?: string;
    icon?: string;
  }): Promise<HybridWallet> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    // Create locally first
    const wallet = await localStorageService.createWallet({
      ...walletData,
      balance: walletData.balance || 0,
      color: walletData.color || '#3B82F6',
      icon: walletData.icon || 'wallet',
      isActive: true,
    });

    // Convert to hybrid format
    return this.convertWalletToHybrid(wallet);
  }

  async getWallets(): Promise<HybridWallet[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    const wallets = await localStorageService.getWallets();
    return wallets.map(wallet => this.convertWalletToHybrid(wallet));
  }

  async updateWallet(id: string, updates: Partial<LocalWallet>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    await localStorageService.updateWallet(id, updates);
  }

  async deleteWallet(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    await localStorageService.deleteWallet(id);
  }

  // Transaction Operations
  async createTransaction(transactionData: {
    amount: number;
    description?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    date?: string;
    notes?: string;
    walletId: string;
    categoryId?: string;
  }): Promise<HybridTransaction> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    // Create locally first
    const transaction = await localStorageService.createTransaction({
      ...transactionData,
      date: transactionData.date || new Date().toISOString(),
    });

    // Convert to hybrid format
    return this.convertTransactionToHybrid(transaction);
  }

  // Alias for createTransaction for backward compatibility
  async addTransaction(transactionData: {
    amount: number;
    description?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    date?: string;
    notes?: string;
    walletId: string;
    categoryId?: string;
  }): Promise<HybridTransaction> {
    return this.createTransaction(transactionData);
  }

  async getTransactions(walletId?: string, limit?: number): Promise<HybridTransaction[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    const transactions = await localStorageService.getTransactions(walletId, limit);
    return transactions.map(transaction => this.convertTransactionToHybrid(transaction));
  }

  async getRecentTransactions(limit: number = 10): Promise<HybridTransaction[]> {
    return this.getTransactions(undefined, limit);
  }

  // Transfer Operations
  async transferMoney(transfer: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    description?: string;
    fee?: number;
  }): Promise<{
    fromTransaction: HybridTransaction;
    toTransaction: HybridTransaction;
    fromWalletBalance: number;
    toWalletBalance: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    const result = await localStorageService.transferMoney(transfer);

    return {
      fromTransaction: this.convertTransactionToHybrid(result.fromTransaction),
      toTransaction: this.convertTransactionToHybrid(result.toTransaction),
      fromWalletBalance: result.fromWalletBalance,
      toWalletBalance: result.toWalletBalance,
    };
  }

  // Wallet Transaction History
  async getWalletTransactions(walletId: string, limit: number = 50, offset: number = 0): Promise<{
    transactions: HybridTransaction[];
    total: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    const result = await localStorageService.getWalletTransactions(walletId, limit, offset);
    
    return {
      transactions: result.transactions.map(transaction => this.convertTransactionToHybrid(transaction)),
      total: result.total,
    };
  }

  // Balance History
  async getWalletBalanceHistory(walletId: string, days: number = 30): Promise<{
    wallet: HybridWallet | null;
    balanceHistory: Array<{ date: string; balance: number }>;
  }> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    const result = await localStorageService.getWalletBalanceHistory(walletId, days);
    
    return {
      wallet: result.wallet ? this.convertWalletToHybrid(result.wallet) : null,
      balanceHistory: result.balanceHistory,
    };
  }

  // Category Operations
  async getCategories(): Promise<LocalCategory[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initializeApp() first.');
    }

    return localStorageService.getCategories();
  }

  // Analytics (Local calculations)
  async getWalletBalance(): Promise<number> {
    const wallets = await this.getWallets();
    return wallets.reduce((total, wallet) => total + wallet.balance, 0);
  }

  async getMonthlySpending(year?: number, month?: number): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  }> {
    const transactions = await this.getTransactions();
    
    const targetDate = new Date(year || new Date().getFullYear(), month || new Date().getMonth());
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
    });

    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: monthlyTransactions.length,
    };
  }

  async getCategorySpending(categoryId: string, days: number = 30): Promise<{
    totalSpent: number;
    transactionCount: number;
    averagePerTransaction: number;
  }> {
    const transactions = await this.getTransactions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const categoryTransactions = transactions.filter(t => 
      t.categoryId === categoryId && 
      t.type === 'EXPENSE' &&
      new Date(t.date) >= cutoffDate
    );

    const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = categoryTransactions.length;

    return {
      totalSpent,
      transactionCount,
      averagePerTransaction: transactionCount > 0 ? totalSpent / transactionCount : 0,
    };
  }

  // Sync Operations
  async enableCloudSync(email?: string, password?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (email && password) {
        // Login if credentials provided
        const result = await cloudSyncService.login(email, password);
        if (!result.success) {
          return result;
        }
      }

      await cloudSyncService.enableSync();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable sync',
      };
    }
  }

  async disableCloudSync(): Promise<void> {
    await cloudSyncService.disableSync();
  }

  async performManualSync(onProgress?: (progress: any) => void): Promise<{ success: boolean; error?: string }> {
    return cloudSyncService.performFullSync(onProgress);
  }

  async getSyncStatus(): Promise<{
    enabled: boolean;
    authenticated: boolean;
    lastSync: Date | null;
    unsyncedItems: number;
    nextReminderDue: Date | null;
  }> {
    return cloudSyncService.getSyncStatus();
  }

  async shouldShowSyncReminder(): Promise<boolean> {
    return cloudSyncService.shouldShowSyncReminder();
  }

  async markSyncReminderShown(): Promise<void> {
    await cloudSyncService.markReminderShown();
  }

  // User Authentication
  async registerUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean; error?: string }> {
    const result = await cloudSyncService.register(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    );

    if (result.success) {
      // Perform initial sync after registration
      await this.performManualSync();
    }

    return result;
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const result = await cloudSyncService.login(email, password);
    
    if (result.success) {
      // Enable sync and perform initial sync
      await cloudSyncService.enableSync();
      await this.performManualSync();
    }

    return result;
  }

  async logoutUser(): Promise<void> {
    await cloudSyncService.logout();
  }

  // Helper Methods
  private convertWalletToHybrid(wallet: LocalWallet): HybridWallet {
    const syncStatus = wallet.lastSynced 
      ? 'synced' 
      : wallet.isDirty 
        ? 'pending_sync' 
        : 'local_only';

    const { isDirty, ...walletData } = wallet;
    return {
      ...walletData,
      syncStatus: syncStatus as any,
    };
  }

  private async seedSampleTransactions(): Promise<void> {
    try {
      // Get the wallets first
      const wallets = await localStorageService.getWallets();
      if (wallets.length === 0) return;

      // Get categories for more realistic transactions
      const categories = await localStorageService.getCategories();
      const foodCategory = categories.find(c => c.name.includes('Food') || c.name.includes('Dining'));
      const shoppingCategory = categories.find(c => c.name.includes('Shopping'));
      const salaryCategory = categories.find(c => c.name.includes('Salary'));

      const bankWallet = wallets.find(w => w.type === 'BANK');
      const cashWallet = wallets.find(w => w.type === 'CASH');

      if (!bankWallet || !cashWallet) return;

      const sampleTransactions = [
        {
          amount: 3500,
          description: 'Monthly Salary',
          type: 'INCOME' as const,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          walletId: bankWallet.id,
          categoryId: salaryCategory?.id,
        },
        {
          amount: 85.50,
          description: 'Grocery Shopping',
          type: 'EXPENSE' as const,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          walletId: bankWallet.id,
          categoryId: foodCategory?.id,
        },
        {
          amount: 15.75,
          description: 'Coffee & Pastry',
          type: 'EXPENSE' as const,
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          walletId: cashWallet.id,
          categoryId: foodCategory?.id,
        },
        {
          amount: 120.00,
          description: 'Online Shopping',
          type: 'EXPENSE' as const,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          walletId: bankWallet.id,
          categoryId: shoppingCategory?.id,
        },
        {
          amount: 200.00,
          description: 'Transfer from Bank to Cash',
          type: 'TRANSFER' as const,
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
          walletId: cashWallet.id,
        },
      ];

      for (const transactionData of sampleTransactions) {
        await localStorageService.createTransaction(transactionData);
      }

      console.log('✅ Sample transactions seeded');
    } catch (error) {
      console.error('Error seeding sample transactions:', error);
      throw error;
    }
  }

  private async seedDefaultWallets(): Promise<void> {
    const defaultWallets = [
      {
        name: 'Pocket Money',
        type: 'CASH' as const,
        balance: 100,
        color: '#7ED321',
        icon: 'wallet',
        isActive: true,
      },
      {
        name: 'Bank Account',
        type: 'BANK' as const,
        balance: 2500,
        color: '#4A90E2',
        icon: 'card',
        isActive: true,
      },
      {
        name: 'Savings',
        type: 'SAVINGS' as const,
        balance: 1000,
        color: '#9013FE',
        icon: 'shield-checkmark',
        isActive: true,
      },
    ];

    try {
      for (const walletData of defaultWallets) {
        await localStorageService.createWallet(walletData);
      }
      console.log('✅ Default wallets seeded');
    } catch (error) {
      console.error('Error seeding default wallets:', error);
      throw error;
    }
  }

  private convertTransactionToHybrid(transaction: LocalTransaction): HybridTransaction {
    const syncStatus = transaction.lastSynced 
      ? 'synced' 
      : transaction.isDirty 
        ? 'pending_sync' 
        : 'local_only';

    const { isDirty, ...transactionData } = transaction;
    return {
      ...transactionData,
      syncStatus: syncStatus as any,
    };
  }

  // Data Export/Import for backup
  async exportAllData(): Promise<{
    wallets: HybridWallet[];
    transactions: HybridTransaction[];
    categories: LocalCategory[];
    exportDate: string;
  }> {
    const [wallets, transactions, categories] = await Promise.all([
      this.getWallets(),
      this.getTransactions(),
      this.getCategories(),
    ]);

    return {
      wallets,
      transactions,
      categories,
      exportDate: new Date().toISOString(),
    };
  }

  // Quick stats for dashboard
  async getDashboardStats(): Promise<{
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    recentTransactions: HybridTransaction[];
    syncStatus: {
      enabled: boolean;
      pendingItems: number;
      lastSync: Date | null;
    };
  }> {
    const [totalBalance, monthlyData, recentTransactions, syncStatus] = await Promise.all([
      this.getWalletBalance(),
      this.getMonthlySpending(),
      this.getRecentTransactions(5),
      this.getSyncStatus(),
    ]);

    return {
      totalBalance,
      monthlyIncome: monthlyData.totalIncome,
      monthlyExpenses: monthlyData.totalExpenses,
      recentTransactions,
      syncStatus: {
        enabled: syncStatus.enabled,
        pendingItems: syncStatus.unsyncedItems,
        lastSync: syncStatus.lastSync,
      },
    };
  }

  // Notification methods
  async registerPushToken(tokenData: {
    token: string;
    deviceId?: string;
    platform?: string;
    appVersion?: string;
  }): Promise<void> {
    try {
      // Try to register with backend if online
      await cloudSyncService.registerPushToken(tokenData);
    } catch (error) {
      console.log('Could not register push token with backend:', error);
      // Store locally for later sync
      // You could implement local storage for push tokens here
    }
  }

  async getNotifications(): Promise<any[]> {
    try {
      // Try to get from backend first
      return await cloudSyncService.getNotifications();
    } catch (error) {
      console.log('Could not fetch notifications from backend:', error);
      // Return empty array or local notifications if stored
      return [];
    }
  }

  async getNotificationPreferences(): Promise<any> {
    try {
      // Try to get from backend first
      return await cloudSyncService.getNotificationPreferences();
    } catch (error) {
      console.log('Could not fetch notification preferences from backend:', error);
      // Return null to use defaults
      return null;
    }
  }

  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      // Try to update on backend
      await cloudSyncService.updateNotificationPreferences(preferences);
    } catch (error) {
      console.log('Could not update notification preferences on backend:', error);
      // Store locally for later sync
      // You could implement local storage for preferences here
    }
  }
}

export const hybridDataService = new HybridDataService();
export type { HybridWallet, HybridTransaction, AppInitResult };