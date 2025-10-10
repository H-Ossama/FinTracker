import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../services/notificationService';
import { hybridDataService } from '../services/hybridDataService';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  data?: any;
}

export interface NotificationState {
  pushToken: string | null;
  permissions: {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  };
  inAppNotifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: {
    enablePushNotifications: boolean;
    enableReminders: boolean;
    enableBudgetAlerts: boolean;
    enableGoalNotifications: boolean;
    enableSpendingAlerts: boolean;
    enableTips: boolean;
    enableSyncReminders: boolean;
    enableQuietHours: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    spendingAlertThreshold: number;
  };
}

type NotificationAction =
  | { type: 'SET_PUSH_TOKEN'; payload: string | null }
  | { type: 'SET_PERMISSIONS'; payload: NotificationState['permissions'] }
  | { type: 'ADD_NOTIFICATION'; payload: InAppNotification }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_AS_UNREAD'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_NOTIFICATIONS'; payload: InAppNotification[] }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: Partial<NotificationState['preferences']> };

const initialState: NotificationState = {
  pushToken: null,
  permissions: {
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  },
  inAppNotifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: {
    enablePushNotifications: true,
    enableReminders: true,
    enableBudgetAlerts: true,
    enableGoalNotifications: true,
    enableSpendingAlerts: true,
    enableTips: true,
    enableSyncReminders: true,
    enableQuietHours: false,
    spendingAlertThreshold: 100,
  },
};

const NOTIFICATION_STORAGE_KEY = 'notification_state';

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_PUSH_TOKEN':
      return { ...state, pushToken: action.payload };
    
    case 'SET_PERMISSIONS':
      return { ...state, permissions: action.payload };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        inAppNotifications: [action.payload, ...state.inAppNotifications],
        unreadCount: state.unreadCount + (action.payload.read ? 0 : 1),
      };
    
    case 'MARK_AS_READ': {
      const targetNotification = state.inAppNotifications.find(n => n.id === action.payload);
      const wasUnread = targetNotification && !targetNotification.read;
      
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }
    
    case 'MARK_AS_UNREAD': {
      const targetNotification = state.inAppNotifications.find(n => n.id === action.payload);
      const wasRead = targetNotification && targetNotification.read;
      
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: false }
            : notification
        ),
        unreadCount: wasRead ? state.unreadCount + 1 : state.unreadCount,
      };
    }
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.map(notification => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      };
    
    case 'REMOVE_NOTIFICATION':
      const removedNotification = state.inAppNotifications.find(n => n.id === action.payload);
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.filter(n => n.id !== action.payload),
        unreadCount: state.unreadCount - (removedNotification && !removedNotification.read ? 1 : 0),
      };
    
    case 'SET_NOTIFICATIONS':
      const unread = action.payload.filter(n => !n.read).length;
      return {
        ...state,
        inAppNotifications: action.payload,
        unreadCount: unread,
      };
    
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    
    default:
      return state;
  }
}

interface NotificationContextType {
  state: NotificationState;
  // Push notification methods
  initializeNotifications: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  
  // In-app notification methods
  addNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<NotificationState['preferences']>) => Promise<void>;
  loadPreferences: () => Promise<void>;
  
  // Backend integration
  syncNotifications: () => Promise<void>;
  
  // Local notifications
  scheduleReminder: (title: string, body: string, date: Date, data?: any) => Promise<string>;
  cancelReminder: (id: string) => Promise<void>;
  
  // Test functionality
  testNotification: () => Promise<void>;
  
  // Debug functionality
  clearNotificationStorage: () => Promise<void>;
  debugNotificationState: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notifications on app start - load saved state first
  useEffect(() => {
    const initializeApp = async () => {
      await loadStateFromStorage();
      await initializeNotifications();
      await loadPreferences();
      setIsInitialized(true);
    };
    initializeApp();
  }, []);

  // Save state to AsyncStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveStateToStorage(state);
    }
  }, [state.inAppNotifications, state.unreadCount, isInitialized]);

  const saveStateToStorage = async (currentState: NotificationState) => {
    try {
      const stateToSave = {
        inAppNotifications: currentState.inAppNotifications.map(notification => ({
          ...notification,
          timestamp: notification.timestamp.toISOString(), // Convert Date to string for storage
        })),
        unreadCount: currentState.unreadCount,
        lastSaved: new Date().toISOString(), // Add timestamp for debugging
      };
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('Notification state saved:', { count: stateToSave.inAppNotifications.length, unread: stateToSave.unreadCount });
    } catch (error) {
      console.error('Error saving notification state:', error);
    }
  };

  const loadStateFromStorage = async () => {
    try {
      const savedState = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (savedState) {
        const { inAppNotifications, unreadCount, lastSaved } = JSON.parse(savedState);
        console.log('Loading notification state:', { count: inAppNotifications.length, unread: unreadCount, lastSaved });
        
        // Convert timestamp strings back to Date objects and ensure read status is preserved
        const notifications = inAppNotifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          read: n.read || false, // Ensure read property exists
        }));
        
        // Calculate actual unread count to ensure consistency
        const actualUnreadCount = notifications.filter(n => !n.read).length;
        
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
        
        console.log('Notification state loaded successfully:', { 
          totalNotifications: notifications.length, 
          unreadCount: actualUnreadCount,
          readNotifications: notifications.filter(n => n.read).length
        });
      } else {
        console.log('No saved notification state found');
      }
    } catch (error) {
      console.error('Error loading notification state:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Initialize notification service
      await NotificationService.initialize();
      
      // Get current permissions
      const permissions = await NotificationService.getPermissions();
      dispatch({ type: 'SET_PERMISSIONS', payload: permissions });
      
      // Get push token if permissions granted
      if (permissions.granted) {
        const token = NotificationService.getPushToken();
        dispatch({ type: 'SET_PUSH_TOKEN', payload: token });
        
        if (token) {
          await registerPushTokenWithBackend(token);
        }
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await NotificationService.requestPermissions();
      dispatch({ type: 'SET_PERMISSIONS', payload: permissions });
      
      if (permissions.granted) {
        await registerPushToken();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const registerPushToken = async () => {
    try {
      const token = await NotificationService.registerForPushNotifications();
      dispatch({ type: 'SET_PUSH_TOKEN', payload: token });
      
      if (token) {
        await registerPushTokenWithBackend(token);
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  const registerPushTokenWithBackend = async (token: string) => {
    try {
      // Register token with backend via hybrid service
      await hybridDataService.registerPushToken({
        token,
        deviceId: 'device-id', // You might want to get actual device ID
        platform: 'mobile',
        appVersion: '2.0.1',
      });
    } catch (error) {
      console.error('Error registering push token with backend:', error);
    }
  };

  const addNotification = (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    const fullNotification: InAppNotification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  };

  const markAsRead = (id: string) => {
    console.log('Marking notification as read:', id);
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAsUnread = (id: string) => {
    console.log('Marking notification as unread:', id);
    dispatch({ type: 'MARK_AS_UNREAD', payload: id });
  };

  const markAllAsRead = () => {
    console.log('Marking all notifications as read');
    dispatch({ type: 'MARK_ALL_AS_READ' });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const updatePreferences = async (preferences: Partial<NotificationState['preferences']>) => {
    try {
      dispatch({ type: 'SET_PREFERENCES', payload: preferences });
      
      // Save to backend if online
      try {
        await hybridDataService.updateNotificationPreferences(preferences);
      } catch (error) {
        console.log('Could not sync preferences to backend:', error);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      // Load preferences from backend if available
      const preferences = await hybridDataService.getNotificationPreferences();
      if (preferences) {
        dispatch({ type: 'SET_PREFERENCES', payload: preferences });
      }
    } catch (error) {
      console.log('Using default notification preferences');
    }
  };

  const syncNotifications = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Sync notifications from backend
      const notifications = await hybridDataService.getNotifications();
      
      // Convert backend notifications to in-app format
      const inAppNotifications: InAppNotification[] = notifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: 'info' as const,
        timestamp: new Date(n.createdAt),
        read: n.isRead,
        data: n.data,
      }));
      
      dispatch({ type: 'SET_NOTIFICATIONS', payload: inAppNotifications });
    } catch (error) {
      console.error('Error syncing notifications:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const scheduleReminder = async (title: string, body: string, date: Date, data?: any): Promise<string> => {
    try {
      const notificationId = await NotificationService.scheduleLocalNotification(
        title,
        body,
        data,
        { date } as any // Using any to bypass type checking for now
      );
      return notificationId;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      throw error;
    }
  };

  const cancelReminder = async (id: string) => {
    try {
      await NotificationService.cancelNotification(id);
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  const testNotification = async () => {
    try {
      await NotificationService.testNotification();
      addNotification({
        title: 'Test Notification',
        message: 'This is a test notification sent locally',
        type: 'info',
        read: false,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const clearNotificationStorage = async () => {
    try {
      await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      console.log('Notification storage cleared');
    } catch (error) {
      console.error('Error clearing notification storage:', error);
    }
  };

  const debugNotificationState = () => {
    console.log('=== NOTIFICATION DEBUG STATE ===');
    console.log('Total notifications:', state.inAppNotifications.length);
    console.log('Unread count:', state.unreadCount);
    console.log('Read notifications:', state.inAppNotifications.filter(n => n.read).length);
    console.log('Unread notifications:', state.inAppNotifications.filter(n => !n.read).length);
    console.log('Notification details:', state.inAppNotifications.map(n => ({
      id: n.id,
      title: n.title,
      read: n.read,
      timestamp: n.timestamp
    })));
    console.log('================================');
  };

  const value: NotificationContextType = {
    state,
    initializeNotifications,
    requestPermissions,
    registerPushToken,
    addNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    removeNotification,
    updatePreferences,
    loadPreferences,
    syncNotifications,
    scheduleReminder,
    cancelReminder,
    testNotification,
    clearNotificationStorage,
    debugNotificationState,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}