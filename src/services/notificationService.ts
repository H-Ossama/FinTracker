import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { navigate } from '../navigation/navigationService';

// Check if we're in a development build (not Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';
const isDevBuild = !isExpoGo;

// Only configure notification handler if not in Expo Go or if in dev build
if (isDevBuild || !isExpoGo) {
  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationPermissions {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

export interface PushToken {
  token: string;
  type: 'expo';
}

export class NotificationService {
  private static pushToken: string | null = null;
  private static listeners: Array<() => void> = [];
  private static processedResponseIds = new Set<string>();

  /**
   * Initialize notification service
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔔 Initializing notification service...');
      
      // Register for push notifications if device is physical and not in Expo Go
      if (Device.isDevice && !isExpoGo) {
        try {
          await this.registerForPushNotifications();
        } catch (pushError) {
          console.warn('Push notification registration failed:', (pushError as Error).message);
        }
      } else if (isExpoGo) {
        console.log('📱 Running in Expo Go - local notifications available');
        console.log('ℹ️  Push notifications require development build');
        
        // Still create notification channels for local notifications
        await this.createNotificationChannels();
      } else {
        console.log('📱 Push notifications not available on simulator/emulator');
      }

  // Set up notification listeners
  this.setupNotificationListeners();

  await this.handleInitialNotificationResponse();
      
      console.log('✅ Notification service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      // Don't throw error to prevent app crash
    }
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<NotificationPermissions> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return {
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus === 'undetermined',
        status: finalStatus,
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }
  }

  /**
   * Get current notification permissions
   */
  static async getPermissions(): Promise<NotificationPermissions> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain: status === 'undetermined',
        status,
      };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }
  }

  /**
   * Register for push notifications
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('📱 Push notifications require a physical device');
        return null;
      }

      // Check if we're in Expo Go
      if (isExpoGo) {
        console.log('📱 Running in Expo Go - push notifications unavailable (this is normal)');
        console.log('ℹ️  Local notifications are fully functional');
        console.log('ℹ️  For push notifications, create a development build with: eas build --platform android --profile development');
        return null;
      }

      // Request permissions
      const permissions = await this.requestPermissions();
      
      if (!permissions.granted) {
        console.log('🔔 Push notification permissions not granted');
        return null;
      }

      // Check if we have a valid project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.warn('⚠️  No valid project ID found. Push notifications require a development build with proper EAS project setup.');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.pushToken = tokenData.data;
      console.log('🎯 Push token obtained successfully');

      // Configure notification channels
      await this.createNotificationChannels();

      return this.pushToken;
    } catch (error) {
      // More specific error handling for Firebase/FCM issues
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('FirebaseApp is not initialized')) {
        console.log('ℹ️  Firebase not configured - this is expected in Expo Go');
        console.log('ℹ️  Local notifications are working fine');
      } else if (errorMessage.includes('FCM')) {
        console.log('ℹ️  FCM (Firebase Cloud Messaging) not configured - normal for development');
      } else {
        console.warn('⚠️  Push notification setup issue:', errorMessage);
      }
      
      return null;
    }
  }

  /**
   * Create notification channels for Android
   */
  private static async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Create additional channels for different types
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('budget-alerts', {
        name: 'Budget Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('goals', {
        name: 'Goals & Achievements',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#10B981',
        sound: 'default',
      });

      console.log('📋 Notification channels created successfully');
    } catch (error) {
      console.warn('⚠️  Error creating notification channels:', error);
    }
  }

  /**
   * Get current push token
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Setup notification listeners
   */
  static setupNotificationListeners(): void {
    // Listener for notifications received while app is running
    // NOTE: In development, this may fire when scheduling AND when actually triggered
    // We filter out the premature triggers in handleNotificationReceived
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      this.handleNotificationReceived(notification);
    });

    // Listener for notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 User tapped notification:', {
        id: response.notification.request.identifier,
        title: response.notification.request.content.title,
      });
      this.handleNotificationResponse(response);
    });

    // Store listeners for cleanup
    this.listeners.push(
      () => notificationListener.remove(),
      () => responseListener.remove()
    );
  }

  /**
   * Notification received callback - to be set by NotificationContext
   */
  private static onNotificationReceived: ((notification: Notifications.Notification) => void) | null = null;
  private static onNotificationDelayed: ((info: {
    id: string;
    title: string | null;
    expectedAt: number;
    receivedAt: number;
    delayMs: number;
    data: any;
  }) => void) | null = null;

  /**
   * Set callback for when notifications are received
   */
  static setNotificationReceivedCallback(callback: (notification: Notifications.Notification) => void) {
    this.onNotificationReceived = callback;
  }

  static setNotificationDelayCallback(
    callback: ((info: {
      id: string;
      title: string | null;
      expectedAt: number;
      receivedAt: number;
      delayMs: number;
      data: any;
    }) => void) | null,
  ) {
    this.onNotificationDelayed = callback;
  }

  /**
   * Store of recently scheduled notification IDs with their expected trigger time
   */
  private static scheduledNotifications = new Map<string, number>();

  /**
   * Handle notification received while app is running
   */
  private static handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    const notificationId = notification.request.identifier;
    
    // Check if this notification was recently scheduled
    const expectedTriggerTime = this.scheduledNotifications.get(notificationId);
    const now = Date.now();
    const notificationDate = notification.date;
    
    if (expectedTriggerTime) {
      // Calculate how early this notification is firing
      const timeUntilExpected = expectedTriggerTime - now;
      
      if (timeUntilExpected > 5000) {
        // Notification is firing more than 5 seconds early - this is the scheduling artifact
        console.log('🚫 Ignoring premature notification trigger:', {
          id: notificationId,
          title,
          expectedAt: new Date(expectedTriggerTime).toLocaleString(),
          receivedAt: new Date(now).toLocaleString(),
          earlyBySeconds: Math.floor(timeUntilExpected / 1000),
        });
        return;
      } else {
        const latenessMs = now - expectedTriggerTime;
        const timingSummary = {
          id: notificationId,
          title,
          expectedAt: expectedTriggerTime,
          receivedAt: now,
          delayMs: Math.max(0, latenessMs),
        };

        // Notification fired close to the expected time
        console.log('✅ Notification triggered at expected time:', {
          id: notificationId,
          title,
          expectedAt: new Date(expectedTriggerTime).toLocaleString(),
          receivedAt: new Date(now).toLocaleString(),
          delayMs: Math.max(0, latenessMs),
        });

        if (latenessMs > 60000) {
          console.warn('⚠️  Notification fired later than expected', {
            ...timingSummary,
            delaySeconds: Math.round(latenessMs / 1000),
          });

          if (this.onNotificationDelayed) {
            this.onNotificationDelayed({
              ...timingSummary,
              data,
            });
          }
        }

        // Remove from tracking map
        this.scheduledNotifications.delete(notificationId);
      }
    } else {
      // This is a notification we don't know about (maybe from a previous session)
      // Check if notification date is close to current time
      const timeDifference = Math.abs(now - notificationDate);
      
      if (timeDifference > 10000) {
        console.log('⚠️  Ignoring notification with suspicious timing:', {
          title,
          notificationDate: new Date(notificationDate).toLocaleString(),
          now: new Date(now).toLocaleString(),
          differenceMs: timeDifference
        });
        return;
      }
    }
    
    // Log the received notification
  console.log(`✅ Notification triggered: ${title} - ${body}`, data);
    
    // Call the callback if set (NotificationContext will handle adding to in-app list)
    if (this.onNotificationReceived) {
      this.onNotificationReceived(notification);
    }
  }

  /**
   * Handle notification response (user interaction)
   */
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const responseId = `${response.notification.request.identifier}:${response.actionIdentifier ?? 'default'}`;

    if (this.processedResponseIds.has(responseId)) {
      console.log('🔁 Notification response already processed, skipping duplicate', responseId);
      return;
    }

    this.markResponseProcessed(responseId);

    const { data } = response.notification.request.content;

    console.log('User tapped notification with data:', data);

    // Handle navigation based on notification data
    if (data) {
      this.handleNotificationNavigation(data);
    }
  }

  /**
   * Handle navigation based on notification data
   */
  private static handleNotificationNavigation(data: any): void {
    const target = this.resolveNotificationTarget(data);

    if (!target) {
      console.log('ℹ️  No navigation target resolved for notification data:', data);
      return;
    }

    console.log('🧭 Navigating to notification target:', target);
    navigate(target.screen, target.params);
  }

  private static resolveNotificationTarget(data: any): { screen: string; params?: Record<string, unknown> } | null {
    if (!data) {
      return null;
    }

    const normalizedParams = (input: any) => this.normalizeParams(input);

    if (typeof data.targetScreen === 'string') {
      return {
        screen: data.targetScreen,
        params: normalizedParams(data.navigationParams ?? data.targetParams ?? data.params),
      };
    }

    if (data.type === 'reminder' || data.reminderId) {
      return {
        screen: this.resolveReminderTargetScreen(data),
        params: normalizedParams(data.navigationParams) ?? {
          reminderId: data.reminderId ?? data.id,
          reminderType: data.reminderType ?? data.categoryName ?? data.categoryId,
        },
      };
    }

    if (data.transactionId) {
      return {
        screen: 'TransactionsHistory',
        params: normalizedParams(data.navigationParams) ?? { transactionId: data.transactionId },
      };
    }

    if (data.goalId) {
      return {
        screen: 'SavingsGoals',
        params: normalizedParams(data.navigationParams) ?? { goalId: data.goalId },
      };
    }

    if (data.budgetId) {
      return {
        screen: 'BudgetPlanner',
        params: normalizedParams(data.navigationParams) ?? { budgetId: data.budgetId },
      };
    }

    return null;
  }

  private static resolveReminderTargetScreen(data: any): string {
    if (typeof data.reminderScreen === 'string') {
      return data.reminderScreen;
    }

    const lowered = (
      data.reminderType ??
      data.categoryName ??
      data.category ??
      data.categoryId ??
      ''
    )
      .toString()
      .toLowerCase();

    if (lowered.includes('bill') || lowered.includes('utility')) {
      return 'BillsReminder';
    }

    if (lowered.includes('budget')) {
      return 'BudgetPlanner';
    }

    if (lowered.includes('goal')) {
      return 'SavingsGoals';
    }

    return 'Reminders';
  }

  private static normalizeParams(raw: any): Record<string, unknown> | undefined {
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
      return undefined;
    }

    return raw as Record<string, unknown>;
  }

  private static markResponseProcessed(responseId: string) {
    this.processedResponseIds.add(responseId);

    if (this.processedResponseIds.size > 50) {
      const iterator = this.processedResponseIds.values();
      const first = iterator.next();
      if (!first.done) {
        this.processedResponseIds.delete(first.value);
      }
    }
  }

  private static async handleInitialNotificationResponse(): Promise<void> {
    try {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        this.handleNotificationResponse(lastResponse);
      }
    } catch (error) {
      console.error('Error handling initial notification response:', error);
    }
  }

  static navigateFromNotificationData(data: any): void {
    this.handleNotificationNavigation(data);
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput | number | Date,
    options: { channelId?: string; allowWhileIdle?: boolean } = {}
  ): Promise<string> {
    try {
      const permissions = await this.getPermissions();
      
      if (!permissions.granted) {
        throw new Error('Notification permissions not granted');
      }

      const channelId = options.channelId ?? 'default';
      const allowWhileIdle = options.allowWhileIdle ?? true;

      // Handle different trigger formats
      let finalTrigger: Notifications.NotificationTriggerInput | null = null;
      let expectedTriggerTime = Date.now();

      if (trigger instanceof Date) {
        const triggerTime = trigger.getTime();
        if (Number.isNaN(triggerTime)) {
          throw new Error('Invalid trigger date');
        }

        expectedTriggerTime = triggerTime;

        finalTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: Platform.OS === 'android' ? channelId : undefined,
          ...(Platform.OS === 'android' ? { allowWhileIdle } : {}),
        } as Notifications.DateTriggerInput & { allowWhileIdle?: boolean };
      } else if (typeof trigger === 'number') {
        if (!Number.isFinite(trigger) || trigger < 1) {
          console.error('❌ ERROR: Trigger seconds cannot be less than 1!', trigger);
          throw new Error(`Invalid trigger seconds: ${trigger}`);
        }

        expectedTriggerTime = Date.now() + trigger * 1000;

        if (Platform.OS === 'android') {
          finalTrigger = {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: trigger,
            repeats: false,
            channelId,
            allowWhileIdle,
          } as Notifications.TimeIntervalTriggerInput & { allowWhileIdle?: boolean };
        } else {
          finalTrigger = {
            seconds: trigger,
            repeats: false,
          } as Notifications.TimeIntervalTriggerInput;
        }
      } else if (trigger) {
        finalTrigger = {
          ...(trigger as Record<string, any>),
        } as Notifications.NotificationTriggerInput;

        const triggerAsAny = finalTrigger as Record<string, any>;

        if (Platform.OS === 'android' && !triggerAsAny.channelId) {
          triggerAsAny.channelId = channelId;
        }

        if (Platform.OS === 'android' && allowWhileIdle !== undefined) {
          triggerAsAny.allowWhileIdle = allowWhileIdle;
        }

        if (typeof triggerAsAny.seconds === 'number') {
          expectedTriggerTime = Date.now() + triggerAsAny.seconds * 1000;
        } else if (triggerAsAny.date) {
          expectedTriggerTime = new Date(triggerAsAny.date).getTime();
        }
      }

      if (!finalTrigger) {
        finalTrigger = null;
      }
      
      console.log('📅 Scheduling notification:', {
        title,
        body,
        trigger: finalTrigger,
        triggerType: finalTrigger ? (finalTrigger as any).type ?? 'custom' : 'immediate',
        triggerValue: (finalTrigger as any)?.seconds ?? (finalTrigger as any)?.date ?? null,
        willFireAt: new Date(expectedTriggerTime).toLocaleString()
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: finalTrigger,
      });

      // Track this notification's expected trigger time
      if (expectedTriggerTime > Date.now()) {
        this.scheduledNotifications.set(notificationId, expectedTriggerTime);

        const cleanupDelay = Math.max(0, expectedTriggerTime - Date.now()) + 30000;

        // Clean up after the notification should have fired (add 30 second buffer)
        setTimeout(() => {
          this.scheduledNotifications.delete(notificationId);
        }, cleanupDelay);
      }

      console.log('✅ Local notification scheduled successfully:', {
        id: notificationId,
        scheduledFor: expectedTriggerTime > Date.now()
          ? new Date(expectedTriggerTime).toLocaleTimeString()
          : 'immediate'
      });
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Set badge count (iOS)
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Get badge count (iOS)
   */
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Clear badge count (iOS)
   */
  static async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  /**
   * Cleanup notification service
   */
  static cleanup(): void {
    this.listeners.forEach(removeListener => removeListener());
    this.listeners = [];
  }

  /**
   * Test notification functionality
   */
  static async testNotification(): Promise<void> {
    try {
      await this.scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from FINEX',
        { test: true }
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService;