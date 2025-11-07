import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cloudSyncService } from '../services/cloudSyncService';
import { localStorageService } from '../services/localStorageService';
import { GoogleUser } from '../services/googleAuthService';

export interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

export interface SyncTestReport {
  overall: boolean;
  results: TestResult[];
  summary: {
    originalData: any;
    restoredData: any;
    dataMatches: boolean;
  };
}

export class SyncTester {
  /**
   * Get the current authenticated Google user for testing
   */
  private async getCurrentUser(): Promise<GoogleUser> {
    // Try to get the current Google user from storage
    const userData = await AsyncStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.isGoogleUser && user.googleId) {
        return {
          id: user.googleId,
          email: user.email,
          name: user.name,
          idToken: 'current_user_token',
          accessToken: 'current_user_token',
        };
      }
    }
    
    // Fallback to test user if no Google user found
    return {
      id: 'test_user_123',
      email: 'test@example.com',
      name: 'Test User',
      idToken: 'test_id_token',
      accessToken: 'test_access_token',
    };
  }

  /**
   * Run complete sync test workflow
   */
  async runCompleteSyncTest(): Promise<SyncTestReport> {
    const results: TestResult[] = [];
    let originalData: any = null;
    let restoredData: any = null;

    console.log('\n🧪 SYNC TEST STARTING');
    console.log('================================');

    try {
      const isAuthenticated = await cloudSyncService.isAuthenticated();
      if (!isAuthenticated) {
        const authError = 'Cloud sync requires authentication. Please sign in before running the test.';
        results.push({
          step: 'Verify Cloud Authentication',
          success: false,
          error: authError,
        });
        throw new Error(authError);
      }

      // Step 1: Create test data
      console.log('\n[1/7] Creating test data...');
      const createDataResult = await this.createTestData();
      results.push(createDataResult);
      if (!createDataResult.success) {
        console.log(`❌ FAILED: ${createDataResult.error}`);
        throw new Error('Test data creation failed');
      }
      console.log(`✅ Created ${createDataResult.details?.wallets || 0} wallets, ${createDataResult.details?.transactions || 0} transactions`);

      // Step 2: Capture original data
      console.log('\n[2/7] Capturing baseline data...');
      const captureResult = await this.captureCurrentData();
      results.push(captureResult);
      originalData = captureResult.details;
      console.log(`✅ Captured: ${originalData?.wallets?.length || 0}W, ${originalData?.transactions?.length || 0}T, ${originalData?.budgets?.length || 0}B`);

      // Step 3: Upload data to cloud
      console.log('\n[3/7] Uploading to cloud...');
      const uploadResult = await this.testDataUpload();
      results.push(uploadResult);
      if (!uploadResult.success) {
        console.log(`❌ FAILED: ${uploadResult.error}`);
        throw new Error('Cloud upload failed');
      }
      console.log('✅ Upload successful');

      // Step 4: Clear local data (simulate app reinstall)
      console.log('\n[4/7] Simulating app reinstall...');
      const clearResult = await this.clearLocalData();
      results.push(clearResult);
      console.log('✅ Local data cleared');

      // Step 5: Download data from cloud
      console.log('\n[5/7] Downloading from cloud...');
      const downloadResult = await this.testDataDownload();
      results.push(downloadResult);
      if (!downloadResult.success) {
        console.log(`❌ FAILED: ${downloadResult.error}`);
        throw new Error('Cloud download failed');
      }
      console.log('✅ Download successful');

      // Step 6: Verify data restoration
      console.log('\n[6/7] Verifying restoration...');
      const verifyResult = await this.verifyDataRestoration(originalData);
      results.push(verifyResult);
      restoredData = verifyResult.details;
      console.log(`✅ Restored: ${restoredData?.wallets?.length || 0}W, ${restoredData?.transactions?.length || 0}T, ${restoredData?.budgets?.length || 0}B`);

      // Step 7: Compare data integrity
      console.log('\n[7/7] Checking data integrity...');
      const compareResult = await this.compareDataIntegrity(originalData, restoredData);
      results.push(compareResult);

      const overall = results.every(r => r.success);

      console.log('\n================================');
      if (overall) {
        console.log('🎉 SYNC TEST PASSED - All data synced correctly!');
      } else {
        console.log('💥 SYNC TEST FAILED - Data integrity issues detected');
        if (compareResult.details) {
          const issues = Object.entries(compareResult.details)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
          console.log(`Issues: ${issues.join(', ')}`);
        }
      }
      console.log('================================\n');

      return {
        overall,
        results,
        summary: {
          originalData,
          restoredData,
          dataMatches: compareResult.success,
        },
      };

    } catch (error) {
      console.log('\n💥 SYNC TEST CRASHED');
      console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('================================\n');
      return {
        overall: false,
        results,
        summary: {
          originalData,
          restoredData,
          dataMatches: false,
        },
      };
    }
  }

  /**
   * Create realistic test data
   */
  private async createTestData(): Promise<TestResult> {
    try {
      // Import hybridDataService to create data properly
      const { hybridDataService } = await import('../services/hybridDataService');
      
      // Ensure hybridDataService is initialized
      await hybridDataService.waitForInitialization();

      // Create test wallets using hybridDataService
      const wallet1 = await hybridDataService.createWallet({
        name: 'Test Cash Wallet',
        type: 'CASH',
        balance: 1000,
        color: '#4CAF50',
        icon: 'wallet',
      });

      const wallet2 = await hybridDataService.createWallet({
        name: 'Test Bank Account',
        type: 'BANK',
        balance: 5000,
        color: '#2196F3',
        icon: 'card',
      });

      // Create test transactions using hybridDataService
      const transaction1 = await hybridDataService.createTransaction({
        amount: 50,
        description: 'Test expense 1',
        type: 'EXPENSE',
        date: new Date().toISOString(),
        walletId: wallet1.id,
        notes: 'Sync test expense',
      });

      const transaction2 = await hybridDataService.createTransaction({
        amount: 2000,
        description: 'Test income 1',
        type: 'INCOME',
        date: new Date().toISOString(),
        walletId: wallet2.id,
        notes: 'Sync test income',
      });

      // Create test budget in AsyncStorage (as this is where budgets are stored)
      const testBudget = {
        id: 'budget_1',
        name: 'Test Monthly Budget',
        amount: 3000,
        spent: 500,
        period: 'monthly',
        categories: ['Food', 'Transportation'],
      };
      await AsyncStorage.setItem('budget_data', JSON.stringify([testBudget]));

      // Store user data
      const currentUser = await this.getCurrentUser();
      const userData = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        lastLogin: new Date().toISOString(),
        preferences: {
          theme: 'light',
          currency: 'USD',
          notifications: true,
        },
      };
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      return {
        step: 'Create Test Data',
        success: true,
        details: {
          wallets: 2,
          transactions: 2,
          budgets: 1,
        },
      };
    } catch (error) {
      return {
        step: 'Create Test Data',
        success: false,
        error: error instanceof Error ? error.message : 'Data creation failed',
      };
    }
  }

  /**
   * Capture current data state
   */
  private async captureCurrentData(): Promise<TestResult> {
    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user_data');
      const budgetData = await AsyncStorage.getItem('budget_data');

      // Get wallets and transactions from hybridDataService
      const { hybridDataService } = await import('../services/hybridDataService');
      await hybridDataService.waitForInitialization();
      
      const wallets = await hybridDataService.getWallets();
      const transactions = await hybridDataService.getTransactions();

      const capturedData = {
        user: userData ? JSON.parse(userData) : null,
        wallets: wallets || [],
        transactions: transactions || [],
        budgets: budgetData ? JSON.parse(budgetData) : [],
      };

      return {
        step: 'Capture Current Data',
        success: true,
        details: capturedData,
      };
    } catch (error) {
      return {
        step: 'Capture Current Data',
        success: false,
        error: error instanceof Error ? error.message : 'Data capture failed',
      };
    }
  }

  /**
   * Test data upload to cloud
   */
  private async testDataUpload(): Promise<TestResult> {
    try {
      const currentUser = await this.getCurrentUser();
      const result = await cloudSyncService.uploadUserData(currentUser);

      if (result.success) {
        return {
          step: 'Upload Data to Cloud',
          success: true,
          details: {
            lastSync: result.lastSync,
          },
        };
      } else {
        return {
          step: 'Upload Data to Cloud',
          success: false,
          error: result.error || 'Upload failed',
        };
      }
    } catch (error) {
      return {
        step: 'Upload Data to Cloud',
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Clear all local data (simulate app reinstall)
   */
  private async clearLocalData(): Promise<TestResult> {
    try {
      // Clear all app data keys
      const keysToRemove = [
        'user_data',
        'wallet_data',
        'transaction_data',
        'budget_data',
        'app_settings',
        'sync_settings',
        'notification_preferences',
        'reminders_data',
        'bills_data',
        'goals_data',
      ];

      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));

      // Also clear hybrid data service data
      const { hybridDataService } = await import('../services/hybridDataService');
      await hybridDataService.clearAllData();

      // Verify data is cleared
      const remainingData = await AsyncStorage.getItem('user_data');
      
      return {
        step: 'Clear Local Data',
        success: remainingData === null,
        details: {
          clearedKeys: keysToRemove.length,
          dataRemaining: remainingData !== null,
        },
      };
    } catch (error) {
      return {
        step: 'Clear Local Data',
        success: false,
        error: error instanceof Error ? error.message : 'Data clearing failed',
      };
    }
  }

  /**
   * Test data download from cloud
   */
  private async testDataDownload(): Promise<TestResult> {
    try {
      const currentUser = await this.getCurrentUser();
      const result = await cloudSyncService.downloadUserData(currentUser);

      if (result.success) {
        return {
          step: 'Download Data from Cloud',
          success: true,
          details: {
            lastSync: result.lastSync,
            hasBackup: !result.error,
          },
        };
      } else {
        return {
          step: 'Download Data from Cloud',
          success: false,
          error: result.error || 'Download failed',
        };
      }
    } catch (error) {
      return {
        step: 'Download Data from Cloud',
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Verify data was restored correctly
   */
  private async verifyDataRestoration(originalData: any): Promise<TestResult> {
    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user_data');
      const budgetData = await AsyncStorage.getItem('budget_data');

      // Get wallets and transactions from hybridDataService
      const { hybridDataService } = await import('../services/hybridDataService');
      await hybridDataService.waitForInitialization();
      
      const wallets = await hybridDataService.getWallets();
      const transactions = await hybridDataService.getTransactions();

      const restoredData = {
        user: userData ? JSON.parse(userData) : null,
        wallets: wallets || [],
        transactions: transactions || [],
        budgets: budgetData ? JSON.parse(budgetData) : [],
      };

      const hasData = restoredData.user !== null || 
                      restoredData.wallets.length > 0 || 
                      restoredData.transactions.length > 0 || 
                      restoredData.budgets.length > 0;

      return {
        step: 'Verify Data Restoration',
        success: hasData,
        details: restoredData,
      };
    } catch (error) {
      return {
        step: 'Verify Data Restoration',
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Compare original and restored data for integrity
   */
  private async compareDataIntegrity(originalData: any, restoredData: any): Promise<TestResult> {
    try {
      if (!originalData || !restoredData) {
        return {
          step: 'Compare Data Integrity',
          success: false,
          error: 'Missing comparison data',
        };
      }

      const comparisons = {
        userDataMatches: this.deepCompare(originalData.user, restoredData.user),
        walletsMatch: this.deepCompare(originalData.wallets, restoredData.wallets),
        transactionsMatch: this.deepCompare(originalData.transactions, restoredData.transactions),
        budgetsMatch: this.deepCompare(originalData.budgets, restoredData.budgets),
      };

      const allMatch = Object.values(comparisons).every(match => match);

      return {
        step: 'Compare Data Integrity',
        success: allMatch,
        details: comparisons,
        error: allMatch ? undefined : 'Data mismatch detected',
      };
    } catch (error) {
      return {
        step: 'Compare Data Integrity',
        success: false,
        error: error instanceof Error ? error.message : 'Comparison failed',
      };
    }
  }

  /**
   * Deep compare two objects/arrays with some flexibility for sync-related fields
   */
  private deepCompare(obj1: any, obj2: any): boolean {
    try {
      // If both are null/undefined, they match
      if (obj1 == null && obj2 == null) return true;
      if (obj1 == null || obj2 == null) return false;

      // For arrays, compare by length and content
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        
        // For wallets and transactions, compare core data ignoring sync metadata
        return obj1.every((item1, index) => {
          const item2 = obj2[index];
          if (!item1 || !item2) return false;
          
          // Compare core fields that should be identical
          if (item1.id && item2.id) {
            // For wallets/transactions, compare essential data
            const coreFields = ['id', 'name', 'type', 'balance', 'amount', 'description', 'walletId'];
            return coreFields.every(field => {
              if (item1[field] !== undefined || item2[field] !== undefined) {
                return item1[field] === item2[field];
              }
              return true;
            });
          }
          
          // Fallback to exact comparison for other objects
          return JSON.stringify(item1) === JSON.stringify(item2);
        });
      }

      // For objects, do flexible comparison
      if (typeof obj1 === 'object' && typeof obj2 === 'object') {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        // Core fields that must match exactly
        const coreFields = ['id', 'email', 'name', 'preferences'];
        const importantFields = keys1.filter(key => coreFields.includes(key));
        
        return importantFields.every(key => {
          return this.deepCompare(obj1[key], obj2[key]);
        });
      }

      // For primitive values, compare directly
      return obj1 === obj2;
    } catch {
      return false;
    }
  }

  /**
   * Print detailed test report
   */
  printTestReport(report: SyncTestReport): void {
    console.log('\n📋 SYNC TEST SUMMARY');
    console.log('====================');
    
    // Overall result
    const resultIcon = report.overall ? '✅' : '❌';
    const resultText = report.overall ? 'PASSED' : 'FAILED';
    console.log(`${resultIcon} Result: ${resultText}`);
    
    // Failed steps only
    const failedSteps = report.results.filter(r => !r.success);
    if (failedSteps.length > 0) {
      console.log('\n❌ Failed Steps:');
      failedSteps.forEach(step => {
        console.log(`   • ${step.step}: ${step.error}`);
      });
    }

    // Data integrity summary
    if (report.summary.originalData && report.summary.restoredData) {
      const orig = report.summary.originalData;
      const rest = report.summary.restoredData;
      console.log('\n📊 Data Counts:');
      console.log(`   Original:  ${orig.wallets?.length || 0}W, ${orig.transactions?.length || 0}T, ${orig.budgets?.length || 0}B`);
      console.log(`   Restored:  ${rest.wallets?.length || 0}W, ${rest.transactions?.length || 0}T, ${rest.budgets?.length || 0}B`);
      console.log(`   Integrity: ${report.summary.dataMatches ? '✅' : '❌'}`);
    }

    console.log('====================\n');
  }
}

export const syncTester = new SyncTester();