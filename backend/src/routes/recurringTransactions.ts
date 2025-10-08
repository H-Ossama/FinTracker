import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { RecurringTransactionService } from '../services/recurringTransactionService';
import { ReminderFrequency, TransactionType } from '@prisma/client';

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
 * GET /api/recurring-transactions
 * Get user recurring transactions with pagination and filtering
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;

      const result = await RecurringTransactionService.getUserRecurringTransactions(userId, {
        page,
        limit,
        ...(isActive !== undefined && { isActive }),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting recurring transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recurring transactions',
      });
    }
  }
);

/**
 * POST /api/recurring-transactions
 * Create a new recurring transaction
 */
router.post('/',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('description').notEmpty().isLength({ max: 255 }).withMessage('Description is required and must be under 255 characters'),
    body('type').isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
    body('frequency').isIn(Object.values(ReminderFrequency)).withMessage('Invalid frequency'),
    body('walletId').isString().notEmpty().withMessage('Wallet ID is required'),
    body('categoryId').optional().isString().withMessage('Category ID must be a string'),
    body('nextExecutionDate').isISO8601().withMessage('Next execution date must be a valid ISO 8601 date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('maxExecutions').optional().isInt({ min: 1 }).withMessage('Max executions must be a positive integer'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const {
        amount,
        description,
        type,
        frequency,
        walletId,
        categoryId,
        nextExecutionDate,
        endDate,
        maxExecutions,
      } = req.body;

      const recurringTransaction = await RecurringTransactionService.createRecurringTransaction({
        userId,
        amount: parseFloat(amount),
        description,
        type,
        frequency,
        walletId,
        categoryId,
        nextExecutionDate: new Date(nextExecutionDate),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(maxExecutions && { maxExecutions: parseInt(maxExecutions) }),
      });

      res.status(201).json({
        success: true,
        data: recurringTransaction,
      });
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create recurring transaction',
      });
    }
  }
);

/**
 * PUT /api/recurring-transactions/:id
 * Update recurring transaction
 */
router.put('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Recurring transaction ID is required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description must be under 255 characters'),
    body('type').optional().isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
    body('frequency').optional().isIn(Object.values(ReminderFrequency)).withMessage('Invalid frequency'),
    body('walletId').optional().isString().withMessage('Wallet ID must be a string'),
    body('categoryId').optional().isString().withMessage('Category ID must be a string'),
    body('nextExecutionDate').optional().isISO8601().withMessage('Next execution date must be a valid ISO 8601 date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('maxExecutions').optional().isInt({ min: 1 }).withMessage('Max executions must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const recurringTransactionId = req.params.id!;

      const updateData: any = {};
      
      // Only update fields that are provided
      if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.type !== undefined) updateData.type = req.body.type;
      if (req.body.frequency !== undefined) updateData.frequency = req.body.frequency;
      if (req.body.walletId !== undefined) updateData.walletId = req.body.walletId;
      if (req.body.categoryId !== undefined) updateData.categoryId = req.body.categoryId || null;
      if (req.body.nextExecutionDate !== undefined) updateData.nextExecutionDate = new Date(req.body.nextExecutionDate);
      if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
      if (req.body.maxExecutions !== undefined) updateData.maxExecutions = req.body.maxExecutions ? parseInt(req.body.maxExecutions) : null;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const recurringTransaction = await RecurringTransactionService.updateRecurringTransaction(
        recurringTransactionId,
        userId,
        updateData
      );

      res.json({
        success: true,
        data: recurringTransaction,
      });
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recurring transaction',
      });
    }
  }
);

/**
 * PUT /api/recurring-transactions/:id/toggle
 * Toggle recurring transaction active status
 */
router.put('/:id/toggle',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Recurring transaction ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const recurringTransactionId = req.params.id!;

      const recurringTransaction = await RecurringTransactionService.toggleRecurringTransaction(
        recurringTransactionId,
        userId
      );

      res.json({
        success: true,
        data: recurringTransaction,
      });
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle recurring transaction',
      });
    }
  }
);

/**
 * DELETE /api/recurring-transactions/:id
 * Delete recurring transaction
 */
router.delete('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Recurring transaction ID is required'),
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user!.id;
      const recurringTransactionId = req.params.id!;

      await RecurringTransactionService.deleteRecurringTransaction(recurringTransactionId, userId);

      res.json({
        success: true,
        message: 'Recurring transaction deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete recurring transaction',
      });
    }
  }
);

/**
 * POST /api/recurring-transactions/process
 * Manually trigger processing of due recurring transactions (admin/debug endpoint)
 */
router.post('/process',
  authenticate,
  async (req: express.Request, res: express.Response) => {
    try {
      // This could be restricted to admin users only
      await RecurringTransactionService.processDueRecurringTransactions();

      res.json({
        success: true,
        message: 'Recurring transactions processed successfully',
      });
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process recurring transactions',
      });
    }
  }
);

export default router;