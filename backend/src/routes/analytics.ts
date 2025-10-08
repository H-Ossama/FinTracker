import { Router, Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../server';
import { createError } from '../middleware/errorHandler';
import { TransactionType } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Get spending by category
router.get('/spending', [
  query('period').isIn(['week', 'month', 'year']).withMessage('Period must be week, month, or year'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { period, startDate, endDate } = req.query;
    let periodStart: Date = new Date();
    let periodEnd = new Date();

    // Calculate period dates if custom dates are not provided
    if (!startDate) {
      const now = new Date();
      if (period === 'week') {
        periodStart = new Date();
        periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      } else if (period === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
      } else if (period === 'year') {
        periodStart = new Date(now.getFullYear(), 0, 1); // Start of year
      }
    } else {
      periodStart = new Date(startDate as string);
    }

    if (endDate) {
      periodEnd = new Date(endDate as string);
    }

    // Get all spending transactions for the period grouped by category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user!.id,
        type: TransactionType.EXPENSE,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
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
    });

    // Calculate total spent during the period
    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // Group transactions by category
    const categoryMap: Record<string, {
      id: string;
      name: string;
      icon: string;
      color: string;
      amount: number;
      percentage: number;
      transactions: number;
    }> = {};

    transactions.forEach(transaction => {
      const categoryId = transaction.category?.id || 'uncategorized';
      const categoryName = transaction.category?.name || 'Uncategorized';
      const categoryIcon = transaction.category?.icon || '🏷️';
      const categoryColor = transaction.category?.color || '#CCCCCC';
      
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          icon: categoryIcon,
          color: categoryColor,
          amount: 0,
          percentage: 0,
          transactions: 0,
        };
      }
      
      categoryMap[categoryId].amount += Number(transaction.amount);
      categoryMap[categoryId].transactions++;
    });

    // Calculate percentages and convert to array
    const categories = Object.values(categoryMap).map(category => {
      category.percentage = totalSpent > 0 
        ? Math.round((category.amount / totalSpent) * 100) 
        : 0;
      return category;
    });

    // Sort by amount desc
    categories.sort((a, b) => b.amount - a.amount);

    // Get transaction statistics
    const transactionCount = transactions.length;
    const dayDiff = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const averagePerDay = totalSpent / dayDiff;
    const highestCategory = categories.length > 0 ? categories[0]?.name || 'N/A' : 'N/A';

    res.json({
      success: true,
      data: {
        period: {
          type: period,
          startDate: periodStart,
          endDate: periodEnd,
          days: dayDiff,
        },
        totalSpent,
        categories,
        statistics: {
          transactionCount,
          averagePerDay,
          highestCategory,
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get spending trend over time
router.get('/trend', [
  query('period').isIn(['week', 'month', 'year']).withMessage('Period must be week, month, or year'),
  query('groupBy').isIn(['day', 'week', 'month']).withMessage('Group by must be day, week, or month'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { period, groupBy } = req.query;
    let periodStart: Date;
    const periodEnd = new Date();

    // Calculate period dates
    const now = new Date();
    if (period === 'week') {
      periodStart = new Date();
      periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    } else if (period === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1); // Start of year
    }

    // Get all transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        amount: true,
        type: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group transactions by date according to groupBy parameter
    const trendMap: Record<string, { date: string; income: number; expense: number; net: number }> = {};

    transactions.forEach(transaction => {
      const date = transaction.date;
      let groupKey: string = '';

      if (groupBy === 'day') {
        const isoDate = date.toISOString();
        groupKey = isoDate.split('T')[0] || ''; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const isoDate = weekStart.toISOString();
        groupKey = isoDate.split('T')[0] || ''; // Week starting YYYY-MM-DD
      } else {
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }

      if (!trendMap[groupKey]) {
        trendMap[groupKey] = {
          date: groupKey,
          income: 0,
          expense: 0,
          net: 0,
        };
      }

      const amount = Number(transaction.amount);
      if (trendMap[groupKey] && transaction.type === TransactionType.INCOME) {
        trendMap[groupKey].income += amount;
      } else if (trendMap[groupKey] && transaction.type === TransactionType.EXPENSE) {
        trendMap[groupKey].expense += amount;
      }
      
      // Calculate net (income - expense)
      if (trendMap[groupKey]) {
        const currentItem = trendMap[groupKey];
        if (currentItem) {
          currentItem.net = currentItem.income - currentItem.expense;
        }
      }
    });

    // Convert to array and sort by date
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        trend,
        period: {
          type: period,
          startDate: periodStart,
          endDate: periodEnd,
          groupBy,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get spending recommendations based on transaction history
router.get('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Get last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [currentMonthSpending, previousMonthsSpending, categories] = await Promise.all([
      // Current month spending
      prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      
      // Previous months spending
      prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: threeMonthsAgo,
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Get all categories
      prisma.category.findMany({
        where: {
          OR: [
            { userId: null }, // Default categories
            { userId }, // User's custom categories
          ],
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    // Group current month by category
    const currentByCategory: Record<string, { amount: number; transactions: number; name: string }> = {};
    currentMonthSpending.forEach(t => {
      const categoryId = t.category?.id || 'uncategorized';
      const categoryName = t.category?.name || 'Uncategorized';
      
      if (!currentByCategory[categoryId]) {
        currentByCategory[categoryId] = { amount: 0, transactions: 0, name: categoryName };
      }
      currentByCategory[categoryId].amount += Number(t.amount);
      currentByCategory[categoryId].transactions++;
    });

    // Group previous months by category and month
    const previousMonths: Record<string, Record<string, { amount: number; transactions: number }>> = {};
    previousMonthsSpending.forEach(t => {
      const categoryId = t.category?.id || 'uncategorized';
      const month = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!previousMonths[month]) {
        previousMonths[month] = {};
      }
      
      if (!previousMonths[month][categoryId]) {
        previousMonths[month][categoryId] = { amount: 0, transactions: 0 };
      }
      
      previousMonths[month][categoryId].amount += Number(t.amount);
      previousMonths[month][categoryId].transactions++;
    });

    // Calculate average spending by category for previous months
    const averagePreviousSpending: Record<string, { amount: number; transactions: number }> = {};
    const monthCount = Object.keys(previousMonths).length || 1;

    categories.forEach(category => {
      let totalAmount = 0;
      let totalTransactions = 0;
      
      Object.values(previousMonths).forEach(month => {
        const categoryData = month[category.id];
        if (categoryData) {
          totalAmount += categoryData.amount;
          totalTransactions += categoryData.transactions;
        }
      });
      
      averagePreviousSpending[category.id] = {
        amount: totalAmount / monthCount,
        transactions: Math.round(totalTransactions / monthCount),
      };
    });

    // Generate recommendations
    const recommendations: Array<{
      type: 'warning' | 'achievement' | 'tip';
      title: string;
      description: string;
      category?: string;
      emoji: string;
      percentageChange?: number;
    }> = [];

    // Check for categories with significant increase
    Object.entries(currentByCategory).forEach(([categoryId, current]) => {
      const previous = averagePreviousSpending[categoryId];
      if (!previous) return;

      // If spending increased by more than 30%
      if (previous.amount > 0 && current.amount > previous.amount * 1.3) {
        const percentIncrease = Math.round(((current.amount - previous.amount) / previous.amount) * 100);
        recommendations.push({
          type: 'warning',
          title: `Higher ${current.name} spending`,
          description: `Your spending in ${current.name} is ${percentIncrease}% higher than your monthly average.`,
          category: categoryId,
          emoji: '⚠️',
          percentageChange: percentIncrease,
        });
      }
      
      // If spending decreased by more than 20%
      if (previous.amount > 0 && current.amount < previous.amount * 0.8) {
        const percentDecrease = Math.round(((previous.amount - current.amount) / previous.amount) * 100);
        recommendations.push({
          type: 'achievement',
          title: `Great progress on ${current.name}!`,
          description: `You've reduced ${current.name} spending by ${percentDecrease}% compared to your monthly average.`,
          category: categoryId,
          emoji: '🎉',
          percentageChange: -percentDecrease,
        });
      }
    });

    // Add general tips if not enough specific recommendations
    if (recommendations.length < 2) {
      // Find highest spending category
      let highestCategory = { id: '', name: '', amount: 0 };
      Object.entries(currentByCategory).forEach(([categoryId, data]) => {
        if (data.amount > highestCategory.amount) {
          highestCategory = { id: categoryId, name: data.name, amount: data.amount };
        }
      });

      if (highestCategory.id) {
        recommendations.push({
          type: 'tip',
          title: `Consider reducing ${highestCategory.name} expenses`,
          description: `This category represents a significant portion of your monthly spending.`,
          category: highestCategory.id,
          emoji: '💡',
        });
      }

      // General saving tip
      recommendations.push({
        type: 'tip',
        title: 'Try the 50/30/20 rule',
        description: 'Consider allocating 50% of income to needs, 30% to wants, and 20% to savings.',
        emoji: '💰',
      });
    }

    // Limit to 3 recommendations
    const limitedRecommendations = recommendations.slice(0, 3);

    res.json({
      success: true,
      data: {
        recommendations: limitedRecommendations,
        monthlySummary: {
          current: currentByCategory,
          average: averagePreviousSpending,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;