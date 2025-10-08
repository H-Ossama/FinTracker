import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PrismaClient, ReminderFrequency, ReminderStatus, TransactionType } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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
 * GET /api/reminders
 * Get user reminders with pagination and filtering
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(Object.values(ReminderStatus)).withMessage('Invalid reminder status'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    query('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ReminderStatus | undefined;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const isRecurring = req.query.isRecurring ? req.query.isRecurring === 'true' : undefined;

      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (status) where.status = status;
      if (isActive !== undefined) where.isActive = isActive;
      if (isRecurring !== undefined) where.isRecurring = isRecurring;

      const [reminders, total] = await Promise.all([
        prisma.reminder.findMany({
          where,
          include: {
            category: true,
            wallet: true,
          },
          orderBy: { dueDate: 'asc' },
          skip,
          take: limit,
        }),
        prisma.reminder.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          reminders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error getting reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reminders',
      });
    }
  }
);

/**
 * GET /api/reminders/due-soon
 * Get reminders due soon (next 7 days)
 */
router.get('/due-soon',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          isActive: true,
          status: {
            in: [ReminderStatus.PENDING, ReminderStatus.OVERDUE],
          },
          dueDate: {
            lte: sevenDaysFromNow,
          },
        },
        include: {
          category: true,
          wallet: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      res.json({
        success: true,
        data: reminders,
      });
    } catch (error) {
      console.error('Error getting due soon reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get due soon reminders',
      });
    }
  }
);

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/',
  authenticate,
  [
    body('title').notEmpty().isLength({ max: 255 }).withMessage('Title is required and must be under 255 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('dueDate').isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
    body('frequency').isIn(Object.values(ReminderFrequency)).withMessage('Invalid frequency'),
    body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
    body('autoCreateTransaction').optional().isBoolean().withMessage('autoCreateTransaction must be a boolean'),
    body('transactionType').optional().isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
    body('walletId').optional().isString().withMessage('Wallet ID must be a string'),
    body('categoryId').optional().isString().withMessage('Category ID must be a string'),
    body('notifyBefore').optional().isInt({ min: 0 }).withMessage('Notify before must be a non-negative integer'),
    body('enablePushNotification').optional().isBoolean().withMessage('enablePushNotification must be a boolean'),
    body('enableEmailNotification').optional().isBoolean().withMessage('enableEmailNotification must be a boolean'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const {
        title,
        description,
        amount,
        dueDate,
        frequency,
        isRecurring = false,
        autoCreateTransaction = false,
        transactionType,
        walletId,
        categoryId,
        notifyBefore,
        enablePushNotification = true,
        enableEmailNotification = false,
      } = req.body;

      // Calculate next due date for recurring reminders
      let nextDue = null;
      if (isRecurring) {
        nextDue = calculateNextDueDate(new Date(dueDate), frequency);
      }

      const reminder = await prisma.reminder.create({
        data: {
          userId,
          title,
          description: description || null,
          amount: amount ? parseFloat(amount) : null,
          dueDate: new Date(dueDate),
          frequency,
          isRecurring,
          autoCreateTransaction,
          transactionType: autoCreateTransaction ? transactionType : null,
          walletId: walletId || null,
          categoryId: categoryId || null,
          notifyBefore: notifyBefore || null,
          enablePushNotification,
          enableEmailNotification,
          nextDue,
        },
        include: {
          category: true,
          wallet: true,
        },
      });

      res.status(201).json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create reminder',
      });
    }
  }
);

/**
 * PUT /api/reminders/:id/complete
 * Mark reminder as completed
 */
router.put('/:id/complete',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Reminder ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = req.params.id!;

      // Check if reminder exists and belongs to user
      const existingReminder = await prisma.reminder.findFirst({
        where: { id: reminderId, userId },
      });

      if (!existingReminder) {
        res.status(404).json({
          success: false,
          message: 'Reminder not found',
        });
        return;
      }

      const updateData: any = {
        status: ReminderStatus.COMPLETED,
        lastCompleted: new Date(),
        completedCount: existingReminder.completedCount + 1,
      };

      // If recurring, calculate next due date
      if (existingReminder.isRecurring) {
        updateData.nextDue = calculateNextDueDate(existingReminder.dueDate, existingReminder.frequency);
        updateData.dueDate = updateData.nextDue;
        updateData.status = ReminderStatus.PENDING; // Reset status for next occurrence
      }

      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: updateData,
        include: {
          category: true,
          wallet: true,
        },
      });

      res.json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      console.error('Error completing reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete reminder',
      });
    }
  }
);

/**
 * DELETE /api/reminders/:id
 * Delete reminder
 */
router.delete('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Reminder ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const reminderId = req.params.id!;

      // Check if reminder exists and belongs to user
      const existingReminder = await prisma.reminder.findFirst({
        where: { id: reminderId, userId },
      });

      if (!existingReminder) {
        res.status(404).json({
          success: false,
          message: 'Reminder not found',
        });
        return;
      }

      await prisma.reminder.delete({
        where: { id: reminderId },
      });

      res.json({
        success: true,
        message: 'Reminder deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete reminder',
      });
    }
  }
);

/**
 * Helper function to calculate next due date based on frequency
 */
function calculateNextDueDate(currentDate: Date, frequency: ReminderFrequency): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case ReminderFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case ReminderFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case ReminderFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case ReminderFrequency.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case ReminderFrequency.YEARLY:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case ReminderFrequency.CUSTOM:
      // For custom frequency, default to monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  return nextDate;
}

export default router;