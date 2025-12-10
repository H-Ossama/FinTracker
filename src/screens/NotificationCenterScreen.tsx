import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNotification } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';

export default function NotificationCenterScreen({ navigation }: { navigation: any }) {
  const { isDark, theme } = useTheme();
  const { t } = useLocalization();
  const { state: notificationState, markAsRead, markAsUnread, markAllAsRead, removeNotification } = useNotification();
  const insets = useSafeAreaInsets();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const notifications = notificationState.inAppNotifications;
  const unreadCount = notificationState.unreadCount;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    if (notification.data) {
      notificationService.navigateFromNotificationData(notification.data);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      t('delete_notification') || 'Delete Notification',
      t('delete_notification_confirm') || 'Are you sure you want to delete this notification?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => removeNotification(notificationId),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      t('clear_all_notifications') || 'Clear All Notifications',
      t('clear_all_confirm') || 'Are you sure you want to clear all notifications?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('clear_all') || 'Clear All',
          style: 'destructive',
          onPress: () => notifications.forEach(n => removeNotification(n.id)),
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'info': return 'information-circle';
      case 'success': return 'checkmark-circle';
      case 'warning': return 'alert-circle';
      case 'error': return 'close-circle';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'info': return '#3B82F6';
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const filteredNotifications = notifications.filter(notification =>
    filterCategory === 'all' || notification.type === filterCategory
  );

  const filterOptions = [
    { key: 'all', label: t('all') || 'All', icon: 'apps' },
    { key: 'info', label: t('info') || 'Info', icon: 'information-circle' },
    { key: 'success', label: t('success_type') || 'Success', icon: 'checkmark-circle' },
    { key: 'warning', label: t('warning') || 'Warning', icon: 'alert-circle' },
    { key: 'error', label: t('error') || 'Error', icon: 'close-circle' },
  ];

  const renderNotificationItem = ({ item }: { item: typeof notifications[0] }) => {
    const color = getNotificationColor(item.type);
    const iconName = getNotificationIcon(item.type);
    
    return (
      <Animated.View
        style={[
          styles.notificationCard,
          {
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          {/* Left indicator for unread */}
          {!item.read && (
            <View style={[styles.unreadIndicator, { backgroundColor: color }]} />
          )}
          
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={iconName} size={24} color={color} />
          </View>
          
          {/* Content */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text 
                style={[
                  styles.notificationTitle, 
                  { color: isDark ? '#FFFFFF' : '#1F2937' },
                  !item.read && styles.unreadTitle,
                ]} 
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.timestamp, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
            <Text 
              style={[styles.notificationMessage, { color: isDark ? '#D1D5DB' : '#6B7280' }]} 
              numberOfLines={2}
            >
              {item.message}
            </Text>
            
            {/* Type badge */}
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.typeBadgeText, { color }]}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Actions */}
        <View style={[styles.actionsContainer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
            onPress={() => item.read ? markAsUnread(item.id) : markAsRead(item.id)}
          >
            <Ionicons
              name={item.read ? 'mail-outline' : 'mail-open-outline'}
              size={18}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }]}
            onPress={() => handleDeleteNotification(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
        <Ionicons
          name="notifications-off-outline"
          size={56}
          color={isDark ? '#6B7280' : '#9CA3AF'}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>
        {t('no_notifications') || 'No notifications'}
      </Text>
      <Text style={[styles.emptyMessage, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        {filterCategory === 'all'
          ? t('all_caught_up') || "You're all caught up! Check back later for updates."
          : `No ${filterCategory} notifications found.`}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {t('notifications_title') || 'Notifications'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, unreadCount === 0 && styles.quickActionDisabled]}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={18} color={unreadCount > 0 ? '#10B981' : 'rgba(255,255,255,0.3)'} />
            <Text style={[styles.quickActionText, unreadCount === 0 && styles.quickActionTextDisabled]}>
              {t('mark_all_read') || 'Mark all read'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.quickActionDivider} />
          
          <TouchableOpacity
            style={[styles.quickActionButton, filteredNotifications.length === 0 && styles.quickActionDisabled]}
            onPress={handleClearAll}
            disabled={filteredNotifications.length === 0}
          >
            <Ionicons name="trash-outline" size={18} color={filteredNotifications.length > 0 ? '#EF4444' : 'rgba(255,255,255,0.3)'} />
            <Text style={[styles.quickActionText, styles.clearAllText, filteredNotifications.length === 0 && styles.quickActionTextDisabled]}>
              {t('clear_all') || 'Clear all'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const isActive = filterCategory === item.key;
              const color = item.key !== 'all' ? getNotificationColor(item.key) : theme.colors.primary;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive 
                        ? (isDark ? color + '30' : color + '15')
                        : (isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
                      borderColor: isActive ? color : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                    },
                  ]}
                  onPress={() => setFilterCategory(item.key as any)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={16} 
                    color={isActive ? color : (isDark ? '#9CA3AF' : '#6B7280')} 
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isActive ? color : (isDark ? '#D1D5DB' : '#6B7280') },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Notifications List */}
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderRadius: 8,
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  clearAllText: {
    color: 'rgba(255,255,255,0.8)',
  },
  quickActionDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -1,
    overflow: 'hidden',
  },
  filterContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
