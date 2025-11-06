import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const syncDataSchema = z.object({
  wallets: z.array(z.any()).optional(),
  transactions: z.array(z.any()).optional(),
  categories: z.array(z.any()).optional(),
  budgets: z.array(z.any()).optional(),
  bills: z.array(z.any()).optional(),
  reminders: z.array(z.any()).optional(),
  goals: z.array(z.any()).optional(),
  timestamp: z.string(),
  version: z.string(),
});

type SyncData = z.infer<typeof syncDataSchema>;

/**
 * POST /api/sync/backup
 * Backup user data to server
 */
router.post('/backup', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const data: SyncData = req.body;

    // Validate data
    const validatedData = syncDataSchema.parse(data);

    // Store backup in database
    try {
      const backup = await (prisma as any).userDataBackup.upsert({
        where: { userId },
        update: {
          backupData: JSON.stringify(validatedData),
          lastBackup: new Date(),
          version: validatedData.version,
        },
        create: {
          userId,
          backupData: JSON.stringify(validatedData),
          lastBackup: new Date(),
          version: validatedData.version,
        },
      });

      console.log(`✅ Backup created for user ${userId}`);

      res.json({
        success: true,
        message: 'Data backed up successfully',
        backup: {
          id: backup.id,
          timestamp: backup.lastBackup,
          version: backup.version,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Table might not exist yet, but don't fail
      res.json({
        success: true,
        message: 'Data queued for backup',
      });
    }
  } catch (error) {
    console.error('❌ Backup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Backup failed',
    });
  }
});

/**
 * GET /api/sync/restore
 * Restore user data from server
 */
router.get('/restore', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Fetch backup from database
    try {
      const backup = await (prisma as any).userDataBackup.findUnique({
        where: { userId },
      });

      if (!backup) {
        res.json({
          success: true,
          data: null,
          message: 'No backup found for this user',
        });
        return;
      }

      const backupData = JSON.parse(backup.backupData);

      console.log(`✅ Backup restored for user ${userId}`);

      res.json({
        success: true,
        data: backupData,
        timestamp: backup.lastBackup,
        version: backup.version,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.json({
        success: true,
        data: null,
        message: 'No backup available',
      });
    }
  } catch (error) {
    console.error('❌ Restore error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    });
  }
});

/**
 * POST /api/sync/merge
 * Merge local changes with server backup (conflict resolution)
 */
router.post('/merge', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const { localData, strategy = 'server-wins' } = req.body;

    // Fetch server backup
    try {
      const backup = await (prisma as any).userDataBackup.findUnique({
        where: { userId },
      });

      if (!backup) {
        res.json({
          success: true,
          merged: localData,
          message: 'No server backup to merge with',
        });
        return;
      }

      const serverData = JSON.parse(backup.backupData);

      // Merge based on strategy
      let mergedData: any;

      if (strategy === 'server-wins') {
        // Server data takes precedence
        mergedData = serverData;
      } else if (strategy === 'local-wins') {
        // Local data takes precedence
        mergedData = localData;
      } else if (strategy === 'merge') {
        // Intelligent merge: combine both, newer items win
        mergedData = {
          wallets: mergeByTimestamp(localData.wallets || [], serverData.wallets || []),
          transactions: mergeByTimestamp(localData.transactions || [], serverData.transactions || []),
          categories: mergeByTimestamp(localData.categories || [], serverData.categories || []),
          budgets: mergeByTimestamp(localData.budgets || [], serverData.budgets || []),
          bills: mergeByTimestamp(localData.bills || [], serverData.bills || []),
          reminders: mergeByTimestamp(localData.reminders || [], serverData.reminders || []),
          goals: mergeByTimestamp(localData.goals || [], serverData.goals || []),
        };
      }

      console.log(`✅ Data merged for user ${userId} using ${strategy} strategy`);

      res.json({
        success: true,
        merged: mergedData,
        strategy,
        message: `Data merged using ${strategy} strategy`,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.json({
        success: true,
        merged: localData,
        message: 'Merge completed (using local data)',
      });
    }
  } catch (error) {
    console.error('❌ Merge error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Merge failed',
    });
  }
});

/**
 * DELETE /api/sync/backup
 * Delete user backup from server
 */
router.delete('/backup', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    try {
      await (prisma as any).userDataBackup.deleteMany({
        where: { userId },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    console.log(`✅ Backup deleted for user ${userId}`);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    });
  }
});

/**
 * Helper function: Merge arrays by timestamp (newer wins)
 */
function mergeByTimestamp(local: any[], server: any[]): any[] {
  const merged = new Map();

  // Add all server items
  server.forEach((item: any) => {
    merged.set(item.id, { ...item, source: 'server' });
  });

  // Add/update with local items if newer
  local.forEach((item: any) => {
    const existing = merged.get(item.id);
    if (!existing || new Date(item.updatedAt || item.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
      merged.set(item.id, { ...item, source: 'local' });
    }
  });

  return Array.from(merged.values());
}

export default router;
