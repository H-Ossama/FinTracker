import { PrismaClient, NotificationType, NotificationPriority, $Enums } from '@prisma/client';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const prisma = new PrismaClient();
const expo = new Expo();

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  data?: any;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface SendPushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: any;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  badge?: number;
}

export class NotificationService {
  /**
   * Create a notification in the database
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority || NotificationPriority.MEDIUM,
          data: data.data || null,
          actionUrl: data.actionUrl || null,
          relatedEntityType: data.relatedEntityType || null,
          relatedEntityId: data.relatedEntityId || null,
        },
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Send push notification to user's devices
   */
  static async sendPushNotification(data: SendPushNotificationData) {
    try {
      // Get user's push tokens
      const pushTokens = await prisma.pushToken.findMany({
        where: {
          userId: data.userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (pushTokens.length === 0) {
        console.log(`No active push tokens found for user ${data.userId}`);
        return [];
      }

      // Prepare push messages
      const messages: ExpoPushMessage[] = [];

      for (const tokenRecord of pushTokens) {
        // Check if token is valid Expo push token
        if (!Expo.isExpoPushToken(tokenRecord.token)) {
          console.error(`Invalid Expo push token: ${tokenRecord.token}`);
          // Mark token as inactive
          await prisma.pushToken.update({
            where: { id: tokenRecord.id },
            data: { isActive: false },
          });
          continue;
        }

        messages.push({
          to: tokenRecord.token,
          title: data.title,
          body: data.body,
          data: data.data,
          priority: data.priority || 'default',
          sound: data.sound !== null ? (data.sound || 'default') : null,
          ...(data.badge !== undefined && { badge: data.badge }),
        });
      }

      if (messages.length === 0) {
        console.log('No valid push tokens to send notifications to');
        return [];
      }

      // Send push notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);

          // Update lastUsed timestamp for successful tokens
          for (let i = 0; i < chunk.length; i++) {
            const ticket = ticketChunk[i];
            const message = chunk[i];
            if (ticket && ticket.status === 'ok' && message) {
              const tokenRecord = pushTokens.find(t => t.token === message.to);
              if (tokenRecord) {
                await prisma.pushToken.update({
                  where: { id: tokenRecord.id },
                  data: { lastUsed: new Date() },
                });
              }
            } else if (ticket && ticket.status === 'error') {
              console.error(`Push notification error:`, ticket.details);
              // Handle specific errors (e.g., DeviceNotRegistered)
              if (ticket.details?.error === 'DeviceNotRegistered' && message) {
                const tokenRecord = pushTokens.find(t => t.token === message.to);
                if (tokenRecord) {
                  await prisma.pushToken.update({
                    where: { id: tokenRecord.id },
                    data: { isActive: false },
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  /**
   * Create and send notification (database + push)
   */
  static async createAndSendNotification(data: CreateNotificationData & SendPushNotificationData) {
    try {
      // Check user's notification preferences
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId: data.userId },
      });

      // Create notification in database
      const notification = await this.createNotification(data);

      // Check if push notifications are enabled
      if (preferences?.enablePushNotifications !== false) {
        // Check specific notification type preferences
        let shouldSend = true;

        switch (data.type) {
          case NotificationType.REMINDER:
          case NotificationType.PAYMENT_DUE:
            shouldSend = preferences?.enableReminders !== false;
            break;
          case NotificationType.BUDGET_WARNING:
          case NotificationType.BUDGET_EXCEEDED:
            shouldSend = preferences?.enableBudgetAlerts !== false;
            break;
          case NotificationType.GOAL_ACHIEVED:
          case NotificationType.GOAL_MILESTONE:
            shouldSend = preferences?.enableGoalNotifications !== false;
            break;
          case NotificationType.SPENDING_ALERT:
          case NotificationType.UNUSUAL_SPENDING:
            shouldSend = preferences?.enableSpendingAlerts !== false;
            break;
          case NotificationType.TIP:
            shouldSend = preferences?.enableTips !== false;
            break;
          case NotificationType.SYNC_REMINDER:
            shouldSend = preferences?.enableSyncReminders !== false;
            break;
        }

        // Check quiet hours
        if (shouldSend && preferences?.enableQuietHours) {
          const now = new Date();
          const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
          
          if (preferences.quietHoursStart && preferences.quietHoursEnd) {
            const start = preferences.quietHoursStart;
            const end = preferences.quietHoursEnd;
            
            // Handle quiet hours that span midnight
            if (start > end) {
              shouldSend = !(currentTime >= start || currentTime <= end);
            } else {
              shouldSend = !(currentTime >= start && currentTime <= end);
            }
          }
        }

        if (shouldSend) {
          const tickets = await this.sendPushNotification({
            userId: data.userId,
            title: data.title,
            body: data.message,
            data: data.data,
            priority: data.priority === NotificationPriority.HIGH ? 'high' : 'default',
          });

          // Update notification with sent timestamp
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });

          return { notification, tickets };
        }
      }

      return { notification, tickets: [] };
    } catch (error) {
      console.error('Error creating and sending notification:', error);
      throw new Error('Failed to create and send notification');
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(userId: string, options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = options;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      
      if (unreadOnly) {
        where.isRead = false;
      }
      
      if (type) {
        where.type = type;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw new Error('Failed to get notifications');
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.delete({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
      });

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw new Error('Failed to get unread count');
    }
  }

  /**
   * Register push token
   */
  static async registerPushToken(userId: string, token: string, deviceInfo: {
    deviceId?: string;
    platform?: string;
    appVersion?: string;
  } = {}) {
    try {
      // Validate token
      if (!Expo.isExpoPushToken(token)) {
        throw new Error('Invalid Expo push token');
      }

      // Upsert push token
      const pushToken = await prisma.pushToken.upsert({
        where: { token },
        update: {
          userId,
          isActive: true,
          lastUsed: new Date(),
          deviceId: deviceInfo.deviceId || null,
          platform: deviceInfo.platform || null,
          appVersion: deviceInfo.appVersion || null,
        },
        create: {
          token,
          userId,
          deviceId: deviceInfo.deviceId || null,
          platform: deviceInfo.platform || null,
          appVersion: deviceInfo.appVersion || null,
        },
      });

      return pushToken;
    } catch (error) {
      console.error('Error registering push token:', error);
      throw new Error('Failed to register push token');
    }
  }

  /**
   * Unregister push token
   */
  static async unregisterPushToken(token: string) {
    try {
      const pushToken = await prisma.pushToken.update({
        where: { token },
        data: { isActive: false },
      });

      return pushToken;
    } catch (error) {
      console.error('Error unregistering push token:', error);
      throw new Error('Failed to unregister push token');
    }
  }
}