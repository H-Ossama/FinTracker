import { PrismaClient, NotificationType, NotificationPriority, TransactionType } from '@prisma/client';
import { NotificationService } from './notificationService';

const prisma = new PrismaClient();

export interface SpendingPattern {
  categoryId: string;
  categoryName: string;
  averageAmount: number;
  currentAmount: number;
  transactionCount: number;
  percentageChange: number;
  isUnusual: boolean;
}

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  daysRemaining: number;
  alertType: 'warning' | 'exceeded' | 'approaching';
}

export class SmartAlertService {
  private static instance: SmartAlertService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  public static getInstance(): SmartAlertService {
    if (!SmartAlertService.instance) {
      SmartAlertService.instance = new SmartAlertService();
    }
    return SmartAlertService.instance;
  }

  /**
   * Start the smart alert monitoring
   */
  public start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log('Smart alert service is already running');
      return;
    }

    console.log(`Starting smart alert service with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately
    this.processSmartAlerts();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.processSmartAlerts();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the smart alert monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Smart alert service stopped');
  }

  /**
   * Process all smart alerts
   */
  private async processSmartAlerts(): Promise<void> {
    try {
      console.log('Processing smart alerts...');

      // Get all users for processing
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      for (const user of users) {
        await this.processUserAlerts(user.id);
      }

      console.log('Smart alert processing completed');
    } catch (error) {
      console.error('Error processing smart alerts:', error);
    }
  }

  /**
   * Process alerts for a specific user
   */
  private async processUserAlerts(userId: string): Promise<void> {
    try {
      // Check user notification preferences
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (preferences && !preferences.enableSpendingAlerts && !preferences.enableBudgetAlerts) {
        return; // User has disabled spending alerts
      }

      // Process different types of alerts
      await Promise.all([
        this.checkUnusualSpending(userId, preferences),
        this.checkBudgetAlerts(userId, preferences),
        this.checkGoalMilestones(userId, preferences),
        this.checkDailySpendingThreshold(userId, preferences),
        this.checkIncomePatterns(userId, preferences),
      ]);
    } catch (error) {
      console.error(`Error processing alerts for user ${userId}:`, error);
    }
  }

  /**
   * Check for unusual spending patterns
   */
  private async checkUnusualSpending(userId: string, preferences: any): Promise<void> {
    try {
      if (preferences && !preferences.enableSpendingAlerts) return;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get spending patterns for the last 30 days vs last 7 days
      const [historicalSpending, recentSpending] = await Promise.all([
        this.getCategorySpending(userId, thirtyDaysAgo, sevenDaysAgo),
        this.getCategorySpending(userId, sevenDaysAgo, now),
      ]);

      // Analyze patterns
      for (const category of recentSpending) {
        const historical = historicalSpending.find(h => h.categoryId === category.categoryId);
        
        if (!historical || historical.averageAmount === 0) continue;

        const weeklyAverage = historical.averageAmount / 3; // 30 days / 7 days * weeks
        const percentageIncrease = ((category.averageAmount - weeklyAverage) / weeklyAverage) * 100;

        // Alert if spending increased by more than 50% and amount is significant
        if (percentageIncrease > 50 && category.averageAmount > 50) {
          await this.sendUnusualSpendingAlert(userId, {
            categoryId: category.categoryId,
            categoryName: category.categoryName,
            averageAmount: weeklyAverage,
            currentAmount: category.averageAmount,
            transactionCount: category.transactionCount,
            percentageChange: percentageIncrease,
            isUnusual: true,
          });
        }
      }
    } catch (error) {
      console.error('Error checking unusual spending:', error);
    }
  }

  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(userId: string, preferences: any): Promise<void> {
    try {
      if (preferences && !preferences.enableBudgetAlerts) return;

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get all budgets for current month
      const budgets = await prisma.budget.findMany({
        where: {
          month: currentMonth,
          year: currentYear,
          isActive: true,
          category: {
            userId,
          },
        },
        include: {
          category: true,
        },
      });

      for (const budget of budgets) {
        // Calculate days remaining in month
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysRemaining = lastDayOfMonth - now.getDate();

        const spentAmount = budget.spent;
        const budgetAmount = budget.amount;
        const percentageUsed = (spentAmount.toNumber() / budgetAmount.toNumber()) * 100;
        const remainingAmount = budgetAmount.sub(spentAmount);

        let alertType: 'warning' | 'exceeded' | 'approaching' | null = null;

        if (percentageUsed >= 100) {
          alertType = 'exceeded';
        } else if (percentageUsed >= 80) {
          alertType = 'warning';
        } else if (percentageUsed >= 60 && daysRemaining <= 7) {
          alertType = 'approaching';
        }

        if (alertType) {
          await this.sendBudgetAlert(userId, {
            categoryId: budget.categoryId,
            categoryName: budget.category.name,
            budgetAmount: budgetAmount.toNumber(),
            spentAmount: spentAmount.toNumber(),
            remainingAmount: remainingAmount.toNumber(),
            percentageUsed,
            daysRemaining,
            alertType,
          });
        }
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }

  /**
   * Check goal milestones
   */
  private async checkGoalMilestones(userId: string, preferences: any): Promise<void> {
    try {
      if (preferences && !preferences.enableGoalNotifications) return;

      const goals = await prisma.goal.findMany({
        where: {
          userId,
          isAchieved: false,
        },
      });

      for (const goal of goals) {
        const progressPercentage = (goal.currentAmount.toNumber() / goal.targetAmount.toNumber()) * 100;
        
        // Check for milestone achievements (25%, 50%, 75%, 90%, 100%)
        const milestones = [25, 50, 75, 90, 100];
        
        for (const milestone of milestones) {
          if (progressPercentage >= milestone) {
            // Check if we already sent a notification for this milestone
            const existingNotification = await prisma.notification.findFirst({
              where: {
                userId,
                relatedEntityType: 'goal',
                relatedEntityId: goal.id,
                type: milestone === 100 ? NotificationType.GOAL_ACHIEVED : NotificationType.GOAL_MILESTONE,
                data: {
                  path: ['milestone'],
                  equals: milestone,
                },
              },
            });

            if (!existingNotification) {
              await this.sendGoalMilestoneAlert(userId, goal, milestone);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking goal milestones:', error);
    }
  }

  /**
   * Check daily spending threshold
   */
  private async checkDailySpendingThreshold(userId: string, preferences: any): Promise<void> {
    try {
      if (preferences && !preferences.enableSpendingAlerts) return;

      const threshold = preferences?.spendingAlertThreshold || 100;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Get today's expenses
      const todayExpenses = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: startOfDay,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalSpent = todayExpenses._sum.amount?.toNumber() || 0;

      if (totalSpent > threshold) {
        // Check if we already sent an alert today
        const existingAlert = await prisma.notification.findFirst({
          where: {
            userId,
            type: NotificationType.SPENDING_ALERT,
            createdAt: {
              gte: startOfDay,
            },
            data: {
              path: ['type'],
              equals: 'daily_threshold',
            },
          },
        });

        if (!existingAlert) {
          await this.sendDailySpendingAlert(userId, totalSpent, threshold);
        }
      }
    } catch (error) {
      console.error('Error checking daily spending threshold:', error);
    }
  }

  /**
   * Check income patterns for opportunities
   */
  private async checkIncomePatterns(userId: string, preferences: any): Promise<void> {
    try {
      if (preferences && !preferences.enableTips) return;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get income trends
      const incomeData = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      const totalIncome = incomeData._sum.amount?.toNumber() || 0;
      const incomeCount = incomeData._count || 0;

      // Get expense data for comparison
      const expenseData = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalExpenses = expenseData._sum.amount?.toNumber() || 0;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      // Send tips based on patterns
      if (savingsRate < 10 && totalIncome > 0) {
        await this.sendSavingsRateTip(userId, savingsRate);
      } else if (savingsRate > 30) {
        await this.sendInvestmentTip(userId, savingsRate);
      }
    } catch (error) {
      console.error('Error checking income patterns:', error);
    }
  }

  /**
   * Get category spending data
   */
  private async getCategorySpending(userId: string, startDate: Date, endDate: Date): Promise<SpendingPattern[]> {
    const spending = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: {
          gte: startDate,
          lte: endDate,
        },
        categoryId: {
          not: null,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const categoryIds = spending.map(s => s.categoryId!);
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });

    return spending.map(s => {
      const category = categories.find(c => c.id === s.categoryId);
      return {
        categoryId: s.categoryId!,
        categoryName: category?.name || 'Unknown',
        averageAmount: s._sum.amount?.toNumber() || 0,
        currentAmount: s._sum.amount?.toNumber() || 0,
        transactionCount: s._count,
        percentageChange: 0,
        isUnusual: false,
      };
    });
  }

  /**
   * Send unusual spending alert
   */
  private async sendUnusualSpendingAlert(userId: string, pattern: SpendingPattern): Promise<void> {
    const notification = await NotificationService.createNotification({
      userId,
      title: 'Unusual Spending Detected',
      message: `Your spending on ${pattern.categoryName} has increased by ${pattern.percentageChange.toFixed(1)}% this week. You spent $${pattern.currentAmount.toFixed(2)} compared to your usual $${pattern.averageAmount.toFixed(2)}.`,
      type: NotificationType.UNUSUAL_SPENDING,
      priority: NotificationPriority.MEDIUM,
      data: {
        categoryId: pattern.categoryId,
        categoryName: pattern.categoryName,
        percentageIncrease: pattern.percentageChange,
        currentAmount: pattern.currentAmount,
        averageAmount: pattern.averageAmount,
      },
      relatedEntityType: 'category',
      relatedEntityId: pattern.categoryId,
    });

    await NotificationService.sendPushNotification({
      userId,
      title: 'Unusual Spending Detected',
      body: `Your ${pattern.categoryName} spending increased by ${pattern.percentageChange.toFixed(1)}% this week`,
      priority: 'normal',
      data: {
        notificationId: notification.id,
        categoryId: pattern.categoryId,
      },
    });
  }

  /**
   * Send budget alert
   */
  private async sendBudgetAlert(userId: string, alert: BudgetAlert): Promise<void> {
    let title = '';
    let message = '';
    let priority: NotificationPriority = NotificationPriority.MEDIUM;

    switch (alert.alertType) {
      case 'exceeded':
        title = 'Budget Exceeded';
        message = `You've exceeded your ${alert.categoryName} budget by $${Math.abs(alert.remainingAmount).toFixed(2)}. Budget: $${alert.budgetAmount.toFixed(2)}, Spent: $${alert.spentAmount.toFixed(2)}.`;
        priority = NotificationPriority.HIGH;
        break;
      case 'warning':
        title = 'Budget Warning';
        message = `You've used ${alert.percentageUsed.toFixed(1)}% of your ${alert.categoryName} budget. $${alert.remainingAmount.toFixed(2)} remaining.`;
        priority = NotificationPriority.MEDIUM;
        break;
      case 'approaching':
        title = 'Budget Alert';
        message = `You've used ${alert.percentageUsed.toFixed(1)}% of your ${alert.categoryName} budget with ${alert.daysRemaining} days left this month.`;
        priority = NotificationPriority.LOW;
        break;
    }

    const notification = await NotificationService.createNotification({
      userId,
      title,
      message,
      type: alert.alertType === 'exceeded' ? NotificationType.BUDGET_EXCEEDED : NotificationType.BUDGET_WARNING,
      priority,
      data: {
        categoryId: alert.categoryId,
        categoryName: alert.categoryName,
        budgetAmount: alert.budgetAmount,
        spentAmount: alert.spentAmount,
        percentageUsed: alert.percentageUsed,
        alertType: alert.alertType,
      },
      relatedEntityType: 'budget',
      relatedEntityId: alert.categoryId,
    });

    await NotificationService.sendPushNotification({
      userId,
      title,
      body: message,
      priority: alert.alertType === 'exceeded' ? 'high' : 'normal',
      data: {
        notificationId: notification.id,
        categoryId: alert.categoryId,
      },
    });
  }

  /**
   * Send goal milestone alert
   */
  private async sendGoalMilestoneAlert(userId: string, goal: any, milestone: number): Promise<void> {
    const isAchieved = milestone === 100;
    const title = isAchieved ? 'Goal Achieved! 🎉' : `Goal Progress: ${milestone}% Complete! 🎯`;
    const message = isAchieved 
      ? `Congratulations! You've reached your goal "${goal.title}" with $${goal.currentAmount.toFixed(2)}!`
      : `You're ${milestone}% of the way to your goal "${goal.title}". Keep it up! $${goal.currentAmount.toFixed(2)} of $${goal.targetAmount.toFixed(2)}`;

    const notification = await NotificationService.createNotification({
      userId,
      title,
      message,
      type: isAchieved ? NotificationType.GOAL_ACHIEVED : NotificationType.GOAL_MILESTONE,
      priority: isAchieved ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      data: {
        goalId: goal.id,
        goalTitle: goal.title,
        milestone,
        currentAmount: goal.currentAmount.toNumber(),
        targetAmount: goal.targetAmount.toNumber(),
        isAchieved,
      },
      relatedEntityType: 'goal',
      relatedEntityId: goal.id,
    });

    // Mark goal as achieved if 100%
    if (isAchieved) {
      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          isAchieved: true,
          achievedAt: new Date(),
        },
      });
    }

    await NotificationService.sendPushNotification({
      userId,
      title,
      body: message,
      priority: isAchieved ? 'high' : 'normal',
      data: {
        notificationId: notification.id,
        goalId: goal.id,
      },
    });
  }

  /**
   * Send daily spending alert
   */
  private async sendDailySpendingAlert(userId: string, totalSpent: number, threshold: number): Promise<void> {
    const notification = await NotificationService.createNotification({
      userId,
      title: 'Daily Spending Alert',
      message: `You've spent $${totalSpent.toFixed(2)} today, which exceeds your daily threshold of $${threshold.toFixed(2)}.`,
      type: NotificationType.SPENDING_ALERT,
      priority: NotificationPriority.MEDIUM,
      data: {
        type: 'daily_threshold',
        totalSpent,
        threshold,
        date: new Date().toISOString(),
      },
      relatedEntityType: 'spending',
      relatedEntityId: userId,
    });

    await NotificationService.sendPushNotification({
      userId,
      title: 'Daily Spending Alert',
      body: `You've spent $${totalSpent.toFixed(2)} today, exceeding your $${threshold.toFixed(2)} threshold`,
      priority: 'normal',
      data: {
        notificationId: notification.id,
      },
    });
  }

  /**
   * Send savings rate tip
   */
  private async sendSavingsRateTip(userId: string, savingsRate: number): Promise<void> {
    const tips = [
      "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings",
      "Review your subscriptions - cancel unused services",
      "Cook at home more often to reduce food expenses",
      "Set up automatic transfers to your savings account",
      "Track your expenses for a week to identify spending patterns",
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    await NotificationService.createNotification({
      userId,
      title: 'Savings Tip 💡',
      message: `Your savings rate is ${savingsRate.toFixed(1)}%. Here's a tip to improve it: ${randomTip}`,
      type: NotificationType.TIP,
      priority: NotificationPriority.LOW,
      data: {
        type: 'savings_rate',
        savingsRate,
        tip: randomTip,
      },
      relatedEntityType: 'tip',
      relatedEntityId: userId,
    });
  }

  /**
   * Send investment tip
   */
  private async sendInvestmentTip(userId: string, savingsRate: number): Promise<void> {
    const tips = [
      "Great savings rate! Consider investing in a diversified portfolio",
      "You're saving well! Look into index funds for long-term growth",
      "Your savings discipline is excellent! Consider retirement accounts like 401(k) or IRA",
      "Strong saver! Research dollar-cost averaging for consistent investing",
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    await NotificationService.createNotification({
      userId,
      title: 'Investment Opportunity 📈',
      message: `Your ${savingsRate.toFixed(1)}% savings rate is excellent! ${randomTip}`,
      type: NotificationType.TIP,
      priority: NotificationPriority.LOW,
      data: {
        type: 'investment_tip',
        savingsRate,
        tip: randomTip,
      },
      relatedEntityType: 'tip',
      relatedEntityId: userId,
    });
  }

  /**
   * Get smart alert status
   */
  public getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
    };
  }

  /**
   * Manually trigger smart alerts for a user (for testing)
   */
  public async triggerUserAlerts(userId: string): Promise<void> {
    await this.processUserAlerts(userId);
  }
}