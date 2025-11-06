# Real Cloud Sync - Quick Start Checklist

## ✅ What's Been Done

### Backend Setup
- [x] Created `/backend/src/routes/sync.ts` with 4 API endpoints
  - POST /api/sync/backup - Upload data to server
  - GET /api/sync/restore - Download data from server
  - POST /api/sync/merge - Handle conflicts
  - DELETE /api/sync/backup - Delete backup

- [x] Updated Prisma schema (`schema.prisma`)
  - Added `UserDataBackup` model for storing encrypted backups
  - Added relationship to User model
  - Added fields for version, timestamp, checksum

- [x] Updated backend server (`server.ts`)
  - Registered sync routes at `/api/sync`

### Frontend Setup
- [x] Created `realCloudSyncService.ts`
  - Comprehensive cloud sync operations
  - Error handling
  - Token management
  - Timeout handling

- [x] Created documentation
  - `REAL_CLOUD_SYNC_GUIDE.md` - Full implementation guide
  - Integration examples
  - Security considerations

## 🔧 What You Need to Do

### Step 1: Database Migration (Required)
```bash
cd backend
npm install

# Generate and run migrations
npx prisma migrate dev --name add_user_data_backup

# Alternative if migration fails:
npx prisma db push
```

**Time:** 2-3 minutes

---

### Step 2: Install Frontend Dependencies (Required)
```bash
# Make sure you have axios installed
npm install axios
```

**Time:** 1 minute

---

### Step 3: Configure Environment Variables (Required)

Create `.env` in your project root:

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:3001/api

# For production:
# REACT_APP_BACKEND_URL=https://your-backend.com/api
```

Or update `app.json` if using Expo:

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "android": {
          "extraMavenRepos": ["..."],
          "enableNetworkSecurityConfig": true
        }
      }]
    ],
    "extra": {
      "BACKEND_API_URL": "http://localhost:3001/api"
    }
  }
}
```

**Time:** 2 minutes

---

### Step 4: Update SyncSettingsModal (Recommended)

In `src/components/SyncSettingsModal.tsx`, add real cloud sync buttons:

```typescript
import { realCloudSyncService } from '../services/realCloudSyncService';

// Add real cloud backup handler
const handleRealCloudBackup = async () => {
  setIsLoading(true);
  try {
    const data = {
      wallets: await hybridDataService.getWallets(),
      transactions: await hybridDataService.getTransactions(),
      categories: await hybridDataService.getCategories(),
    };

    const result = await realCloudSyncService.backupData(data);
    
    if (result.success) {
      Alert.alert('Success', '✅ Data backed up to cloud server!');
    } else {
      Alert.alert('Error', result.error || 'Backup failed');
    }
  } catch (error) {
    Alert.alert('Error', String(error));
  } finally {
    setIsLoading(false);
  }
};

// Add real cloud restore handler
const handleRealCloudRestore = async () => {
  setIsLoading(true);
  try {
    const result = await realCloudSyncService.restoreData();
    
    if (result.success && result.data) {
      // Merge with local data
      const mergedData = await realCloudSyncService.mergeData(
        {
          wallets: await hybridDataService.getWallets(),
          transactions: await hybridDataService.getTransactions(),
          categories: await hybridDataService.getCategories(),
        },
        'merge'
      );
      
      if (mergedData.success) {
        Alert.alert('Success', '✅ Data restored from cloud server!');
      }
    } else {
      Alert.alert('Info', result.error || 'No backup found');
    }
  } catch (error) {
    Alert.alert('Error', String(error));
  } finally {
    setIsLoading(false);
  }
};
```

Add buttons in the UI:

```tsx
<TouchableOpacity
  style={[styles.button, styles.primaryButton]}
  onPress={handleRealCloudBackup}
  disabled={isLoading}
>
  <Ionicons name="cloud-upload" size={20} color="white" />
  <Text style={styles.buttonText}>☁️ Backup to Cloud</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[styles.button, styles.primaryButton]}
  onPress={handleRealCloudRestore}
  disabled={isLoading}
>
  <Ionicons name="cloud-download" size={20} color="white" />
  <Text style={styles.buttonText}>☁️ Restore from Cloud</Text>
</TouchableOpacity>
```

**Time:** 10-15 minutes

---

### Step 5: Test Locally (Recommended)

```bash
# Terminal 1: Start Backend
cd backend
npm run dev
# Should show: Server running on http://localhost:3001

# Terminal 2: Start Frontend
npm start
# Choose your platform (Expo, iOS, Android, etc.)
```

**Test Scenarios:**

1. **Create Test Data**
   - Add a new wallet
   - Add a transaction
   - Add a category

2. **Backup Test**
   - Go to Settings → Sync Settings
   - Click "☁️ Backup to Cloud"
   - Should see "Data backed up to cloud server!"

3. **Verify in Database**
   ```bash
   npx prisma studio
   # View user_data_backups table
   ```

4. **Restore Test**
   - Clear local app data (or log out)
   - Click "☁️ Restore from Cloud"
   - Data should reappear

**Time:** 5-10 minutes

---

### Step 6: Deploy Backend (Optional but Important)

Choose your deployment platform:

#### **Heroku** (Easiest)
```bash
# Install Heroku CLI
# heroku login
# heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

#### **AWS, Vercel, Railway, or Others**
Update `REACT_APP_BACKEND_URL` to your deployed URL.

**Time:** 10-20 minutes

---

### Step 7: Update Frontend Environment

Update `.env` with deployed backend URL:

```env
REACT_APP_BACKEND_URL=https://your-deployed-backend.com/api
```

**Time:** 1 minute

---

## 📊 Comparison: Local vs Real Cloud

| Feature | Local Sync | Real Cloud Sync |
|---------|-----------|-----------------|
| **Storage Location** | Device only | Server + Device |
| **Multi-device** | ❌ No | ✅ Yes |
| **Data Backup** | ❌ No | ✅ Yes |
| **Recovery After Uninstall** | ❌ No | ✅ Yes |
| **Server Access** | ❌ No | ✅ Yes |
| **Setup Complexity** | ⭐ Simple | ⭐⭐⭐ Medium |
| **Cost** | Free | Paid (hosting) |

---

## 🔍 Verify Everything Works

### Check Backend
```bash
curl http://localhost:3001/health
# Should return: { "status": "OK", ... }
```

### Check Database
```bash
npx prisma studio
# Navigate to user_data_backups table
# Should be empty (will have backups after first sync)
```

### Check Frontend Logs
```
// When backup succeeds:
✅ Cloud backup successful: { backup: { id, timestamp, version } }

// When restore succeeds:
✅ Cloud restore successful: { data: { wallets, transactions, ... } }
```

---

## 🐛 Troubleshooting

### "Network Error" on Backup
- Check backend is running: `curl http://localhost:3001/health`
- Check `REACT_APP_BACKEND_URL` is correct
- Check firewall allows connection

### "401 Unauthorized"
- User not signed in
- Auth token expired
- Try signing out and in again

### "Database Connection Error"
- Check PostgreSQL is running
- Check `DATABASE_URL` env var in backend
- Run `npx prisma db push` to sync schema

### "CORS Error"
- Backend CORS config issue
- Update backend `.env`: `ALLOWED_ORIGINS=your-frontend-url`

---

## 📚 Next Steps

1. **Encryption** - Add data encryption/decryption
2. **Compression** - Compress large backups
3. **Versioning** - Support multiple backup versions
4. **Scheduling** - Auto-backup on interval
5. **Notifications** - Push notifications on sync
6. **Monitoring** - Track sync success/failures

---

## 📞 Support

Refer to `REAL_CLOUD_SYNC_GUIDE.md` for detailed information about:
- API endpoints
- Integration patterns
- Security best practices
- Error handling
- Testing strategies
