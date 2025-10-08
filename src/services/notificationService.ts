import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });

    // Store listeners for cleanup
    this.listeners.push(
      () => notificationListener.remove(),
      () => responseListener.remove()
    );
  }

  /**
   * Handle notification received while app is running
   */
  private static handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    
    // You can update app state, show in-app notifications, etc.
    console.log(`Received: ${title} - ${body}`, data);
    
    // Emit custom event for app components to listen to
    // This could be implemented with EventEmitter or Context
  }

  /**
   * Handle notification response (user interaction)
   */
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
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
    // This would integrate with your navigation system
    console.log('Handling navigation for notification data:', data);
    
    // Example navigation logic:
    if (data.reminderId) {
      // Navigate to reminder details
      console.log('Navigate to reminder:', data.reminderId);
    } else if (data.transactionId) {
      // Navigate to transaction details
      console.log('Navigate to transaction:', data.transactionId);
    } else if (data.goalId) {
      // Navigate to goal details
      console.log('Navigate to goal:', data.goalId);
    } else if (data.categoryId) {
      // Navigate to category insights
      console.log('Navigate to category:', data.categoryId);
    }
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const permissions = await this.getPermissions();
      
      if (!permissions.granted) {
        throw new Error('Notification permissions not granted');
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: trigger || null, // null = immediate
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
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
        'This is a test notification from FinTracker',
        { test: true }
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService;