import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useDialog } from '../contexts/DialogContext';
// Services will be lazy loaded when needed
import AddReminderModal from '../components/AddReminderModal';
import ReminderCard from '../components/ReminderCard';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  dueDate: Date;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  isActive: boolean;
  isRecurring: boolean;
  autoCreateTransaction: boolean;
  transactionType?: 'INCOME' | 'EXPENSE';
  walletId?: string;
  categoryId?: string;
  notifyBefore?: number;
  enablePushNotification: boolean;
  enableEmailNotification: boolean;
  completedCount: number;
  lastCompleted?: Date;
  nextDue?: Date;
  snoozeUntil?: Date;
  wallet?: {
    id: string;
    name: string;
    type: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

const REMINDERS_STORAGE_KEY = 'fintracker::reminders::v1';

interface StoredReminder extends Omit<Reminder,
  'dueDate' | 'lastCompleted' | 'nextDue' | 'snoozeUntil'> {
  dueDate: string;
  lastCompleted?: string;
  nextDue?: string;
  snoozeUntil?: string;
}

const serializeReminderForStorage = (reminder: Reminder): StoredReminder => ({
  ...reminder,
  dueDate: reminder.dueDate.toISOString(),
  lastCompleted: reminder.lastCompleted ? reminder.lastCompleted.toISOString() : undefined,
  nextDue: reminder.nextDue ? reminder.nextDue.toISOString() : undefined,
  snoozeUntil: reminder.snoozeUntil ? reminder.snoozeUntil.toISOString() : undefined,
});

const deserializeReminderFromStorage = (raw: StoredReminder): Reminder => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  amount: typeof raw.amount === 'number' ? raw.amount : raw.amount ? Number(raw.amount) : undefined,
  dueDate: raw.dueDate ? new Date(raw.dueDate) : new Date(),
  frequency: raw.frequency ?? 'MONTHLY',
  status: raw.status ?? 'PENDING',
  isActive: raw.isActive ?? true,
  isRecurring: raw.isRecurring ?? false,
  autoCreateTransaction: raw.autoCreateTransaction ?? false,
  transactionType: raw.transactionType,
  walletId: raw.walletId,
  categoryId: raw.categoryId,
  notifyBefore: raw.notifyBefore,
  enablePushNotification: raw.enablePushNotification ?? true,
  enableEmailNotification: raw.enableEmailNotification ?? false,
  completedCount: typeof raw.completedCount === 'number' ? raw.completedCount : 0,
  lastCompleted: raw.lastCompleted ? new Date(raw.lastCompleted) : undefined,
  nextDue: raw.nextDue ? new Date(raw.nextDue) : undefined,
  snoozeUntil: raw.snoozeUntil ? new Date(raw.snoozeUntil) : undefined,
  wallet: raw.wallet,
  category: raw.category,
});

const determineReminderTargetScreen = (reminder: Reminder): string => {
  const categoryLabel = (
    reminder.category?.name ??
    reminder.categoryId ??
    reminder.transactionType ??
    ''
  ).toString().toLowerCase();

  if (categoryLabel.includes('bill') || categoryLabel.includes('utility')) {
    return 'BillsReminder';
  }

  if (categoryLabel.includes('budget')) {
    return 'BudgetPlanner';
  }

  if (categoryLabel.includes('goal')) {
    return 'SavingsGoals';
  }

  return 'Reminders';
};

const buildReminderNotificationPayload = (reminder: Reminder) => ({
  reminderId: reminder.id,
  type: 'reminder' as const,
  amount: reminder.amount,
  transactionType: reminder.transactionType,
  categoryId: reminder.categoryId,
  categoryName: reminder.category?.name,
  reminderType: reminder.category?.name ?? reminder.categoryId ?? undefined,
  targetScreen: determineReminderTargetScreen(reminder),
  navigationParams: {
    reminderId: reminder.id,
    reminderType: reminder.category?.name ?? undefined,
  },
});

export default function RemindersScreen() {
  const { isDark } = useTheme();
  const { addNotification, scheduleReminder, cancelReminder, state: notificationState, requestPermissions } = useNotification();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [scheduledNotifications, setScheduledNotifications] = useState<Map<string, string>>(new Map());
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);

  const styles = createStyles(isDark);
  const reminderIdFromParams = (route?.params as { reminderId?: string } | undefined)?.reminderId;

  useEffect(() => {
    if (!isFocused || !reminderIdFromParams) {
      return;
    }

    setPendingReminderId(reminderIdFromParams);

    const nav: any = navigation;
    if (nav && typeof nav.setParams === 'function') {
      try {
        nav.setParams({ reminderId: undefined });
      } catch (error) {
        console.error('Failed to clear reminder navigation params', error);
      }
    }
  }, [isFocused, reminderIdFromParams, navigation]);

  useEffect(() => {
    if (!pendingReminderId) {
      return;
    }

    const reminder = reminders.find(r => r.id === pendingReminderId);
    if (!reminder) {
      return;
    }

    setSelectedReminder(reminder);
    setShowAddModal(true);
    setPendingReminderId(null);
  }, [pendingReminderId, reminders]);

  const persistReminders = useCallback(async (nextReminders: Reminder[]) => {
    try {
      const payload = nextReminders.map(serializeReminderForStorage);
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Error saving reminders to storage:', error);
    }
  }, []);

  // Function to ensure notification permissions are granted
  const ensureNotificationPermissions = async (): Promise<boolean> => {
    if (!notificationState.permissions.granted) {
      if (notificationState.permissions.canAskAgain) {
        try {
          await requestPermissions();
          return notificationState.permissions.granted;
        } catch (error) {
          console.error('Error requesting notification permissions:', error);
          return false;
        }
      } else {
        // Show alert explaining they need to enable permissions in settings
        dialog.show({
          title: 'Notification Permission Required',
          message: 'To receive reminder notifications, please enable notifications for this app in your device settings.',
          icon: 'notifications-off',
          iconColor: '#F59E0B',
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              style: 'default',
              onPress: () => {
                // This would open device settings - implementation depends on platform
                console.log('Should open device settings');
              },
            },
          ],
        });
        return false;
      }
    }
    return true;
  };

  // Test function to verify notifications are working
  const handleTestNotification = async () => {
    try {
      const hasPermissions = await ensureNotificationPermissions();
      if (!hasPermissions) {
        dialog.warning('Permission Denied', 'Cannot send test notification without permissions');
        return;
      }

      // Test 1: Immediate notification
      console.log('🧪 Testing immediate notification...');
      const { NotificationService } = await import('../services/notificationService');
      await NotificationService.scheduleLocalNotification(
        'Immediate Test',
        'This should appear right now',
        { test: true },
        null // null = immediate
      );

      // Test 2: 30 second delay
      console.log('🧪 Testing 30-second delayed notification...');
      await NotificationService.scheduleLocalNotification(
        '30-Second Test',
        'This should appear in 30 seconds',
        { test: true },
        30 // 30 seconds
      );

      // Check how many notifications are scheduled
      const scheduledNotifs = await NotificationService.getScheduledNotifications();
      console.log('Currently scheduled notifications:', scheduledNotifs.length);

      addNotification({
        title: 'Tests Started',
        message: `Immediate + 10-second tests sent. Scheduled: ${scheduledNotifs.length}`,
        type: 'info',
        read: false,
      });

    } catch (error) {
      console.error('Error in test notifications:', error);
      dialog.error('Error', 'Failed to send test notifications');
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // Check for overdue reminders periodically
  useEffect(() => {
    const checkOverdueReminders = () => {
      const now = new Date();
      const updatedReminders = reminders.map(reminder => {
        if (
          reminder.status === 'PENDING' &&
          reminder.isActive &&
          new Date(reminder.dueDate) < now &&
          (!reminder.snoozeUntil || new Date(reminder.snoozeUntil) < now)
        ) {
          return { ...reminder, status: 'OVERDUE' as const };
        }
        return reminder;
      });

      // Check if any reminders became overdue
      const newlyOverdue = updatedReminders.filter((reminder, index) => 
        reminder.status === 'OVERDUE' && reminders[index]?.status === 'PENDING'
      );

      if (newlyOverdue.length > 0) {
        setReminders(updatedReminders);
        
        // Add notification for overdue reminders
        newlyOverdue.forEach(reminder => {
          addNotification({
            title: 'Reminder Overdue',
            message: `"${reminder.title}" is now overdue`,
            type: 'warning',
            read: false,
          });
        });
      }
    };

    // Check immediately and then every minute
    checkOverdueReminders();
    const interval = setInterval(checkOverdueReminders, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [reminders, addNotification]);

  const loadReminders = async () => {
    try {
      setIsLoading(true);
      let storedReminders: Reminder[] = [];

      try {
        const storedValue = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
        if (storedValue) {
          const parsed: unknown = JSON.parse(storedValue);
          if (Array.isArray(parsed)) {
            storedReminders = parsed
              .map(item => deserializeReminderFromStorage(item as StoredReminder))
              .filter(reminder => reminder && reminder.id);

            storedReminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
          }
        }
      } catch (storageError) {
        console.error('Error loading reminders from storage:', storageError);
      }

      setReminders(storedReminders);

      try {
        const { NotificationService } = await import('../services/notificationService');
        const scheduled = await NotificationService.getScheduledNotifications();
        const map = new Map<string, string>();

        scheduled.forEach(request => {
          const reminderId = request.content?.data?.reminderId;
          if (reminderId && typeof reminderId === 'string') {
            map.set(reminderId, request.identifier);
          }
        });

        setScheduledNotifications(map);
      } catch (scheduledError) {
        console.error('Error loading scheduled notifications:', scheduledError);
      }

      // Load default categories
      const defaultCategories: Category[] = [
        { id: '1', name: 'Bills & Utilities', icon: 'receipt-outline', color: '#EF4444' },
        { id: '2', name: 'Rent/Mortgage', icon: 'home-outline', color: '#3B82F6' },
        { id: '3', name: 'Insurance', icon: 'shield-outline', color: '#10B981' },
        { id: '4', name: 'Subscriptions', icon: 'card-outline', color: '#F59E0B' },
        { id: '5', name: 'Healthcare', icon: 'medical-outline', color: '#EC4899' },
        { id: '6', name: 'Income', icon: 'cash-outline', color: '#059669' },
        { id: '7', name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
      ];
      setCategories(defaultCategories);
    } catch (error) {
      console.error('Error loading reminders:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to load reminders',
        type: 'error',
        read: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleAddReminder = () => {
    setSelectedReminder(null);
    setShowAddModal(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowAddModal(true);
  };

  const handleCompleteReminder = async (reminder: Reminder) => {
    try {
    // Cancel existing notification
    const notificationId = scheduledNotifications.get(reminder.id);
      if (notificationId) {
        try {
          await cancelReminder(notificationId);
          setScheduledNotifications(prev => {
            const newMap = new Map(prev);
            newMap.delete(reminder.id);
            return newMap;
          });
        } catch (error) {
          console.error('Error cancelling notification:', error);
        }
      }

      // Update reminder status
      const updatedReminders = reminders.map(r =>
        r.id === reminder.id
          ? {
              ...r,
              status: 'COMPLETED' as const,
              lastCompleted: new Date(),
              completedCount: r.completedCount + 1,
              // If recurring, calculate next due date and reschedule notification
              ...(r.isRecurring && {
                status: 'PENDING' as const,
                dueDate: calculateNextDueDate(r.dueDate, r.frequency),
              }),
            }
          : r
      );

      // If it's recurring, schedule next notification
      if (reminder.isRecurring && reminder.enablePushNotification && reminder.isActive) {
        const nextDueDate = calculateNextDueDate(reminder.dueDate, reminder.frequency);
        const hasPermissions = await ensureNotificationPermissions();
        if (hasPermissions) {
          try {
            const notificationData = buildReminderNotificationPayload(reminder);

            const newNotificationId = await scheduleReminder(
              reminder.title,
              reminder.description || `Reminder: ${reminder.title}`,
              nextDueDate,
              notificationData
            );

            if (typeof newNotificationId === 'string') {
              const scheduledId: string = newNotificationId;
              setScheduledNotifications(prev => {
                const nextMap = new Map(prev);
                nextMap.set(reminder.id, scheduledId);
                return nextMap;
              });
            }
          } catch (error) {
            console.error('Error scheduling next recurring notification:', error);
          }
        }
      }

      setReminders(updatedReminders);
      await persistReminders(updatedReminders);

      // If it's set to auto-create transaction, show confirmation
      if (reminder.autoCreateTransaction && reminder.amount && reminder.transactionType) {
        dialog.confirm({
          title: 'Create Transaction?',
          message: `Would you like to create a ${reminder.transactionType.toLowerCase()} transaction for $${reminder.amount}?`,
          confirmText: 'Yes',
          cancelText: 'No',
          onConfirm: () => {
            void handleCreateTransaction(reminder);
          },
        });
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to complete reminder',
        type: 'error',
        read: false,
      });
    }
  };

  const handleSnoozeReminder = async (reminder: Reminder, minutes: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

      const updatedReminders = reminders.map(r =>
        r.id === reminder.id
          ? { ...r, snoozeUntil }
          : r
      );

      setReminders(updatedReminders);
      await persistReminders(updatedReminders);

    } catch (error) {
      console.error('Error snoozing reminder:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to snooze reminder',
        type: 'error',
        read: false,
      });
    }
  };

  const handleDeleteReminder = async (reminder: Reminder) => {
    dialog.confirm({
      title: 'Delete Reminder',
      message: `Are you sure you want to delete "${reminder.title}"?`,
      destructive: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        void (async () => {
          try {
            // Cancel notification if exists
            const notificationId = scheduledNotifications.get(reminder.id);
            if (notificationId) {
              try {
                await cancelReminder(notificationId);
                setScheduledNotifications(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(reminder.id);
                  return newMap;
                });
              } catch (error) {
                console.error('Error cancelling notification:', error);
              }
            }

            const updatedReminders = reminders.filter(r => r.id !== reminder.id);
            setReminders(updatedReminders);
            await persistReminders(updatedReminders);

          } catch (error) {
            console.error('Error deleting reminder:', error);
            addNotification({
              title: 'Error',
              message: 'Failed to delete reminder',
              type: 'error',
              read: false,
            });
          }
        })();
      },
    });
  };

  const handleCreateTransaction = async (reminder: Reminder) => {
    try {
      if (!reminder.amount || !reminder.transactionType || !reminder.walletId) {
        throw new Error('Missing transaction data');
      }

      // Create transaction using hybrid data service
      const { hybridDataService } = await import('../services/hybridDataService');
      await hybridDataService.addTransaction({
        amount: reminder.amount,
        description: `Auto: ${reminder.title}`,
        type: reminder.transactionType,
        date: new Date().toISOString(),
        walletId: reminder.walletId,
        categoryId: reminder.categoryId || '',
      });

      addNotification({
        title: 'Transaction Created',
        message: `${reminder.transactionType.toLowerCase()} of $${reminder.amount} created for "${reminder.title}"`,
        type: 'success',
        read: false,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to create transaction',
        type: 'error',
        read: false,
      });
    }
  };

  const calculateNextDueDate = (currentDate: Date, frequency: string): Date => {
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
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  };

  // New function to handle creating reminders with notification scheduling
  const handleCreateReminder = async (reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const newReminder: Reminder = {
      id: Date.now().toString(),
      ...reminderData,
      status: 'PENDING',
      completedCount: 0,
    };

    // Schedule notification if enabled and active
    let notificationId: string | null = null;
    if (newReminder.enablePushNotification && newReminder.isActive) {
      const hasPermissions = await ensureNotificationPermissions();
      if (hasPermissions) {
        try {
          const notificationData = buildReminderNotificationPayload(newReminder);

          notificationId = await scheduleReminder(
            newReminder.title,
            newReminder.description || `Reminder: ${newReminder.title}`,
            newReminder.dueDate,
            notificationData
          );

          if (typeof notificationId === 'string') {
            const scheduledId: string = notificationId;
            setScheduledNotifications(prev => {
              const nextMap = new Map(prev);
              nextMap.set(newReminder.id, scheduledId);
              return nextMap;
            });
          }
        } catch (error) {
          console.error('Error scheduling notification for reminder:', error);
          // Don't fail the reminder creation if notification fails
          addNotification({
            title: 'Notification Scheduling Failed',
            message: 'Reminder created but notification could not be scheduled',
            type: 'warning',
            read: false,
          });
        }
      }
    }

    const nextReminders = [newReminder, ...reminders];
    setReminders(nextReminders);
    await persistReminders(nextReminders);
  };

  // New function to handle updating reminders with notification rescheduling
  const handleUpdateReminder = async (reminderId: string, reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const existingReminder = reminders.find(r => r.id === reminderId);
    if (!existingReminder) return;

    // Cancel existing notification if it exists
    const existingNotificationId = scheduledNotifications.get(reminderId);
    if (existingNotificationId) {
      try {
        await cancelReminder(existingNotificationId);
        setScheduledNotifications(prev => {
          const newMap = new Map(prev);
          newMap.delete(reminderId);
          return newMap;
        });
      } catch (error) {
        console.error('Error cancelling existing notification:', error);
      }
    }

    const updatedReminder = { ...existingReminder, ...reminderData };

    // Schedule new notification if enabled and active
    let newNotificationId: string | null = null;
    if (updatedReminder.enablePushNotification && updatedReminder.isActive && updatedReminder.status === 'PENDING') {
      const hasPermissions = await ensureNotificationPermissions();
      if (hasPermissions) {
        try {
          const notificationData = buildReminderNotificationPayload(updatedReminder);

          newNotificationId = await scheduleReminder(
            updatedReminder.title,
            updatedReminder.description || `Reminder: ${updatedReminder.title}`,
            updatedReminder.dueDate,
            notificationData
          );

          if (typeof newNotificationId === 'string') {
            const scheduledId: string = newNotificationId;
            setScheduledNotifications(prev => {
              const nextMap = new Map(prev);
              nextMap.set(reminderId, scheduledId);
              return nextMap;
            });
          }
        } catch (error) {
          console.error('Error scheduling notification for updated reminder:', error);
          // Don't fail the reminder update if notification fails
          addNotification({
            title: 'Notification Scheduling Failed',
            message: 'Reminder updated but notification could not be scheduled',
            type: 'warning',
            read: false,
          });
        }
      }
    }

    const updatedReminders = reminders.map(r =>
      r.id === reminderId ? updatedReminder : r
    );
    setReminders(updatedReminders);
    await persistReminders(updatedReminders);
    
  };

  const getFilteredReminders = (): Reminder[] => {
    switch (filterStatus) {
      case 'active':
        return reminders.filter(r => r.isActive && r.status === 'PENDING');
      case 'overdue':
        return reminders.filter(r => r.status === 'OVERDUE');
      case 'completed':
        return reminders.filter(r => r.status === 'COMPLETED');
      default:
        return reminders;
    }
  };

  const getStatusCounts = () => {
    return {
      all: reminders.length,
      active: reminders.filter(r => r.isActive && r.status === 'PENDING').length,
      overdue: reminders.filter(r => r.status === 'OVERDUE').length,
      completed: reminders.filter(r => r.status === 'COMPLETED').length,
    };
  };

  const statusCounts = getStatusCounts();
  const filteredReminders = getFilteredReminders();

  const renderFilterButton = (
    status: typeof filterStatus,
    label: string,
    count: number,
    color: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.filterButtonActive,
        { borderColor: color },
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterStatus === status && styles.filterButtonTextActive,
          { color: filterStatus === status ? color : styles.filterButtonText.color },
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderReminder = ({ item }: { item: Reminder }) => (
    <ReminderCard
      reminder={item}
      onEdit={handleEditReminder}
      onComplete={handleCompleteReminder}
      onSnooze={handleSnoozeReminder}
      onDelete={handleDeleteReminder}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      
      {/* Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reminders</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButtonHeader} onPress={handleAddReminder}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content Container with rounded top */}
      <View style={[styles.contentContainer, { backgroundColor: isDark ? '#1F2937' : '#F8F9FA' }]}>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', statusCounts.all, '#8B5CF6')}
        {renderFilterButton('active', 'Active', statusCounts.active, '#10B981')}
        {renderFilterButton('overdue', 'Overdue', statusCounts.overdue, '#EF4444')}
        {renderFilterButton('completed', 'Completed', statusCounts.completed, '#6B7280')}
      </View>

      {/* Reminders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : filteredReminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alarm-outline" size={64} color={styles.emptyIcon.color} />
          <Text style={styles.emptyTitle}>
            {filterStatus === 'all' ? 'No Reminders' : `No ${filterStatus} reminders`}
          </Text>
          <Text style={styles.emptyDescription}>
            {filterStatus === 'all'
              ? 'Create your first reminder to get started'
              : `You don't have any ${filterStatus} reminders`}
          </Text>
          {filterStatus === 'all' && (
            <TouchableOpacity style={styles.createButton} onPress={handleAddReminder}>
              <Text style={styles.createButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredReminders}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Reminder Modal */}
      <AddReminderModal
        visible={showAddModal}
        reminder={selectedReminder ?? undefined}
        categories={categories}
        onClose={() => {
          setShowAddModal(false);
          setSelectedReminder(null);
        }}
        onSave={async (reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
          try {
            if (selectedReminder) {
              // Edit existing reminder
              await handleUpdateReminder(selectedReminder.id, reminderData);
            } else {
              // Add new reminder
              await handleCreateReminder(reminderData);
            }
            setShowAddModal(false);
            setSelectedReminder(null);
          } catch (error) {
            console.error('Error saving reminder:', error);
            addNotification({
              title: 'Error',
              message: 'Failed to save reminder',
              type: 'error',
              read: false,
            });
          }
        }}
      />
      </View>
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#F8F9FA',
    },
    darkHeader: {
      backgroundColor: '#1C1C1E',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    testButton: {
      backgroundColor: '#F59E0B',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonHeader: {
      backgroundColor: '#3B82F6',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -1,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      gap: 8,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#6B7280' : '#D1D5DB',
      backgroundColor: isDark ? '#4B5563' : '#F9FAFB',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    filterButtonTextActive: {
      fontWeight: '600',
    },
    listContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIcon: {
      color: isDark ? '#6B7280' : '#9CA3AF',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: '#3B82F6',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}