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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
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

export default function NotificationCenterScreen({ navigation }: { navigation: any }) {
  const { isDark } = useTheme();
  const { t } = useLocalization();
  const { state: notificationState, addNotification, markAsRead, markAsUnread, markAllAsRead, removeNotification, debugNotificationState } = useNotification();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  const styles = createStyles(isDark);

  // Use actual notifications from context
  const notifications = notificationState.inAppNotifications;
  const unreadCount = notificationState.unreadCount;

  useEffect(() => {
    loadPreferences();
  }, []);

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
    // Refresh notifications from context
    setRefreshing(false);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    handleMarkAsRead(notification.id);

    if (notification.data) {
      notificationService.navigateFromNotificationData(notification.data);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      t('delete_notification'),
      t('delete_notification_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            removeNotification(notificationId);
          },
        },
      ]
    );
  };

  const clearAllNotificationsLocal = () => {
    Alert.alert(
      t('clear_all_notifications'),
      t('clear_all_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clear_all'),
          style: 'destructive',
          onPress: () => {
            // Clear all notifications using context
            notifications.forEach(notification => {
              removeNotification(notification.id);
            });
          },
        },
      ]
    );
  };

  const sendTestNotification = async () => {
    try {
      const testNotification = {
        title: 'Testing',
        message: 'This is a test notification',
        type: 'info' as const,
        read: false,
      };

      // Send push notification
      await notificationService.scheduleLocalNotification(
        testNotification.title,
        testNotification.message,
        { type: 'test' }
      );

      // Add to in-app notifications using context
      addNotification(testNotification);
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

  const getNotificationIcon = (type: typeof notifications[0]['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
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

  const getNotificationColor = (type: typeof notifications[0]['type']): string => {
    switch (type) {
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

  const filteredNotifications = notifications.filter(notification =>
    filterCategory === 'all' || notification.type === filterCategory
  );

  const renderNotificationItem = ({ item }: { item: typeof notifications[0] }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
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
                {item.type}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.notificationActions}>
          {!item.read && (
            <View style={styles.unreadDot} />
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => item.read ? markAsUnread(item.id) : markAsRead(item.id)}
          >
            <Ionicons
              name={item.read ? 'mail-outline' : 'mail-open-outline'}
              size={16}
              color={styles.actionIcon.color}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => removeNotification(item.id)}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={styles.actionIcon.color}
            />
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionButton, styles.markAllButton]}
              onPress={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color={unreadCount === 0 ? (isDark ? '#6B7280' : '#9CA3AF') : '#10B981'}
              />
              <Text
                style={[
                  styles.headerActionText,
                  { color: unreadCount === 0 ? (isDark ? '#6B7280' : '#9CA3AF') : '#10B981' },
                ]}
              >
                {t('mark_all_read')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerActionButton, styles.clearAllButton]}
              onPress={clearAllNotificationsLocal}
              disabled={filteredNotifications.length === 0}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={filteredNotifications.length === 0 ? (isDark ? '#6B7280' : '#9CA3AF') : '#EF4444'}
              />
              <Text
                style={[
                  styles.headerActionText,
                  { color: filteredNotifications.length === 0 ? (isDark ? '#6B7280' : '#9CA3AF') : '#EF4444' },
                ]}
              >
                {t('clear_all')}
              </Text>
            </TouchableOpacity>
            
            {/* Debug button (development only) */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.headerActionButton]}
                onPress={debugNotificationState}
              >
                <Ionicons
                  name="bug-outline"
                  size={16}
                  color={isDark ? '#10B981' : '#059669'}
                />
                <Text
                  style={[
                    styles.headerActionText,
                    { color: isDark ? '#10B981' : '#059669' },
                  ]}
                >
                  Debug
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'all', label: t('all') },
              { key: 'info', label: t('info') },
              { key: 'success', label: t('success_type') },
              { key: 'warning', label: t('warning') },
              { key: 'error', label: t('error') },
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
            <Text style={styles.emptyTitle}>{t('no_notifications')}</Text>
            <Text style={styles.emptyMessage}>
              {filterCategory === 'all'
                ? t('all_caught_up')
                : t('no_category_notifications').replace('{category}', t(filterCategory))}
            </Text>
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={styles.headerIcon.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('notifications_title')} {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('NotificationPreferences')}
        >
          <Ionicons name="settings-outline" size={24} color={styles.settingsIcon.color} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {renderNotificationsTab()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
    },
    headerIcon: {
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    settingsButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
    },
    settingsIcon: {
      color: isDark ? '#D1D5DB' : '#6B7280',
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
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      width: '100%',
    },
    headerActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
      minWidth: 100,
      justifyContent: 'center',
    },
    markAllButton: {
      maxWidth: 140,
    },
    clearAllButton: {
      maxWidth: 120,
    },
    headerActionText: {
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 6,
      color: isDark ? '#D1D5DB' : '#6B7280',
      textAlign: 'center',
      flexShrink: 1,
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
      fontWeight: '500',
    },
    actionButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
      marginLeft: 8,
    },
    actionIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
  });
}