import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationPreferencesService {
  /**
   * Create default notification preferences for a new user
   */
  static async createDefaultPreferences(userId: string) {
    try {
      const preferences = await prisma.notificationPreferences.create({
        data: {
          userId,
          enablePushNotifications: true,
          enableReminders: true,
          enableBudgetAlerts: true,
          enableGoalNotifications: true,
          enableSpendingAlerts: true,
          enableTips: true,
          enableSyncReminders: true,
          enableEmailNotifications: false,
          enableEmailWeeklyReport: false,
          enableEmailMonthlyReport: false,
          enableQuietHours: false,
          reminderFrequencyMinutes: 60,
          spendingAlertThreshold: 100,
        },
      });

      return preferences;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      throw new Error('Failed to create notification preferences');
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string) {
    try {
      let preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      throw new Error('Failed to get notification preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(userId: string, data: any) {
    try {
      const preferences = await prisma.notificationPreferences.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
          // Ensure all required fields have defaults
          enablePushNotifications: data.enablePushNotifications ?? true,
          enableReminders: data.enableReminders ?? true,
          enableBudgetAlerts: data.enableBudgetAlerts ?? true,
          enableGoalNotifications: data.enableGoalNotifications ?? true,
          enableSpendingAlerts: data.enableSpendingAlerts ?? true,
          enableTips: data.enableTips ?? true,
          enableSyncReminders: data.enableSyncReminders ?? true,
          enableEmailNotifications: data.enableEmailNotifications ?? false,
          enableEmailWeeklyReport: data.enableEmailWeeklyReport ?? false,
          enableEmailMonthlyReport: data.enableEmailMonthlyReport ?? false,
          enableQuietHours: data.enableQuietHours ?? false,
          reminderFrequencyMinutes: data.reminderFrequencyMinutes ?? 60,
          spendingAlertThreshold: data.spendingAlertThreshold ?? 100,
        },
      });

      return preferences;
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }
}