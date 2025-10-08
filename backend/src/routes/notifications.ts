import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { NotificationPreferencesService } from '../services/notificationPreferencesService';
import { NotificationType, NotificationPriority } from '@prisma/client';

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
 * GET /api/notifications
 * Get user notifications with pagination and filtering
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean'),
    query('type').optional().isIn(Object.values(NotificationType)).withMessage('Invalid notification type'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const type = req.query.type as NotificationType | undefined;

      const result = await NotificationService.getUserNotifications(userId, {
        page,
        limit,
        unreadOnly,
        ...(type && { type }),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
      });
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const count = await NotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
      });
    }
  }
);

/**
 * POST /api/notifications
 * Create a notification (admin/system use)
 */
router.post('/',
  authenticate,
  [
    body('title').notEmpty().isLength({ max: 255 }).withMessage('Title is required and must be under 255 characters'),
    body('message').notEmpty().isLength({ max: 1000 }).withMessage('Message is required and must be under 1000 characters'),
    body('type').isIn(Object.values(NotificationType)).withMessage('Invalid notification type'),
    body('priority').optional().isIn(Object.values(NotificationPriority)).withMessage('Invalid notification priority'),
    body('data').optional().isObject().withMessage('Data must be an object'),
    body('actionUrl').optional().isURL().withMessage('Action URL must be a valid URL'),
    body('relatedEntityType').optional().isString().withMessage('Related entity type must be a string'),
    body('relatedEntityId').optional().isString().withMessage('Related entity ID must be a string'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const {
        title,
        message,
        type,
        priority,
        data,
        actionUrl,
        relatedEntityType,
        relatedEntityId,
      } = req.body;

      const notification = await NotificationService.createNotification({
        userId,
        title,
        message,
        type,
        priority,
        data,
        actionUrl,
        relatedEntityType,
        relatedEntityId,
      });

      res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
      });
    }
  }
);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Notification ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id!;

      const notification = await NotificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
      });
    }
  }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const result = await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: { updatedCount: result.count },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
      });
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Notification ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id!;

      await NotificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
      });
    }
  }
);

/**
 * POST /api/notifications/send-push
 * Send push notification to user
 */
router.post('/send-push',
  authenticate,
  [
    body('title').notEmpty().isLength({ max: 255 }).withMessage('Title is required and must be under 255 characters'),
    body('body').notEmpty().isLength({ max: 1000 }).withMessage('Body is required and must be under 1000 characters'),
    body('data').optional().isObject().withMessage('Data must be an object'),
    body('priority').optional().isIn(['default', 'normal', 'high']).withMessage('Invalid priority'),
    body('sound').optional().isIn(['default', null]).withMessage('Invalid sound option'),
    body('badge').optional().isInt({ min: 0 }).withMessage('Badge must be a non-negative integer'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const { title, body, data, priority, sound, badge } = req.body;

      const tickets = await NotificationService.sendPushNotification({
        userId,
        title,
        body,
        data,
        priority,
        sound,
        badge,
      });

      res.json({
        success: true,
        data: { tickets },
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send push notification',
      });
    }
  }
);

/**
 * POST /api/notifications/register-token
 * Register push notification token
 */
router.post('/register-token',
  authenticate,
  [
    body('token').notEmpty().withMessage('Push token is required'),
    body('deviceId').optional().isString().withMessage('Device ID must be a string'),
    body('platform').optional().isIn(['ios', 'android', 'web']).withMessage('Invalid platform'),
    body('appVersion').optional().isString().withMessage('App version must be a string'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const { token, deviceId, platform, appVersion } = req.body;

      const pushToken = await NotificationService.registerPushToken(userId, token, {
        deviceId,
        platform,
        appVersion,
      });

      res.json({
        success: true,
        data: pushToken,
      });
    } catch (error) {
      console.error('Error registering push token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register push token',
      });
    }
  }
);

/**
 * DELETE /api/notifications/unregister-token
 * Unregister push notification token
 */
router.delete('/unregister-token',
  authenticate,
  [
    body('token').notEmpty().withMessage('Push token is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { token } = req.body;

      await NotificationService.unregisterPushToken(token);

      res.json({
        success: true,
        message: 'Push token unregistered successfully',
      });
    } catch (error) {
      console.error('Error unregistering push token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unregister push token',
      });
    }
  }
);

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const preferences = await NotificationPreferencesService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
      });
    }
  }
);

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences',
  authenticate,
  [
    body('enablePushNotifications').optional().isBoolean().withMessage('enablePushNotifications must be a boolean'),
    body('enableReminders').optional().isBoolean().withMessage('enableReminders must be a boolean'),
    body('enableBudgetAlerts').optional().isBoolean().withMessage('enableBudgetAlerts must be a boolean'),
    body('enableGoalNotifications').optional().isBoolean().withMessage('enableGoalNotifications must be a boolean'),
    body('enableSpendingAlerts').optional().isBoolean().withMessage('enableSpendingAlerts must be a boolean'),
    body('enableTips').optional().isBoolean().withMessage('enableTips must be a boolean'),
    body('enableSyncReminders').optional().isBoolean().withMessage('enableSyncReminders must be a boolean'),
    body('enableEmailNotifications').optional().isBoolean().withMessage('enableEmailNotifications must be a boolean'),
    body('enableEmailWeeklyReport').optional().isBoolean().withMessage('enableEmailWeeklyReport must be a boolean'),
    body('enableEmailMonthlyReport').optional().isBoolean().withMessage('enableEmailMonthlyReport must be a boolean'),
    body('enableQuietHours').optional().isBoolean().withMessage('enableQuietHours must be a boolean'),
    body('quietHoursStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('quietHoursStart must be in HH:MM format'),
    body('quietHoursEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('quietHoursEnd must be in HH:MM format'),
    body('reminderFrequencyMinutes').optional().isInt({ min: 15, max: 1440 }).withMessage('reminderFrequencyMinutes must be between 15 and 1440'),
    body('spendingAlertThreshold').optional().isFloat({ min: 0 }).withMessage('spendingAlertThreshold must be a positive number'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const updateData = req.body;

      const preferences = await NotificationPreferencesService.updateUserPreferences(userId, updateData);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
      });
    }
  }
);

export default router;