import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../server';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all wallets for user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: {
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: wallets,
    });
  } catch (error) {
    next(error);
  }
});

// Create new wallet
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 50 }),
  body('type').isIn(['BANK', 'CASH', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'OTHER']),
  body('balance').optional().isNumeric(),
  body('color').optional().isHexColor(),
  body('icon').optional().isLength({ min: 1, max: 20 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { name, type, balance = 0, color = '#3B82F6', icon = 'wallet' } = req.body;

    const wallet = await prisma.wallet.create({
      data: {
        name,
        type,
        balance: parseFloat(balance),
        color,
        icon,
        userId: req.user!.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        color: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: wallet,
      message: 'Wallet created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update wallet
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 50 }),
  body('color').optional().isHexColor(),
  body('icon').optional().isLength({ min: 1, max: 20 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { id } = req.params;
    if (!id) {
      throw createError('Wallet ID is required', 400);
    }
    
    const { name, color, icon } = req.body;

    // Check if wallet belongs to user
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!existingWallet) {
      throw createError('Wallet not found', 404);
    }

    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(icon && { icon }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        color: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete wallet
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('Wallet ID is required', 400);
    }

    // Check if wallet belongs to user
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!existingWallet) {
      throw createError('Wallet not found', 404);
    }

    // Check if wallet has transactions
    const transactionCount = await prisma.transaction.count({
      where: { walletId: id },
    });

    if (transactionCount > 0) {
      // Soft delete to preserve transaction history
      await prisma.wallet.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no transactions
      await prisma.wallet.delete({
        where: { id },
      });
    }

    res.json({
      success: true,
      message: 'Wallet deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get wallet balance history
router.get('/:id/balance-history', [
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { id } = req.params;
    const { days = 30, startDate, endDate } = req.query;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id,
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

    const where: any = { walletId: id };
    
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

export default router;