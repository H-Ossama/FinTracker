import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../server';
import { createError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Get all transactions for user with optional filtering
router.get('/', [
  query('walletId').optional().isString(),
  query('categoryId').optional().isString(),
  query('type').optional().isIn(['INCOME', 'EXPENSE', 'TRANSFER']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const {
      walletId,
      categoryId,
      type,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (walletId) where.walletId = walletId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              icon: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('Transaction ID is required', 400);
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// Create new transaction
router.post('/', [
  body('amount').isNumeric().custom((value) => {
    if (parseFloat(value) <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('type').isIn(['INCOME', 'EXPENSE']),
  body('walletId').isString(),
  body('categoryId').optional().isString(),
  body('date').optional().isISO8601(),
  body('notes').optional().trim().isLength({ max: 500 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const {
      amount,
      description,
      type,
      walletId,
      categoryId,
      date = new Date(),
      notes,
    } = req.body;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!wallet) {
      throw createError('Wallet not found', 404);
    }

    const transactionAmount = new Decimal(amount);

    // Overdraft prevention for expenses
    if (type === 'EXPENSE') {
      const newBalance = wallet.balance.minus(transactionAmount);
      
      // Allow overdraft only for credit cards
      if (newBalance.isNegative() && wallet.type !== 'CREDIT_CARD') {
        throw createError('Insufficient balance. Cannot create expense that would result in negative balance.', 400);
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          amount: transactionAmount,
          description,
          type,
          date: new Date(date),
          notes,
          userId: req.user!.id,
          walletId,
          categoryId,
        },
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              icon: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Update wallet balance
      const balanceChange = type === 'INCOME' ? transactionAmount : transactionAmount.negated();
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // Record balance history
      await tx.balanceHistory.create({
        data: {
          walletId,
          balance: updatedWallet.balance,
          date: new Date(),
        },
      });

      return transaction;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Transaction created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Transfer money between wallets
router.post('/transfer', [
  body('fromWalletId').isString(),
  body('toWalletId').isString().custom((value, { req }) => {
    if (value === req.body.fromWalletId) {
      throw new Error('Cannot transfer to the same wallet');
    }
    return true;
  }),
  body('amount').isNumeric().custom((value) => {
    if (parseFloat(value) <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }
    return true;
  }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('fee').optional().isNumeric().custom((value) => {
    if (parseFloat(value) < 0) {
      throw new Error('Transfer fee cannot be negative');
    }
    return true;
  }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const {
      fromWalletId,
      toWalletId,
      amount,
      description = 'Wallet Transfer',
      fee = 0,
    } = req.body;

    const transferAmount = new Decimal(amount);
    const transferFee = new Decimal(fee);
    const totalDeduction = transferAmount.plus(transferFee);

    // Verify both wallets belong to user
    const [fromWallet, toWallet] = await Promise.all([
      prisma.wallet.findFirst({
        where: {
          id: fromWalletId,
          userId: req.user!.id,
          isActive: true,
        },
      }),
      prisma.wallet.findFirst({
        where: {
          id: toWalletId,
          userId: req.user!.id,
          isActive: true,
        },
      }),
    ]);

    if (!fromWallet) {
      throw createError('Source wallet not found', 404);
    }

    if (!toWallet) {
      throw createError('Destination wallet not found', 404);
    }

    // Overdraft prevention
    const newFromBalance = fromWallet.balance.minus(totalDeduction);
    if (newFromBalance.isNegative() && fromWallet.type !== 'CREDIT_CARD') {
      throw createError('Insufficient balance for transfer including fees', 400);
    }

    // Execute transfer as atomic transaction
    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      // Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          fromWalletId,
          toWalletId,
          amount: transferAmount,
          description,
          fee: transferFee,
        },
      });

      // Create outgoing transaction (expense from source wallet)
      const outgoingTransaction = await tx.transaction.create({
        data: {
          amount: transferAmount,
          description: `Transfer to ${toWallet.name}`,
          type: 'TRANSFER',
          userId: req.user!.id,
          walletId: fromWalletId,
          notes: description,
        },
      });

      // Create incoming transaction (income to destination wallet)
      const incomingTransaction = await tx.transaction.create({
        data: {
          amount: transferAmount,
          description: `Transfer from ${fromWallet.name}`,
          type: 'TRANSFER',
          userId: req.user!.id,
          walletId: toWalletId,
          notes: description,
        },
      });

      // Update source wallet balance (subtract amount + fee)
      const updatedFromWallet = await tx.wallet.update({
        where: { id: fromWalletId },
        data: {
          balance: {
            decrement: totalDeduction,
          },
        },
      });

      // Update destination wallet balance (add amount)
      const updatedToWallet = await tx.wallet.update({
        where: { id: toWalletId },
        data: {
          balance: {
            increment: transferAmount,
          },
        },
      });

      // Record balance history for both wallets
      await Promise.all([
        tx.balanceHistory.create({
          data: {
            walletId: fromWalletId,
            balance: updatedFromWallet.balance,
            date: new Date(),
          },
        }),
        tx.balanceHistory.create({
          data: {
            walletId: toWalletId,
            balance: updatedToWallet.balance,
            date: new Date(),
          },
        }),
      ]);

      return {
        transfer,
        outgoingTransaction,
        incomingTransaction,
        fromWallet: {
          id: updatedFromWallet.id,
          name: fromWallet.name,
          newBalance: updatedFromWallet.balance,
        },
        toWallet: {
          id: updatedToWallet.id,
          name: toWallet.name,
          newBalance: updatedToWallet.balance,
        },
      };
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Transfer completed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get wallet transaction history
router.get('/wallet/:walletId', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('type').optional().isIn(['INCOME', 'EXPENSE', 'TRANSFER']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { walletId } = req.params;
    const {
      limit = 50,
      offset = 0,
      type,
      startDate,
      endDate,
    } = req.query;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user!.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        color: true,
        icon: true,
      },
    });

    if (!wallet) {
      throw createError('Wallet not found', 404);
    }

    const where: any = {
      walletId,
      userId: req.user!.id,
    };

    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        wallet,
        transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get wallet balance history
router.get('/wallet/:walletId/balance-history', [
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { walletId } = req.params;
    const { days = 30, startDate, endDate } = req.query;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user!.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
      },
    });

    if (!wallet) {
      throw createError('Wallet not found', 404);
    }

    const where: any = { walletId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    } else {
      // Default to last N days
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));
      where.date = { gte: daysAgo };
    }

    const balanceHistory = await prisma.balanceHistory.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        wallet,
        balanceHistory,
        period: {
          days: parseInt(days as string),
          startDate: startDate ? new Date(startDate as string) : null,
          endDate: endDate ? new Date(endDate as string) : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', [
  body('amount').optional().isNumeric().custom((value) => {
    if (parseFloat(value) <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('categoryId').optional().isString(),
  body('date').optional().isISO8601(),
  body('notes').optional().trim().isLength({ max: 500 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { id } = req.params;
    const { amount, description, categoryId, date, notes } = req.body;

    // Get existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        wallet: true,
      },
    });

    if (!existingTransaction) {
      throw createError('Transaction not found', 404);
    }

    // Don't allow updating transfer transactions
    if (existingTransaction.type === 'TRANSFER') {
      throw createError('Transfer transactions cannot be updated directly', 400);
    }

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      const oldAmount = existingTransaction.amount;
      const newAmount = amount ? new Decimal(amount) : oldAmount;
      const amountDifference = newAmount.minus(oldAmount);

      // Check overdraft if amount is changing and it's an expense
      if (!amountDifference.isZero() && existingTransaction.type === 'EXPENSE') {
        const currentBalance = existingTransaction.wallet.balance;
        const balanceAfterChange = existingTransaction.type === 'EXPENSE' 
          ? currentBalance.minus(amountDifference)
          : currentBalance.plus(amountDifference);
        
        if (balanceAfterChange.isNegative() && existingTransaction.wallet.type !== 'CREDIT_CARD') {
          throw createError('Insufficient balance for updated transaction amount', 400);
        }
      }

      // Update transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          ...(amount && { amount: newAmount }),
          ...(description !== undefined && { description }),
          ...(categoryId !== undefined && { categoryId }),
          ...(date && { date: new Date(date) }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              icon: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Update wallet balance if amount changed
      if (!amountDifference.isZero()) {
        const balanceChange = existingTransaction.type === 'INCOME' 
          ? amountDifference 
          : amountDifference.negated();
        
        const updatedWallet = await tx.wallet.update({
          where: { id: existingTransaction.walletId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });

        // Record balance history
        await tx.balanceHistory.create({
          data: {
            walletId: existingTransaction.walletId,
            balance: updatedWallet.balance,
            date: new Date(),
          },
        });
      }

      return updatedTransaction;
    });

    res.json({
      success: true,
      data: result,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete transaction
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('Transaction ID is required', 400);
    }

    // Get existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        wallet: true,
      },
    });

    if (!existingTransaction) {
      throw createError('Transaction not found', 404);
    }

    // Don't allow deleting transfer transactions
    if (existingTransaction.type === 'TRANSFER') {
      throw createError('Transfer transactions cannot be deleted directly', 400);
    }

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      // Delete transaction
      await tx.transaction.delete({
        where: { id },
      });

      // Reverse the balance change
      const balanceChange = existingTransaction.type === 'INCOME' 
        ? existingTransaction.amount.negated()
        : existingTransaction.amount;
      
      const updatedWallet = await tx.wallet.update({
        where: { id: existingTransaction.walletId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // Record balance history
      await tx.balanceHistory.create({
        data: {
          walletId: existingTransaction.walletId,
          balance: updatedWallet.balance,
          date: new Date(),
        },
      });

      return { deletedTransactionId: id };
    });

    res.json({
      success: true,
      data: result,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;