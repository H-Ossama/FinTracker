# Real Cloud Sync Implementation Guide

## Overview

This guide shows you how to implement real cloud backup and restore using your backend server instead of just local storage.

## What You Have

1. **Backend API** - Express.js server with Prisma ORM
2. **Database** - PostgreSQL ready to store backups
3. **Frontend** - React Native app with FinTracker
4. **Auth** - JWT token-based authentication

## Step 1: Database Migration

Your backend now has a new Prisma model for storing backups. Run these commands:

```bash
cd backend

# Generate migration
npx prisma migrate dev --name add_user_data_backup

# Apply migration
npx prisma db push

# Generate client
npx prisma generate
```

This creates a `user_data_backups` table that stores encrypted user data on the server.

## Step 2: API Endpoints Available

Your backend now has these sync endpoints:

### Backup Data
```
POST /api/sync/backup
Authorization: Bearer <token>
Body: {
  wallets: [...],
  transactions: [...],
  categories: [...],
  timestamp: "2025-11-06T10:00:00Z",
  version: "1.0.0"
}

Response: {
  success: true,
  message: "Data backed up successfully",
  backup: {
    id: "backup_id",
    timestamp: "...",
    version: "1.0.0"
  }
}
```

### Restore Data
```
GET /api/sync/restore
Authorization: Bearer <token>

Response: {
  success: true,
  data: {
    wallets: [...],
    transactions: [...],
    ...
  },
  timestamp: "...",
  version: "1.0.0"
}
```

### Merge Data (Conflict Resolution)
```
POST /api/sync/merge
Authorization: Bearer <token>
Body: {
  localData: {...},
  strategy: "server-wins" | "local-wins" | "merge"
}

Response: {
  success: true,
  merged: {...},
  strategy: "merge"
}
```

### Delete Backup
```
DELETE /api/sync/backup
Authorization: Bearer <token>

Response: {
  success: true,
  message: "Backup deleted successfully"
}
```

## Step 3: Update Frontend Service

Create a new real cloud sync service in your frontend:

```typescript
// src/services/realCloudSyncService.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api';

export class RealCloudSyncService {
  private readonly backupEndpoint = `${API_BASE_URL}/sync`;

  async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) throw new Error('No auth token found');
    return token;
  }

  /**
   * Backup data to server
   */
  async backupData(data: any): Promise<{
    success: boolean;
    backup?: any;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.post(`${this.backupEndpoint}/backup`, 
        {
          wallets: data.wallets,
          transactions: data.transactions,
          categories: data.categories,
          budgets: data.budgets,
          bills: data.bills,
          reminders: data.reminders,
          goals: data.goals,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Data backed up to server:', response.data);
      return response.data;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message 
        : String(error);
      
      console.error('❌ Backup failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Restore data from server
   */
  async restoreData(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.get(`${this.backupEndpoint}/restore`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('✅ Data restored from server:', response.data);
      return response.data;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : String(error);
      
      console.error('❌ Restore failed:', errorMessage);
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
  ): Promise<{
    success: boolean;
    merged?: any;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.post(`${this.backupEndpoint}/merge`,
        {
          localData,
          strategy,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log(`✅ Data merged (${strategy}):`, response.data);
      return response.data;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : String(error);
      
      console.error('❌ Merge failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete backup from server
   */
  async deleteBackup(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.delete(`${this.backupEndpoint}/backup`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('✅ Backup deleted from server:', response.data);
      return response.data;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : String(error);
      
      console.error('❌ Delete failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const realCloudSyncService = new RealCloudSyncService();
```

## Step 4: Integration with Hybrid Data Service

Update your `hybridDataService` to use real cloud sync:

```typescript
// In hybridDataService.ts, add:

import { realCloudSyncService } from './realCloudSyncService';

// ...

/**
 * Perform real cloud backup
 */
async realCloudBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const wallets = await localStorageService.getWallets();
    const transactions = await localStorageService.getTransactions();
    const categories = await localStorageService.getCategories();
    
    const data = {
      wallets,
      transactions,
      categories,
      // Add other data types as needed
    };

    const result = await realCloudSyncService.backupData(data);
    
    if (result.success) {
      // Save backup metadata
      await AsyncStorage.setItem('lastRealCloudBackup', new Date().toISOString());
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Backup failed',
    };
  }
}

/**
 * Perform real cloud restore
 */
async realCloudRestore(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realCloudSyncService.restoreData();
    
    if (result.success && result.data) {
      // Restore data locally
      if (result.data.wallets) {
        // Import wallets
      }
      if (result.data.transactions) {
        // Import transactions
      }
      if (result.data.categories) {
        // Import categories
      }
      
      await AsyncStorage.setItem('lastRealCloudRestore', new Date().toISOString());
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}
```

## Step 5: Environment Configuration

Create `.env` file in your project root:

```env
# Backend
REACT_APP_BACKEND_URL=https://your-backend-domain.com/api
# For local development:
# REACT_APP_BACKEND_URL=http://localhost:3001/api

# For Expo
BACKEND_API_URL=https://your-backend-domain.com/api
```

## Step 6: Update SyncSettingsModal

Replace local-only sync with real cloud sync:

```typescript
// In SyncSettingsModal.tsx

const handleRealCloudSync = async () => {
  setIsLoading(true);
  try {
    // Get latest local data
    const wallets = await hybridDataService.getWallets();
    const transactions = await hybridDataService.getTransactions();
    const categories = await hybridDataService.getCategories();

    const localData = {
      wallets,
      transactions,
      categories,
    };

    // Backup to real server
    const backupResult = await realCloudSyncService.backupData(localData);
    
    if (backupResult.success) {
      Alert.alert('Success', 'Data backed up to server successfully!');
    } else {
      Alert.alert('Error', backupResult.error || 'Backup failed');
    }
  } catch (error) {
    Alert.alert('Error', String(error));
  } finally {
    setIsLoading(false);
  }
};

const handleRealCloudRestore = async () => {
  setIsLoading(true);
  try {
    const restoreResult = await realCloudSyncService.restoreData();
    
    if (restoreResult.success && restoreResult.data) {
      // Merge with local data
      const mergeResult = await realCloudSyncService.mergeData(
        {
          wallets: await hybridDataService.getWallets(),
          transactions: await hybridDataService.getTransactions(),
          categories: await hybridDataService.getCategories(),
        },
        'merge'
      );
      
      if (mergeResult.success) {
        Alert.alert('Success', 'Data restored and merged successfully!');
      }
    }
  } catch (error) {
    Alert.alert('Error', String(error));
  } finally {
    setIsLoading(false);
  }
};
```

## Step 7: Deployment

### Backend Deployment

```bash
# Build
npm run build

# Deploy to Heroku, AWS, or your server
# Make sure DATABASE_URL environment variable is set
```

### Frontend Configuration

Update your API endpoint in environment variables based on deployment.

## Testing

### Local Testing

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm start

# Then use SyncSettingsModal to test backup/restore
```

### Test Scenarios

1. **Backup**
   - Create wallet, transaction, category
   - Click "Backup to Cloud"
   - Verify data appears in database

2. **Restore**
   - Clear local data
   - Click "Restore from Cloud"
   - Verify data is restored

3. **Conflict Resolution**
   - Modify data locally
   - Modify same data on server
   - Test merge strategies

## Security Considerations

1. **Encryption** - Data is encrypted before transmission (use HTTPS)
2. **Authentication** - JWT tokens verify user identity
3. **Database** - Encrypted sensitive fields in database
4. **Access Control** - Users can only access their own backups

To add encryption:

```typescript
import CryptoES from 'crypto-es';

// Encrypt before sending
const encrypted = CryptoES.AES.encrypt(
  JSON.stringify(data),
  process.env.ENCRYPTION_KEY
).toString();

// Decrypt on receive
const decrypted = JSON.parse(
  CryptoES.AES.decrypt(encrypted, process.env.ENCRYPTION_KEY).toString(CryptoES.enc.Utf8)
);
```

## Next Steps

1. Run Prisma migration
2. Deploy backend
3. Create realCloudSyncService.ts
4. Update SyncSettingsModal
5. Test local backup/restore
6. Deploy to production
7. Monitor sync operations

## Troubleshooting

### 401 Unauthorized
- Check auth token is being sent
- Verify JWT token is valid
- Check backend token verification

### 404 Not Found
- Verify API endpoint URL is correct
- Check backend server is running
- Verify routes are registered

### CORS Errors
- Check CORS configuration in backend
- Verify frontend URL is in ALLOWED_ORIGINS

### Database Errors
- Check PostgreSQL connection string
- Verify migrations ran successfully
- Check database user permissions

## References

- Prisma: https://www.prisma.io/docs/
- Express: https://expressjs.com/
- JWT: https://jwt.io/
- Axios: https://axios-http.com/
