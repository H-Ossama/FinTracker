import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'transaction' | 'budget' | 'goal' | 'system' | 'reminder';
  actionData?: {
    type: 'open_reminder' | 'open_transaction' | 'open_budget' | 'open_goal';
    id: string;
  };
}

interface NotificationPreferences {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  categories: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    reminders: boolean;
    alerts: boolean;
  };
  frequency: {
    dailyDigest: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
  testNotifications: boolean;
}

export default function NotificationCenterScreen() {
  const { isDark } = useTheme();
  const { addNotification } = useNotification();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enablePushNotifications: true,
    enableEmailNotifications: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
    categories: {
      transactions: true,
      budgets: true,
      goals: true,
      reminders: true,
      alerts: true,
    },
    frequency: {
      dailyDigest: false,
      weeklyReport: true,
      monthlyReport: true,
    },
    testNotifications: true,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [filterCategory, setFilterCategory] = useState<'all' | NotificationItem['category']>('all');
  const [testNotificationText, setTestNotificationText] = useState('Test notification message');

  const styles = createStyles(isDark);

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would load from backend
      const mockNotifications: NotificationItem[] = [
        {
          id: '1',
          title: 'Reminder: Monthly Budget Review',
          message: 'Time to review your monthly spending and adjust budgets',
          type: 'reminder',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isRead: false,
          priority: 'high',
          category: 'reminder',
          actionData: { type: 'open_budget', id: 'budget_1' },
        },
        {
          id: '2',
          title: 'Smart Alert: High Spending',
          message: 'You\'ve spent 80% of your dining budget this month',
          type: 'warning',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          isRead: true,
          priority: 'medium',
          category: 'budget',
          actionData: { type: 'open_transaction', id: 'category_dining' },
        },
        {
          id: '3',
          title: 'Goal Achieved!',
          message: 'Congratulations! You\'ve reached your emergency fund goal',
          type: 'success',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          isRead: true,
          priority: 'medium',
          category: 'goal',
          actionData: { type: 'open_goal', id: 'goal_emergency' },
        },
        {
          id: '4',
          title: 'New Transaction Added',
          message: 'Groceries purchase of $45.67 added to Checking Account',
          type: 'info',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          isRead: true,
          priority: 'low',
          category: 'transaction',
          actionData: { type: 'open_transaction', id: 'trans_123' },
        },
        {
          id: '5',
          title: 'Weekly Report Ready',
          message: 'Your weekly financial summary is now available',
          type: 'info',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          isRead: false,
          priority: 'low',
          category: 'system',
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to load notifications',
        type: 'error',
        read: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      // In a real app, this would load from backend or local storage
      // For now, we'll use the default preferences set in state
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev =>
              prev.filter(notification => notification.id !== notificationId)
            );
          },
        },
      ]
    );
  };

  const clearAllNotificationsLocal = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setNotifications([]);
          },
        },
      ]
    );
  };

  const sendTestNotification = async () => {
    try {
      const testNotification = {
        title: 'Test Notification',
        message: testNotificationText || 'This is a test notification',
        type: 'info' as const,
        priority: 'medium' as const,
        category: 'system' as const,
      };

      // Send push notification
      await notificationService.scheduleLocalNotification(
        testNotification.title,
        testNotification.message,
        { type: 'test' }
      );

      // Add to in-app notifications
      addNotification({
        title: testNotification.title,
        message: testNotification.message,
        type: testNotification.type,
        read: false,
      });

      // Add to notification list
      const newNotification: NotificationItem = {
        id: Date.now().toString(),
        ...testNotification,
        timestamp: new Date(),
        isRead: false,
      };

      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Error sending test notification:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to send test notification',
        type: 'error',
        read: false,
      });
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateCategoryPreference = (
    category: keyof NotificationPreferences['categories'],
    enabled: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: enabled,
      },
    }));
  };

  const updateFrequencyPreference = (
    frequency: keyof NotificationPreferences['frequency'],
    enabled: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      frequency: {
        ...prev.frequency,
        [frequency]: enabled,
      },
    }));
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'reminder':
        return 'time-outline';
      case 'alert':
        return 'warning-outline';
      case 'info':
        return 'information-circle-outline';
      case 'success':
        return 'checkmark-circle-outline';
      case 'warning':
        return 'alert-circle-outline';
      case 'error':
        return 'close-circle-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: NotificationItem['type']): string => {
    switch (type) {
      case 'reminder':
        return '#3B82F6';
      case 'alert':
        return '#F59E0B';
      case 'info':
        return '#6B7280';
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: NotificationItem['priority']): string => {
    switch (priority) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#CA8A04';
      case 'low':
        return '#65A30D';
      default:
        return '#6B7280';
    }
  };

  const filteredNotifications = notifications.filter(notification =>
    filterCategory === 'all' || notification.category === filterCategory
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          <View
            style={[
              styles.notificationIcon,
              { backgroundColor: getNotificationColor(item.type) + '20' }
            ]}
          >
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={20}
              color={getNotificationColor(item.type)}
            />
          </View>
          {item.priority === 'high' || item.priority === 'urgent' ? (
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(item.priority) }
              ]}
            />
          ) : null}
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>
              {formatTimestamp(item.timestamp)}
            </Text>
            <View style={styles.notificationCategory}>
              <Text style={styles.categoryText}>
                {item.category}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.notificationActions}>
          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteNotification(item.id)}
          >
            <Ionicons name="close" size={18} color={styles.deleteIcon.color} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      {/* Header */}
      <View style={styles.notificationsHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </Text>
          
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={markAllAsRead}
              >
                <Text style={styles.headerButtonText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={clearAllNotificationsLocal}
            >
              <Text style={[styles.headerButtonText, { color: '#EF4444' }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'all', label: 'All' },
              { key: 'transaction', label: 'Transactions' },
              { key: 'budget', label: 'Budgets' },
              { key: 'goal', label: 'Goals' },
              { key: 'reminder', label: 'Reminders' },
              { key: 'system', label: 'System' },
            ]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterCategory === item.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilterCategory(item.key as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterCategory === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-outline"
              size={64}
              color={styles.emptyIcon.color}
            />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyMessage}>
              {filterCategory === 'all'
                ? 'You\'re all caught up!'
                : `No ${filterCategory} notifications`}
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderPreferencesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>

      <View style={styles.preferencesContainer}>
        {/* General Settings */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>General</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Push Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.enablePushNotifications}
              onValueChange={(value) => updatePreference('enablePushNotifications', value)}
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor={preferences.enablePushNotifications ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Email Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Receive notifications via email
              </Text>
            </View>
            <Switch
              value={preferences.enableEmailNotifications}
              onValueChange={(value) => updatePreference('enableEmailNotifications', value)}
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor={preferences.enableEmailNotifications ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Categories</Text>
          
          {Object.entries(preferences.categories).map(([category, enabled]) => (
            <View key={category} style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(value) => updateCategoryPreference(category as any, value)}
                trackColor={{ false: '#767577', true: '#10B981' }}
                thumbColor={enabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Frequency */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Reports</Text>
          
          {Object.entries(preferences.frequency).map(([frequency, enabled]) => (
            <View key={frequency} style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>
                  {frequency === 'dailyDigest' ? 'Daily Digest' :
                   frequency === 'weeklyReport' ? 'Weekly Report' :
                   frequency === 'monthlyReport' ? 'Monthly Report' : frequency}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(value) => updateFrequencyPreference(frequency as any, value)}
                trackColor={{ false: '#767577', true: '#10B981' }}
                thumbColor={enabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Test Notifications */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Testing</Text>
          
          <View style={styles.testContainer}>
            <TextInput
              style={styles.testInput}
              value={testNotificationText}
              onChangeText={setTestNotificationText}
              placeholder="Enter test notification message"
              placeholderTextColor={styles.placeholder.color}
              multiline
            />
            <TouchableOpacity
              style={styles.testButton}
              onPress={sendTestNotification}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Send Test</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'notifications' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={activeTab === 'notifications' ? '#10B981' : styles.tabIcon.color}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'notifications' && styles.tabButtonTextActive,
            ]}
          >
            Notifications
          </Text>
          {unreadCount > 0 && activeTab !== 'notifications' && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'preferences' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('preferences')}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={activeTab === 'preferences' ? '#10B981' : styles.tabIcon.color}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'preferences' && styles.tabButtonTextActive,
            ]}
          >
            Preferences
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'notifications' ? renderNotificationsTab() : renderPreferencesTab()}
    </SafeAreaView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
      position: 'relative',
    },
    tabButtonActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#10B981',
    },
    tabIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    tabButtonTextActive: {
      color: '#10B981',
    },
    unreadBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    unreadBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    tabContent: {
      flex: 1,
    },
    notificationsHeader: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#10B981',
    },
    filterContainer: {
      marginTop: 8,
    },
    filterList: {
      paddingVertical: 4,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      borderRadius: 16,
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
    },
    filterButtonActive: {
      backgroundColor: '#10B981',
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
    },
    notificationsList: {
      padding: 20,
    },
    notificationItem: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    unreadNotification: {
      borderLeftWidth: 4,
      borderLeftColor: '#10B981',
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    notificationIconContainer: {
      position: 'relative',
      marginRight: 12,
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    priorityDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? '#374151' : '#FFFFFF',
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 4,
    },
    notificationMessage: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#6B7280',
      lineHeight: 20,
      marginBottom: 8,
    },
    notificationMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    notificationTime: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    notificationCategory: {
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
      textTransform: 'uppercase',
    },
    notificationActions: {
      alignItems: 'center',
      gap: 8,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    deleteButton: {
      padding: 4,
    },
    deleteIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
    },
    preferencesContainer: {
      padding: 20,
    },
    preferenceSection: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    preferenceSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 16,
    },
    preferenceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#F3F4F6',
    },
    preferenceInfo: {
      flex: 1,
      marginRight: 16,
    },
    preferenceLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 2,
    },
    preferenceDescription: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    testContainer: {
      gap: 12,
    },
    testInput: {
      backgroundColor: isDark ? '#4B5563' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#6B7280' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#1F2937',
      minHeight: 80,
      textAlignVertical: 'top',
    },
    placeholder: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B981',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 8,
    },
    testButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}