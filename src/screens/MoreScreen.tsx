import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mockReminders } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { SyncSettingsModal } from '../components/SyncSettingsModal';
import { notificationService } from '../services/notificationService';
import { GoalsService } from '../services/goalsService';
import { reminderService } from '../services/reminderService';
import { Goal } from '../types';
import { Reminder } from './RemindersScreen';

const MoreScreen = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const { user, isAuthenticated, biometricEnabled } = useAuth();
  const navigation = useNavigation();
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [enhancedReminders, setEnhancedReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [reminderDropdownVisible, setReminderDropdownVisible] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    loadGoals();
    loadReminders();
  }, []);

  const loadGoals = async () => {
    try {
      setGoalsLoading(true);
      const goalsData = await GoalsService.getAllGoals();
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      setRemindersLoading(true);
      // Mock enhanced reminders data for demo
      const mockEnhancedReminders: Reminder[] = [
        {
          id: '1',
          title: 'Monthly Rent',
          description: 'Pay monthly rent',
          amount: 1200,
          dueDate: new Date(2025, 9, 15),
          frequency: 'MONTHLY',
          status: 'PENDING',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: true,
          transactionType: 'EXPENSE',
          walletId: 'wallet1',
          categoryId: 'category1',
          notifyBefore: 60,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 8,
          nextDue: new Date(2025, 10, 15),
          category: {
            id: 'category1',
            name: 'Housing',
            icon: 'home',
            color: '#3B82F6',
          },
        },
        {
          id: '2',
          title: 'Gym Membership',
          description: 'Monthly gym payment',
          amount: 45,
          dueDate: new Date(2025, 9, 20),
          frequency: 'MONTHLY',
          status: 'OVERDUE',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: false,
          notifyBefore: 120,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 3,
          category: {
            id: 'category2',
            name: 'Health & Fitness',
            icon: 'fitness',
            color: '#10B981',
          },
        },
        {
          id: '3',
          title: 'Weekly Groceries',
          description: 'Grocery shopping reminder',
          dueDate: new Date(2025, 9, 12),
          frequency: 'WEEKLY',
          status: 'PENDING',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: false,
          notifyBefore: 30,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 15,
          nextDue: new Date(2025, 9, 19),
          category: {
            id: 'category3',
            name: 'Groceries',
            icon: 'basket',
            color: '#F59E0B',
          },
        },
        {
          id: '4',
          title: 'Quarterly Insurance',
          description: 'Car insurance payment',
          amount: 350,
          dueDate: new Date(2025, 11, 1),
          frequency: 'QUARTERLY',
          status: 'PENDING',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: true,
          transactionType: 'EXPENSE',
          notifyBefore: 7 * 24 * 60, // 7 days before
          enablePushNotification: true,
          enableEmailNotification: true,
          completedCount: 2,
          category: {
            id: 'category4',
            name: 'Insurance',
            icon: 'shield-checkmark',
            color: '#8B5CF6',
          },
        },
      ];
      setEnhancedReminders(mockEnhancedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setRemindersLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfilePress = () => {
    if (isAuthenticated) {
      navigation.navigate('UserProfile' as never);
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate('QuickSettings' as never);
  };

  const toggleReminderDropdown = () => {
    setReminderDropdownVisible(!reminderDropdownVisible);
  };

  const handleDropdownAction = (action: string) => {
    setReminderDropdownVisible(false);
    
    switch (action) {
      case 'viewAll':
        navigation.navigate('Reminders' as never);
        break;
      case 'addNew':
        navigation.navigate('Reminders' as never); // Will trigger add modal
        break;
      case 'notifications':
        navigation.navigate('NotificationPreferences' as never);
        break;
      case 'settings':
        navigation.navigate('QuickSettings' as never);
        break;
    }
  };

  const menuSections = [
    {
      title: 'Financial Tools',
      items: [
        {
          id: 'goals',
          title: 'Savings Goals',
          subtitle: `${goals.length} active goals`,
          icon: 'flag',
          color: '#4A90E2',
          badge: goals.length.toString(),
        },
        {
          id: 'reminders',
          title: 'Payment Reminders',
          subtitle: `${enhancedReminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE').length} upcoming`,
          icon: 'alarm',
          color: '#FF9500',
          badge: enhancedReminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE').length.toString(),
        },
        {
          id: 'bills',
          title: 'Bills Tracker',
          subtitle: 'Manage recurring payments',
          icon: 'calendar',
          color: '#7ED321',
        },
        {
          id: 'budget',
          title: 'Budget Planner',
          subtitle: 'Set monthly budgets',
          icon: 'pie-chart',
          color: '#9013FE',
        },
      ],
    },
    {
      title: 'Reports & Export',
      items: [
        {
          id: 'reports',
          title: 'Monthly Reports',
          subtitle: 'View detailed analytics',
          icon: 'document-text',
          color: '#34C759',
        },
        {
          id: 'export',
          title: 'Export Data',
          subtitle: 'PDF, CSV, Excel',
          icon: 'download',
          color: '#5856D6',
        },
        {
          id: 'backup',
          title: 'Backup & Sync',
          subtitle: 'Cloud storage options',
          icon: 'cloud',
          color: '#32D74B',
        },
      ],
    },
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.menuItem}
      onPress={() => {
        if (item.id === 'backup') {
          setShowSyncModal(true);
        } else if (item.id === 'reminders') {
          navigation.navigate('Reminders' as never);
        } else if (item.id === 'goals') {
          navigation.navigate('SavingsGoals' as never);
        }
        // Add other navigation handlers here as needed
      }}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={20} color="white" />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const renderGoalCard = (goal: Goal) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    
    return (
      <TouchableOpacity 
        key={goal.id} 
        style={styles.goalCard}
        onPress={() => navigation.navigate('SavingsGoals' as never)}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle} numberOfLines={2} ellipsizeMode="tail">
            {goal.title}
          </Text>
          <Text style={[styles.goalProgress, { 
            color: isCompleted ? '#34C759' : '#4A90E2' 
          }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.goalAmounts}>
          <Text style={[styles.goalCurrent, { color: theme.colors.text }]} numberOfLines={1}>
            {formatCurrency(goal.currentAmount)}
          </Text>
          <Text style={[styles.goalTarget, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            of {formatCurrency(goal.targetAmount)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { 
            width: `${progress}%`,
            backgroundColor: isCompleted ? '#34C759' : '#4A90E2'
          }]} />
        </View>
        <View style={styles.goalFooter}>
          <Text style={[styles.goalDate, { color: theme.colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
            Target: {goal.targetDate}
          </Text>
          <Text style={[styles.goalCategory, { color: '#4A90E2' }]} numberOfLines={1} adjustsFontSizeToFit>
            {goal.category}
          </Text>
        </View>
        {isCompleted && (
          <View style={styles.completedIndicator}>
            <Ionicons name="checkmark-circle" size={12} color="#34C759" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEnhancedReminderCard = (reminder: Reminder, index: number) => {
    const isOverdue = reminder.status === 'OVERDUE' || 
      (reminder.status === 'PENDING' && new Date(reminder.dueDate) < new Date());
    const isPending = reminder.status === 'PENDING';
    const isCompleted = reminder.status === 'COMPLETED';
    
    const formatDateDistance = (date: Date): string => {
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 1) return `In ${diffDays} days`;
      return `${Math.abs(diffDays)} days ago`;
    };
    
    const getStatusConfig = () => {
      if (isOverdue) return {
        color: '#FF6B6B',
        bgColor: '#FFE4E1',
        icon: 'warning',
        gradient: ['#FF6B6B', '#FF5252']
      };
      if (isPending) return {
        color: '#FF9800',
        bgColor: '#FFF3E0',
        icon: 'time',
        gradient: ['#FF9800', '#F57C00']
      };
      return {
        color: '#4CAF50',
        bgColor: '#E8F5E8',
        icon: 'checkmark-circle',
        gradient: ['#4CAF50', '#388E3C']
      };
    };
    
    const statusConfig = getStatusConfig();
    
    return (
      <TouchableOpacity 
        key={reminder.id} 
        style={[styles.modernReminderCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate('Reminders' as never)}
      >
        <LinearGradient
          colors={theme.isDark ? [theme.colors.card, theme.colors.surface] : ['#FFFFFF', '#FAFAFA']}
          style={styles.reminderCardGradient}
        >
          {/* Status indicator bar */}
          <View style={[styles.statusIndicatorBar, { backgroundColor: statusConfig.color }]} />
          
          {/* Header */}
          <View style={styles.reminderCardHeader}>
            <View style={styles.reminderMainInfo}>
              <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bgColor }]}>
                <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              </View>
              <View style={styles.reminderTextContent}>
                <Text style={[styles.reminderTitleModern, { color: theme.colors.text }]} numberOfLines={1}>
                  {reminder.title}
                </Text>
                <View style={styles.reminderMetaInfo}>
                  <Text style={[styles.reminderFrequency, { color: theme.colors.textSecondary }]}>
                    {reminder.frequency.toLowerCase()}
                  </Text>
                  <View style={styles.metaDivider} />
                  <Text style={[styles.reminderDueDate, { 
                    color: isOverdue ? '#FF6B6B' : theme.colors.textSecondary 
                  }]}>
                    {formatDateDistance(new Date(reminder.dueDate))}
                  </Text>
                </View>
              </View>
            </View>
            {reminder.amount && (
              <View style={styles.amountContainer}>
                <Text style={[styles.reminderAmountModern, { color: theme.colors.text }]}>
                  {formatCurrency(reminder.amount)}
                </Text>
              </View>
            )}
          </View>
          
          {/* Footer with category and badges */}
          <View style={styles.reminderCardFooter}>
            {reminder.category && (
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryIconContainer, { backgroundColor: reminder.category.color + '20' }]}>
                  <Ionicons 
                    name={reminder.category.icon as any} 
                    size={12} 
                    color={reminder.category.color} 
                  />
                </View>
                <Text style={[styles.categoryName, { color: theme.colors.textSecondary }]}>
                  {reminder.category.name}
                </Text>
              </View>
            )}
            
            <View style={styles.badgeContainer}>
              {reminder.isRecurring && (
                <View style={styles.recurringBadgeModern}>
                  <Ionicons name="repeat" size={10} color="#6C63FF" />
                  <Text style={styles.recurringTextModern}>Recurring</Text>
                </View>
              )}
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Ionicons name="alert-circle" size={10} color="#FF6B6B" />
                  <Text style={styles.overdueTextModern}>Overdue</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>More</Text>
            <TouchableOpacity onPress={handleSettingsPress}>
              <Ionicons name="settings" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* User Profile Section */}
          {isAuthenticated && user && (
            <TouchableOpacity style={styles.profileSection} onPress={handleProfilePress}>
              <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  <Text style={styles.profileStatus}>
                    <Ionicons name="checkmark-circle" size={12} color="#34C759" /> Verified Account
                  </Text>
                </View>
              </View>
              <View style={styles.profileActions}>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Overview Cards */}
          <View style={styles.overviewSection}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Active Goals</Text>
              <Text style={styles.overviewValue}>{goals.length}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Pending Bills</Text>
              <Text style={styles.overviewValue}>{enhancedReminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE').length}</Text>
            </View>
          </View>

          {/* Recent Goals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SavingsGoals' as never)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {goalsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading goals...</Text>
                </View>
              ) : goals.length === 0 ? (
                <View style={styles.emptyGoalsContainer}>
                  <Text style={[styles.emptyGoalsText, { color: theme.colors.textSecondary }]}>No goals yet</Text>
                  <TouchableOpacity 
                    style={styles.addGoalButton}
                    onPress={() => navigation.navigate('SavingsGoals' as never)}
                  >
                    <Text style={styles.addGoalButtonText}>Add Goal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.slice(0, 5).map(renderGoalCard)
              )}
            </ScrollView>
          </View>

          {/* Upcoming Reminders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Reminders</Text>
              <View style={styles.manageReminderContainer}>
                <TouchableOpacity 
                  style={[styles.manageButton, { backgroundColor: theme.colors.primary }]}
                  onPress={toggleReminderDropdown}
                >
                  <Ionicons name="settings-outline" size={16} color="white" />
                  <Text style={[styles.manageButtonText, { color: 'white' }]}>Manage</Text>
                  <Ionicons 
                    name={reminderDropdownVisible ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="white" 
                  />
                </TouchableOpacity>
                {reminderDropdownVisible && (
                  <View style={[styles.reminderDropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('viewAll')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="list-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>View All Reminders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('addNew')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>Add New Reminder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('notifications')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="notifications-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>Notification Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleDropdownAction('settings')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="settings-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>Settings</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            
            {remindersLoading ? (
              <View style={styles.reminderLoadingCard}>
                <View style={styles.loadingIndicator}>
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                </View>
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading your reminders...</Text>
              </View>
            ) : enhancedReminders.length === 0 ? (
              <View style={styles.emptyRemindersCard}>
                <LinearGradient
                  colors={['#F8F9FA', '#E9ECEF']}
                  style={styles.emptyStateGradient}
                >
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="notifications-outline" size={40} color="#6C63FF" />
                  </View>
                  <Text style={styles.emptyRemindersTitle}>No upcoming reminders</Text>
                  <Text style={styles.emptyRemindersSubtitle}>Stay on top of your bills and payments</Text>
                  <TouchableOpacity 
                    style={styles.addReminderButton}
                    onPress={() => navigation.navigate('Reminders' as never)}
                  >
                    <LinearGradient
                      colors={['#6C63FF', '#5A52FF']}
                      style={styles.addButtonGradient}
                    >
                      <Ionicons name="add" size={18} color="white" />
                      <Text style={styles.addReminderButtonText}>Add Your First Reminder</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <>
                {/* Quick Overview Stats */}
                <View style={styles.reminderStatsCard}>
                  <LinearGradient
                    colors={theme.isDark ? [theme.colors.card, theme.colors.surface] : ['#FFFFFF', '#F8F9FA']}
                    style={styles.statsGradient}
                  >
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFE4E1' }]}>
                          <Ionicons name="time" size={16} color="#FF6B6B" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {enhancedReminders.filter(r => r.status === 'PENDING').length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
                      </View>
                      
                      <View style={styles.statDivider} />
                      
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                          <Ionicons name="warning" size={16} color="#FF9800" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {enhancedReminders.filter(r => r.status === 'OVERDUE').length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Overdue</Text>
                      </View>
                      
                      <View style={styles.statDivider} />
                      
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
                          <Ionicons name="repeat" size={16} color="#4CAF50" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {enhancedReminders.filter(r => r.isRecurring).length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Recurring</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Reminder Cards */}
                <View style={styles.reminderCardsContainer}>
                  {enhancedReminders
                    .filter(r => r.status === 'PENDING' || r.status === 'OVERDUE')
                    .sort((a, b) => {
                      // Sort by status (overdue first) then by due date
                      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
                      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    })
                    .slice(0, 3)
                    .map(renderEnhancedReminderCard)}
                </View>
                
                {enhancedReminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE').length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllRemindersButton}
                    onPress={() => navigation.navigate('Reminders' as never)}
                  >
                    <LinearGradient
                      colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#F8F9FA', '#E9ECEF']}
                      style={styles.viewAllGradient}
                    >
                      <Text style={[styles.viewAllText, { color: theme.colors.text }]}>
                        View all {enhancedReminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE').length} reminders
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={[styles.menuSection, { backgroundColor: theme.colors.surface }]}>
                {section.items.map(renderMenuItem)}
              </View>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Sync Settings Modal */}
      <SyncSettingsModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={() => {
          setShowSyncModal(false);
          // You can add any additional logic here after successful sync
        }}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  overviewSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  overviewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    flex: 0.48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  goalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 240,
    minWidth: 240,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  goalProgress: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  goalCurrent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
    flexShrink: 1,
  },
  goalTarget: {
    fontSize: 12,
    color: '#8E8E93',
    flexShrink: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  goalDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  remindersContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reminderRight: {
    alignItems: 'flex-end',
  },
  reminderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  reminderStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
  },
  menuSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  // Profile section styles
  profileSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  profileActions: {
    padding: 4,
  },
  // New styles for enhanced goals functionality
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  goalCategory: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  completedText: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    minWidth: 240,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyGoalsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    minWidth: 240,
  },
  emptyGoalsText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  addGoalButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addGoalButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  // Enhanced Reminders Styles
  enhancedRemindersContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedReminderCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reminderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reminderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  reminderStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderTitleContent: {
    flex: 1,
  },
  enhancedReminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderFrequency: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  enhancedReminderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reminderCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reminderCategoryIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  reminderCategoryName: {
    fontSize: 12,
    flex: 1,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  recurringText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
    marginLeft: 2,
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  overdueText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF' + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6C63FF' + '30',
  },
  manageButtonText: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
    marginLeft: 4,
  },
  manageReminderContainer: {
    position: 'relative',
  },
  reminderDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    minWidth: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyRemindersContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyRemindersText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addReminderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  showMoreReminders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  showMoreText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    marginRight: 4,
  },
  // Reminder Stats Styles
  reminderStatsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  reminderStat: {
    alignItems: 'center',
    flex: 1,
  },
  reminderStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  reminderStatLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  // New Modern Reminder Styles
  reminderLoadingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C63FF',
    marginHorizontal: 4,
  },
  emptyRemindersCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateGradient: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyRemindersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyRemindersSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  reminderStatsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGradient: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  reminderCardsContainer: {
    marginBottom: 16,
  },
  modernReminderCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reminderCardGradient: {
    padding: 16,
    position: 'relative',
  },
  statusIndicatorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  reminderMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderTextContent: {
    flex: 1,
  },
  reminderTitleModern: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: 8,
  },
  reminderDueDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  reminderAmountModern: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reminderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '50',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  recurringTextModern: {
    fontSize: 11,
    color: '#6C63FF',
    fontWeight: '600',
    marginLeft: 3,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  overdueTextModern: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 3,
  },
  viewAllRemindersButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default MoreScreen;