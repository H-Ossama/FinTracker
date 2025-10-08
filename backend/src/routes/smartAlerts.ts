import express from 'express';
import { param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { SmartAlertService } from '../services/smartAlertService';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

/**
 * POST /api/smart-alerts/trigger
 * Manually trigger smart alerts for the authenticated user
 */
router.post('/trigger',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const smartAlertService = SmartAlertService.getInstance();
      
      await smartAlertService.triggerUserAlerts(userId);

      res.json({
        success: true,
        message: 'Smart alerts processed successfully',
      });
    } catch (error) {
      console.error('Error triggering smart alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger smart alerts',
      });
    }
  }
);

/**
 * GET /api/smart-alerts/status
 * Get smart alert service status
 */
router.get('/status',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const smartAlertService = SmartAlertService.getInstance();
      const status = smartAlertService.getStatus();

      res.json({
        success: true,
        data: {
          isRunning: status.isRunning,
          hasInterval: status.intervalId !== null,
        },
      });
    } catch (error) {
      console.error('Error getting smart alert status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get smart alert status',
      });
    }
  }
);

export default router;