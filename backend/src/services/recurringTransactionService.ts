import { PrismaClient, ReminderFrequency, TransactionType, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationService } from './notificationService';

const prisma = new PrismaClient();

export class RecurringTransactionService {
  /**
   * Create a new recurring transaction
   */
  static async createRecurringTransaction(data: {
    userId: string;
    amount: number;
    description: string;
    type: TransactionType;
    frequency: ReminderFrequency;
    walletId: string;
    categoryId?: string;
    nextExecutionDate: Date;
    endDate?: Date;
    maxExecutions?: number;
  }) {
    try {
      const recurringTransaction = await prisma.recurringTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          description: data.description,
          type: data.type,
          frequency: data.frequency,
          walletId: data.walletId,
          categoryId: data.categoryId || null,
          nextExecutionDate: data.nextExecutionDate,
          endDate: data.endDate || null,
          maxExecutions: data.maxExecutions || null,
        },
        include: {
          user: true,
          wallet: true,
          category: true,
        },
      });

      return recurringTransaction;
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      throw new Error('Failed to create recurring transaction');
    }
  }

  /**
   * Process all due recurring transactions
   */
  static async processDueRecurringTransactions() {
    try {
      console.log('Processing due recurring transactions...');
      
      const now = new Date();
      
      // Get all active recurring transactions that are due
      const dueTransactions = await prisma.recurringTransaction.findMany({
        where: {
          isActive: true,
          nextExecutionDate: {
            lte: now,
          },
          AND: [
            {
              OR: [
                { endDate: null },
                { endDate: { gte: now } },
              ],
            },
            {
              OR: [
                { maxExecutions: null },
                { 
                  executionCount: {
                    lt: prisma.recurringTransaction.fields.maxExecutions,
                  },
                },
              ],
            },
          ],
        },
        include: {
          user: true,
          wallet: true,
          category: true,
        },
      });

      console.log(`Found ${dueTransactions.length} due recurring transactions`);

      for (const recurringTransaction of dueTransactions) {
        await this.executeRecurringTransaction(recurringTransaction);
      }

      console.log('Recurring transaction processing completed');
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
    }
  }

  /**
   * Execute a single recurring transaction
   */
  static async executeRecurringTransaction(recurringTransaction: any) {
    try {
      console.log(`Executing recurring transaction: ${recurringTransaction.description} for user ${recurringTransaction.userId}`);

      // Check if wallet has sufficient balance for expenses
      if (recurringTransaction.type === TransactionType.EXPENSE) {
        const wallet = await prisma.wallet.findUnique({
          where: { id: recurringTransaction.walletId },
        });

        if (!wallet) {
          console.error(`Wallet not found: ${recurringTransaction.walletId}`);
          return;
        }

        // Skip if insufficient balance (unless it's a credit card)
        if (wallet.type !== 'CREDIT_CARD' && wallet.balance.lessThan(recurringTransaction.amount)) {
          console.log(`Insufficient balance for recurring transaction ${recurringTransaction.id}`);
          
          // Send notification about insufficient balance
          await NotificationService.createNotification({
            userId: recurringTransaction.userId,
            title: 'Recurring Transaction Skipped',
            message: `Insufficient balance for "${recurringTransaction.description}". Required: ${recurringTransaction.amount}, Available: ${wallet.balance}`,
            type: NotificationType.SPENDING_ALERT,
            priority: NotificationPriority.HIGH,
            data: {
              recurringTransactionId: recurringTransaction.id,
              requiredAmount: recurringTransaction.amount,
              availableBalance: wallet.balance,
            },
            relatedEntityType: 'recurring_transaction',
            relatedEntityId: recurringTransaction.id,
          });

          // Update next execution date but don't create transaction
          await this.updateNextExecutionDate(recurringTransaction);
          return;
        }
      }

      // Start transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Create the transaction
        const transaction = await tx.transaction.create({
          data: {
            userId: recurringTransaction.userId,
            walletId: recurringTransaction.walletId,
            categoryId: recurringTransaction.categoryId,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            description: `${recurringTransaction.description} (Auto)`,
            date: new Date(),
          },
        });

        // Update wallet balance
        const wallet = await tx.wallet.findUnique({
          where: { id: recurringTransaction.walletId },
        });

        if (wallet) {
          let newBalance = wallet.balance;
          
          if (recurringTransaction.type === TransactionType.EXPENSE) {
            newBalance = wallet.balance.sub(recurringTransaction.amount);
          } else if (recurringTransaction.type === TransactionType.INCOME) {
            newBalance = wallet.balance.add(recurringTransaction.amount);
          }

          await tx.wallet.update({
            where: { id: recurringTransaction.walletId },
            data: { balance: newBalance },
          });

          // Create balance history record
          await tx.balanceHistory.create({
            data: {
              walletId: recurringTransaction.walletId,
              balance: newBalance,
            },
          });
        }

        // Update recurring transaction
        const nextExecutionDate = this.calculateNextExecutionDate(
          recurringTransaction.nextExecutionDate,
          recurringTransaction.frequency
        );

        const shouldDeactivate = this.shouldDeactivateRecurringTransaction(
          recurringTransaction,
          nextExecutionDate
        );

        const updateData: any = {
          executionCount: recurringTransaction.executionCount + 1,
          lastExecutionDate: new Date(),
        };

        if (shouldDeactivate) {
          updateData.isActive = false;
        } else {
          updateData.nextExecutionDate = nextExecutionDate;
        }

        await tx.recurringTransaction.update({
          where: { id: recurringTransaction.id },
          data: updateData,
        });

        console.log(`Recurring transaction executed: ${transaction.id}`);

        // Send notification about successful execution
        const notification = await NotificationService.createNotification({
          userId: recurringTransaction.userId,
          title: 'Automatic Transaction Created',
          message: `${recurringTransaction.type.toLowerCase()} of ${recurringTransaction.amount} was automatically recorded for "${recurringTransaction.description}"`,
          type: NotificationType.RECURRING_TRANSACTION,
          priority: NotificationPriority.MEDIUM,
          data: {
            transactionId: transaction.id,
            recurringTransactionId: recurringTransaction.id,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            nextExecutionDate: shouldDeactivate ? null : nextExecutionDate,
          },
          relatedEntityType: 'transaction',
          relatedEntityId: transaction.id,
        });

        // Send push notification
        await NotificationService.sendPushNotification({
          userId: recurringTransaction.userId,
          title: 'Automatic Transaction Created',
          body: `${recurringTransaction.type.toLowerCase()} of ${recurringTransaction.amount} was automatically recorded for "${recurringTransaction.description}"`,
          priority: 'normal',
          data: {
            transactionId: transaction.id,
            notificationId: notification.id,
          },
        });

        // If this was the last execution, send completion notification
        if (shouldDeactivate) {
          await NotificationService.createNotification({
            userId: recurringTransaction.userId,
            title: 'Recurring Transaction Completed',
            message: `"${recurringTransaction.description}" has finished its recurring schedule after ${recurringTransaction.executionCount + 1} executions.`,
            type: NotificationType.ACHIEVEMENT,
            priority: NotificationPriority.LOW,
            data: {
              recurringTransactionId: recurringTransaction.id,
              totalExecutions: recurringTransaction.executionCount + 1,
            },
            relatedEntityType: 'recurring_transaction',
            relatedEntityId: recurringTransaction.id,
          });
        }
      });
    } catch (error) {
      console.error(`Error executing recurring transaction ${recurringTransaction.id}:`, error);
      
      // Send error notification
      await NotificationService.createNotification({
        userId: recurringTransaction.userId,
        title: 'Recurring Transaction Failed',
        message: `Failed to execute "${recurringTransaction.description}". Please check your account and try again.`,
        type: NotificationType.SPENDING_ALERT,
        priority: NotificationPriority.HIGH,
        data: {
          recurringTransactionId: recurringTransaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        relatedEntityType: 'recurring_transaction',
        relatedEntityId: recurringTransaction.id,
      });
    }
  }

  /**
   * Update next execution date for a recurring transaction
   */
  static async updateNextExecutionDate(recurringTransaction: any) {
    try {
      const nextExecutionDate = this.calculateNextExecutionDate(
        recurringTransaction.nextExecutionDate,
        recurringTransaction.frequency
      );

      const shouldDeactivate = this.shouldDeactivateRecurringTransaction(
        recurringTransaction,
        nextExecutionDate
      );

      const updateData: any = {};
      
      if (shouldDeactivate) {
        updateData.isActive = false;
      } else {
        updateData.nextExecutionDate = nextExecutionDate;
      }

      await prisma.recurringTransaction.update({
        where: { id: recurringTransaction.id },
        data: updateData,
      });
    } catch (error) {
      console.error(`Error updating next execution date for recurring transaction ${recurringTransaction.id}:`, error);
    }
  }

  /**
   * Calculate next execution date based on frequency
   */
  static calculateNextExecutionDate(currentDate: Date, frequency: ReminderFrequency): Date {
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

  /**
   * Check if recurring transaction should be deactivated
   */
  static shouldDeactivateRecurringTransaction(recurringTransaction: any, nextExecutionDate: Date): boolean {
    // Check if we've reached max executions
    if (recurringTransaction.maxExecutions && 
        (recurringTransaction.executionCount + 1) >= recurringTransaction.maxExecutions) {
      return true;
    }

    // Check if we've passed the end date
    if (recurringTransaction.endDate && nextExecutionDate > recurringTransaction.endDate) {
      return true;
    }

    return false;
  }

  /**
   * Get all recurring transactions for a user
   */
  static async getUserRecurringTransactions(userId: string, options: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  } = {}) {
    try {
      const { page = 1, limit = 20, isActive } = options;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [recurringTransactions, total] = await Promise.all([
        prisma.recurringTransaction.findMany({
          where,
          include: {
            wallet: true,
            category: true,
          },
          orderBy: { nextExecutionDate: 'asc' },
          skip,
          take: limit,
        }),
        prisma.recurringTransaction.count({ where }),
      ]);

      return {
        recurringTransactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting user recurring transactions:', error);
      throw new Error('Failed to get recurring transactions');
    }
  }

  /**
   * Update recurring transaction
   */
  static async updateRecurringTransaction(id: string, userId: string, data: any) {
    try {
      // Check if recurring transaction exists and belongs to user
      const existingTransaction = await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      });

      if (!existingTransaction) {
        throw new Error('Recurring transaction not found');
      }

      const recurringTransaction = await prisma.recurringTransaction.update({
        where: { id },
        data,
        include: {
          wallet: true,
          category: true,
        },
      });

      return recurringTransaction;
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      throw new Error('Failed to update recurring transaction');
    }
  }

  /**
   * Delete recurring transaction
   */
  static async deleteRecurringTransaction(id: string, userId: string) {
    try {
      // Check if recurring transaction exists and belongs to user
      const existingTransaction = await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      });

      if (!existingTransaction) {
        throw new Error('Recurring transaction not found');
      }

      await prisma.recurringTransaction.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      throw new Error('Failed to delete recurring transaction');
    }
  }

  /**
   * Pause/resume recurring transaction
   */
  static async toggleRecurringTransaction(id: string, userId: string) {
    try {
      const existingTransaction = await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      });

      if (!existingTransaction) {
        throw new Error('Recurring transaction not found');
      }

      const recurringTransaction = await prisma.recurringTransaction.update({
        where: { id },
        data: { isActive: !existingTransaction.isActive },
        include: {
          wallet: true,
          category: true,
        },
      });

      return recurringTransaction;
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      throw new Error('Failed to toggle recurring transaction');
    }
  }
}