import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api';

export interface CloudBackupResult {
  success: boolean;
  backup?: {
    id: string;
    timestamp: string;
    version: string;
  };
  error?: string;
}

export interface CloudRestoreResult {
  success: boolean;
  data?: {
    wallets: any[];
    transactions: any[];
    categories: any[];
    budgets: any[];
    bills: any[];
    reminders: any[];
    goals: any[];
  };
  timestamp?: string;
  version?: string;
  error?: string;
}

export interface CloudMergeResult {
  success: boolean;
  merged?: any;
  strategy?: string;
  error?: string;
}

/**
 * Real Cloud Sync Service
 * Uses your backend API to backup and restore data
 */
class RealCloudSyncService {
  private readonly syncEndpoint = `${API_BASE_URL}/sync`;
  private readonly requestTimeout = 30000; // 30 seconds

  /**
   * Get authentication token from local storage
   */
  private async getAuthToken(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please sign in first.');
      }
      return token;
    } catch (error) {
      throw new Error(`Auth token retrieval failed: ${error}`);
    }
  }

  /**
   * Backup data to cloud server
   */
  async backupData(data: {
    wallets: any[];
    transactions: any[];
    categories: any[];
    budgets?: any[];
    bills?: any[];
    reminders?: any[];
    goals?: any[];
  }): Promise<CloudBackupResult> {
    try {
      console.log('🔄 Starting cloud backup...');
      const token = await this.getAuthToken();

      const backupPayload = {
        wallets: data.wallets || [],
        transactions: data.transactions || [],
        categories: data.categories || [],
        budgets: data.budgets || [],
        bills: data.bills || [],
        reminders: data.reminders || [],
        goals: data.goals || [],
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      console.log(`📊 Backup payload size: ${JSON.stringify(backupPayload).length} bytes`);

      const response = await axios.post<CloudBackupResult>(
        `${this.syncEndpoint}/backup`,
        backupPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.requestTimeout,
        }
      );

      console.log('✅ Cloud backup successful:', response.data);
      
      // Save backup timestamp
      await AsyncStorage.setItem('lastCloudBackup', new Date().toISOString());

      return response.data;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      console.error('❌ Cloud backup failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Restore data from cloud server
   */
  async restoreData(): Promise<CloudRestoreResult> {
    try {
      console.log('🔄 Starting cloud restore...');
      const token = await this.getAuthToken();

      const response = await axios.get<CloudRestoreResult>(
        `${this.syncEndpoint}/restore`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: this.requestTimeout,
        }
      );

      console.log('✅ Cloud restore successful:', response.data);

      // Save restore timestamp
      await AsyncStorage.setItem('lastCloudRestore', new Date().toISOString());

      return response.data;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      console.error('❌ Cloud restore failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Merge local and server data (handle conflicts)
   */
  async mergeData(
    localData: any,
    strategy: 'server-wins' | 'local-wins' | 'merge' = 'merge'
  ): Promise<CloudMergeResult> {
    try {
      console.log(`🔄 Merging data with strategy: ${strategy}`);
      const token = await this.getAuthToken();

      const response = await axios.post<CloudMergeResult>(
        `${this.syncEndpoint}/merge`,
        {
          localData,
          strategy,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.requestTimeout,
        }
      );

      console.log(`✅ Data merged using ${strategy} strategy:`, response.data);

      return response.data;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      console.error('❌ Merge failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete backup from cloud server
   */
  async deleteBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Deleting cloud backup...');
      const token = await this.getAuthToken();

      const response = await axios.delete<{ success: boolean; error?: string }>(
        `${this.syncEndpoint}/backup`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: this.requestTimeout,
        }
      );

      console.log('✅ Cloud backup deleted:', response.data);

      return response.data;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      console.error('❌ Backup deletion failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if cloud backup exists
   */
  async hasCloudBackup(): Promise<boolean> {
    try {
      const result = await this.restoreData();
      return result.success && result.data !== null;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get backup metadata (size, timestamp, etc.)
   */
  async getBackupMetadata(): Promise<{
    timestamp?: string;
    version?: string;
    exists: boolean;
  }> {
    try {
      const result = await this.restoreData();
      if (result.success) {
        return {
          timestamp: result.timestamp,
          version: result.version,
          exists: result.data !== null,
        };
      }
      return { exists: false };
    } catch (_error) {
      return { exists: false };
    }
  }

  /**
   * Helper: Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      // Axios error
      if (error.response?.data?.error) {
        return error.response.data.error;
      }
      if (error.response?.status === 401) {
        return 'Authentication failed. Please sign in again.';
      }
      if (error.response?.status === 403) {
        return 'Access denied. You do not have permission to perform this action.';
      }
      if (error.response?.status === 404) {
        return 'Cloud service not found. Please check your connection.';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please check your internet connection.';
      }
      if (error.message === 'Network Error') {
        return 'Network error. Please check your internet connection.';
      }
      return error.message || 'Network request failed';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error occurred';
  }
}

export const realCloudSyncService = new RealCloudSyncService();
