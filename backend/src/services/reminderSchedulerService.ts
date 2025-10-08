import { PrismaClient, ReminderStatus, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationService } from './notificationService';
import { RecurringTransactionService } from './recurringTransactionService';
import { SmartAlertService } from './smartAlertService';

const prisma = new PrismaClient();

export class ReminderSchedulerService {
  private static instance: ReminderSchedulerService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  public static getInstance(): ReminderSchedulerService {
    if (!ReminderSchedulerService.instance) {
      ReminderSchedulerService.instance = new ReminderSchedulerService();
    }
    return ReminderSchedulerService.instance;
  }

  /**
   * Start the reminder scheduler
   */
  public start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    console.log(`Starting reminder scheduler with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately
    this.processReminders();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.processReminders();
    }, intervalMinutes * 60 * 1000);

    // Start smart alert service as well
    const smartAlertService = SmartAlertService.getInstance();
    smartAlertService.start(60); // Check smart alerts every hour
  }

  /**
   * Stop the reminder scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    
    // Stop smart alert service as well
    const smartAlertService = SmartAlertService.getInstance();
    smartAlertService.stop();
    
    console.log('Reminder scheduler stopped');
  }

  /**
   * Process all due reminders
   */
  private async processReminders(): Promise<void> {
    try {
      console.log('Processing reminders and recurring transactions...');
      
      // Process reminders
      await this.processReminderNotifications();
      
      // Process recurring transactions
      await RecurringTransactionService.processDueRecurringTransactions();

      console.log('Reminder and recurring transaction processing completed');
    } catch (error) {
      console.error('Error processing reminders and recurring transactions:', error);
    }
  }

  /**
   * Process reminder notifications only
   */
  private async processReminderNotifications(): Promise<void> {
    try {
      console.log('Processing reminder notifications...');
      
      // Get all active reminders that are due
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: {
          isActive: true,
          status: {
            in: [ReminderStatus.PENDING, ReminderStatus.OVERDUE],
          },
          OR: [
            {
              dueDate: {
                lte: now,
              },
              snoozeUntil: null,
            },
            {
              dueDate: {
                lte: now,
              },
              snoozeUntil: {
                lte: now,
              },
            },
          ],
        },
        include: {
          user: true,
          category: true,
          wallet: true,
        },
      });

      console.log(`Found ${dueReminders.length} due reminders`);

      for (const reminder of dueReminders) {
        await this.processIndividualReminder(reminder);
      }

      // Process overdue reminders
      await this.markOverdueReminders();

      console.log('Reminder notification processing completed');
    } catch (error) {
      console.error('Error processing reminder notifications:', error);
    }
  }

  /**
   * Process an individual reminder
   */
  private async processIndividualReminder(reminder: any): Promise<void> {
    try {
      console.log(`Processing reminder: ${reminder.title} for user ${reminder.userId}`);

      // Check if we should send a notification
      const shouldNotify = await this.shouldSendNotification(reminder);

      if (shouldNotify) {
        // Create and send notification
        const message = this.formatReminderMessage(reminder);
        
        // Create notification in database
        const notification = await NotificationService.createNotification({
          userId: reminder.userId,
          title: `Reminder: ${reminder.title}`,
          message: message,
          type: NotificationType.REMINDER,
          priority: this.getReminderPriority(reminder),
          data: {
            reminderId: reminder.id,
            reminderTitle: reminder.title,
            amount: reminder.amount,
            dueDate: reminder.dueDate,
            categoryId: reminder.categoryId,
            walletId: reminder.walletId,
          },
          relatedEntityType: 'reminder',
          relatedEntityId: reminder.id,
        });

        // Send push notification
        await NotificationService.sendPushNotification({
          userId: reminder.userId,
          title: `Reminder: ${reminder.title}`,
          body: message,
          priority: 'high',
          data: {
            reminderId: reminder.id,
            notificationId: notification.id,
          },
        });
        console.log(`Notification sent for reminder: ${reminder.title}`);
      }

      // Auto-create transaction if enabled
      if (reminder.autoCreateTransaction && reminder.amount && reminder.walletId) {
        await this.createAutomaticTransaction(reminder);
      }

      // Update reminder status based on whether it's recurring
      if (reminder.isRecurring) {
        await this.handleRecurringReminder(reminder);
      } else {
        // Mark non-recurring reminder as overdue
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: ReminderStatus.OVERDUE },
        });
      }
    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Check if we should send a notification for this reminder
   */
  private async shouldSendNotification(reminder: any): Promise<boolean> {
    // Check user notification preferences
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: reminder.userId },
    });

    // If reminders are disabled, don't send
    if (preferences && !preferences.enableReminders) {
      return false;
    }

    // Check if we already sent a notification for this reminder occurrence
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: reminder.userId,
        relatedEntityType: 'reminder',
        relatedEntityId: reminder.id,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    // Don't send if we already sent a notification recently
    if (existingNotification) {
      return false;
    }

    return true;
  }

  /**
   * Format reminder notification message
   */
  private formatReminderMessage(reminder: any): string {
    let message = '';

    if (reminder.amount) {
      message += `Amount: ${reminder.amount}`;
      if (reminder.category) {
        message += ` (${reminder.category.name})`;
      }
    } else {
      message = reminder.description || 'You have a reminder due.';
    }

    if (reminder.wallet) {
      message += ` - ${reminder.wallet.name}`;
    }

    const dueDate = new Date(reminder.dueDate);
    const now = new Date();
    
    if (dueDate < now) {
      const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (overdueDays > 0) {
        message += ` (${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue)`;
      }
    }

    return message;
  }

  /**
   * Get reminder notification priority
   */
  private getReminderPriority(reminder: any): NotificationPriority {
    const now = new Date();
    const dueDate = new Date(reminder.dueDate);
    const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return NotificationPriority.HIGH; // Overdue
    } else if (daysDiff === 0) {
      return NotificationPriority.HIGH; // Due today
    } else if (daysDiff <= 1) {
      return NotificationPriority.MEDIUM; // Due tomorrow
    } else {
      return NotificationPriority.LOW; // Due later
    }
  }

  /**
   * Create automatic transaction for reminder
   */
  private async createAutomaticTransaction(reminder: any): Promise<void> {
    try {
      if (!reminder.transactionType || !reminder.amount || !reminder.walletId) {
        return;
      }

      console.log(`Creating automatic transaction for reminder: ${reminder.title}`);

      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: reminder.userId,
          walletId: reminder.walletId,
          categoryId: reminder.categoryId,
          amount: reminder.amount,
          type: reminder.transactionType,
          description: `Auto: ${reminder.title}`,
          date: new Date(),
        },
      });

      // Update wallet balance
      const wallet = await prisma.wallet.findUnique({
        where: { id: reminder.walletId },
      });

      if (wallet) {
        let newBalance = wallet.balance;
        
        if (reminder.transactionType === 'EXPENSE') {
          newBalance = wallet.balance.sub(reminder.amount);
        } else if (reminder.transactionType === 'INCOME') {
          newBalance = wallet.balance.add(reminder.amount);
        }

        await prisma.wallet.update({
          where: { id: reminder.walletId },
          data: { balance: newBalance },
        });

        // Create balance history record
        await prisma.balanceHistory.create({
          data: {
            walletId: reminder.walletId,
            balance: newBalance,
          },
        });
      }

      console.log(`Automatic transaction created: ${transaction.id}`);

      // Send notification about the automatic transaction
      const transactionMessage = `${reminder.transactionType.toLowerCase()} of ${reminder.amount} was automatically recorded for "${reminder.title}"`;
      
      // Create notification in database
      const notification = await NotificationService.createNotification({
        userId: reminder.userId,
        title: 'Automatic Transaction Created',
        message: transactionMessage,
        type: NotificationType.RECURRING_TRANSACTION,
        priority: NotificationPriority.MEDIUM,
        data: {
          transactionId: transaction.id,
          reminderId: reminder.id,
          amount: reminder.amount,
          type: reminder.transactionType,
        },
        relatedEntityType: 'transaction',
        relatedEntityId: transaction.id,
      });

      // Send push notification
      await NotificationService.sendPushNotification({
        userId: reminder.userId,
        title: 'Automatic Transaction Created',
        body: transactionMessage,
        priority: 'normal',
        data: {
          transactionId: transaction.id,
          notificationId: notification.id,
        },
      });
    } catch (error) {
      console.error(`Error creating automatic transaction for reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Handle recurring reminder logic
   */
  private async handleRecurringReminder(reminder: any): Promise<void> {
    try {
      // Calculate next due date
      const nextDue = this.calculateNextDueDate(reminder.dueDate, reminder.frequency);

      // Update reminder for next occurrence
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          dueDate: nextDue,
          nextDue: this.calculateNextDueDate(nextDue, reminder.frequency),
          status: ReminderStatus.PENDING,
          snoozeUntil: null, // Clear any snooze
          completedCount: reminder.completedCount + 1,
          lastCompleted: new Date(),
        },
      });

      console.log(`Recurring reminder updated: ${reminder.title}, next due: ${nextDue}`);
    } catch (error) {
      console.error(`Error handling recurring reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Mark overdue reminders
   */
  private async markOverdueReminders(): Promise<void> {
    try {
      const now = new Date();
      
      const result = await prisma.reminder.updateMany({
        where: {
          isActive: true,
          status: ReminderStatus.PENDING,
          dueDate: {
            lt: now,
          },
          OR: [
            { snoozeUntil: null },
            { snoozeUntil: { lt: now } },
          ],
        },
        data: {
          status: ReminderStatus.OVERDUE,
        },
      });

      if (result.count > 0) {
        console.log(`Marked ${result.count} reminders as overdue`);
      }
    } catch (error) {
      console.error('Error marking overdue reminders:', error);
    }
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'CUSTOM':
        // For custom frequency, default to monthly
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
    };
  }
}