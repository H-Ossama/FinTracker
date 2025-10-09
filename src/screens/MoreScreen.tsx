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
import { billsService } from '../services/billsService';
import { budgetService } from '../services/budgetService';
import { dataInitializationService } from '../services/dataInitializationService';
import { Goal, Bill } from '../types';

const MoreScreen = () => {
  const { theme } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const { user, isAuthenticated, biometricEnabled } = useAuth();
  const navigation = useNavigation();
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsDropdownVisible, setBillsDropdownVisible] = useState(false);
  const [dataStats, setDataStats] = useState<any>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    loadGoals();
    loadBills();
    loadDataStats();
    initializeSampleData();
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

  const loadDataStats = async () => {
    try {
      const stats = await dataInitializationService.getDataStats();
      setDataStats(stats);
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const initializeSampleData = async () => {
    try {
      await dataInitializationService.initializeSampleData();
      await loadDataStats(); // Refresh stats after initialization
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  };

  const loadBills = async () => {
    try {
      setBillsLoading(true);
      const billsData = await billsService.getAllBills();
      setBills(billsData);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setBillsLoading(false);
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

  const toggleBillsDropdown = () => {
    setBillsDropdownVisible(!billsDropdownVisible);
  };

  const handleDropdownAction = (action: string) => {
    setBillsDropdownVisible(false);
    
    switch (action) {
      case 'viewAll':
        navigation.navigate('BillsReminder' as never);
        break;
      case 'addNew':
        (navigation.navigate as any)('BillsReminder', { openAddModal: true });
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
      title: t('more_screen_financial_tools'),
      items: [
        {
          id: 'goals',
          title: t('more_screen_savings_goals'),
          subtitle: t('more_screen_active_goals_count', { count: goals.length }),
          icon: 'flag',
          color: '#4A90E2',
          badge: goals.length.toString(),
        },
        {
          id: 'bills',
          title: t('more_screen_bills_reminder'),
          subtitle: t('more_screen_bills_count', { 
            count: dataStats?.billsCount || 0, 
            overdue: dataStats?.overdueBills || 0 
          }),
          icon: 'calendar',
          color: '#7ED321',
          badge: dataStats?.overdueBills > 0 ? dataStats.overdueBills.toString() : undefined,
        },
        {
          id: 'budget',
          title: t('more_screen_budget_planner'),
          subtitle: t('more_screen_categories_budgeted', { count: dataStats?.budgetsCount || 0 }),
          icon: 'pie-chart',
          color: '#9013FE',
        },
      ],
    },
    {
      title: t('more_screen_reports_export'),
      items: [
        {
          id: 'reports',
          title: t('more_screen_monthly_reports'),
          subtitle: t('more_screen_view_detailed_analytics'),
          icon: 'document-text',
          color: '#34C759',
        },
        {
          id: 'export',
          title: t('more_screen_export_data'),
          subtitle: t('more_screen_pdf_csv_excel'),
          icon: 'download',
          color: '#5856D6',
        },
        {
          id: 'backup',
          title: t('more_screen_backup_sync'),
          subtitle: t('more_screen_cloud_storage_options'),
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
        } else if (item.id === 'goals') {
          navigation.navigate('SavingsGoals' as never);
        } else if (item.id === 'bills') {
          navigation.navigate('BillsReminder' as never);
        } else if (item.id === 'budget') {
          navigation.navigate('BudgetPlanner' as never);
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
            {t('more_screen_of')} {formatCurrency(goal.targetAmount)}
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
            {t('more_screen_target')} {goal.targetDate}
          </Text>
          <Text style={[styles.goalCategory, { color: '#4A90E2' }]} numberOfLines={1} adjustsFontSizeToFit>
            {goal.category}
          </Text>
        </View>
        {isCompleted && (
          <View style={styles.completedIndicator}>
            <Ionicons name="checkmark-circle" size={12} color="#34C759" />
            <Text style={styles.completedText}>{t('more_screen_completed')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBillCard = (bill: Bill, index: number) => {
    const isOverdue = bill.status === 'overdue';
    const isPending = bill.status === 'pending';
    const isUpcoming = bill.status === 'upcoming';
    
    const formatDateDistance = (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t('more_screen_today');
      if (diffDays === 1) return t('more_screen_tomorrow');
      if (diffDays === -1) return t('more_screen_yesterday');
      if (diffDays > 1) return t('more_screen_in_days', { days: diffDays });
      return t('more_screen_days_ago', { days: Math.abs(diffDays) });
    };
    
    const getStatusConfig = () => {
      if (isOverdue) return {
        color: '#FF6B6B',
        bgColor: '#FFE4E1',
        icon: 'warning'
      };
      if (isPending) return {
        color: '#FF9800',
        bgColor: '#FFF3E0',
        icon: 'time'
      };
      return {
        color: '#4CAF50',
        bgColor: '#E8F5E8',
        icon: 'calendar'
      };
    };
    
    const statusConfig = getStatusConfig();
    
    return (
      <TouchableOpacity 
        key={bill.id} 
        style={[styles.modernReminderCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate('BillsReminder' as never)}
      >
        <LinearGradient
          colors={theme.isDark ? [theme.colors.card, theme.colors.surface] : ['#FFFFFF', '#FAFAFA']}
          style={styles.reminderCardGradient}
        >
          <View style={[styles.statusIndicatorBar, { backgroundColor: statusConfig.color }]} />
          
          <View style={styles.reminderCardHeader}>
            <View style={styles.reminderMainInfo}>
              <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bgColor }]}>
                <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              </View>
              <View style={styles.reminderTextContent}>
                <Text style={[styles.reminderTitleModern, { color: theme.colors.text }]} numberOfLines={1}>
                  {bill.title}
                </Text>
                <View style={styles.reminderMetaInfo}>
                  <Text style={[styles.reminderFrequency, { color: theme.colors.textSecondary }]}>
                    {bill.frequency}
                  </Text>
                  <View style={styles.metaDivider} />
                  <Text style={[styles.reminderDueDate, { 
                    color: isOverdue ? '#FF6B6B' : theme.colors.textSecondary 
                  }]}>
                    {formatDateDistance(bill.dueDate)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.reminderAmountModern, { color: theme.colors.text }]}>
                {formatCurrency(bill.amount)}
              </Text>
            </View>
          </View>
          
          <View style={styles.reminderCardFooter}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { color: theme.colors.textSecondary }]}>
                {bill.category}
              </Text>
            </View>
            
            <View style={styles.badgeContainer}>
              {bill.isRecurring && (
                <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="repeat" size={10} color="#1976D2" />
                  <Text style={[styles.badgeText, { color: '#1976D2' }]}>{t('more_screen_recurring')}</Text>
                </View>
              )}
              {bill.remindersPerDay > 1 && (
                <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="notifications" size={10} color="#F57C00" />
                  <Text style={[styles.badgeText, { color: '#F57C00' }]}>{t('more_screen_daily_reminders', { count: bill.remindersPerDay })}</Text>
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
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('more_screen_title')}</Text>
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
                    <Ionicons name="checkmark-circle" size={12} color="#34C759" /> {t('more_screen_verified_account')}
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
              <Text style={styles.overviewTitle}>{t('more_screen_active_goals')}</Text>
              <Text style={styles.overviewValue}>{goals.length}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>{t('more_screen_pending_bills')}</Text>
              <Text style={styles.overviewValue}>{dataStats?.pendingBills || 0}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>{t('more_screen_monthly_budget')}</Text>
              <Text style={styles.overviewValue}>${dataStats?.totalBudgetAmount?.toFixed(0) || '0'}</Text>
            </View>
          </View>

          {/* Recent Goals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('more_screen_savings_goals')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SavingsGoals' as never)}>
                <Text style={styles.seeAllText}>{t('more_screen_see_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {goalsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('more_screen_loading_goals')}</Text>
                </View>
              ) : goals.length === 0 ? (
                <View style={styles.emptyGoalsContainer}>
                  <Text style={[styles.emptyGoalsText, { color: theme.colors.textSecondary }]}>{t('more_screen_no_goals')}</Text>
                  <TouchableOpacity 
                    style={styles.addGoalButton}
                    onPress={() => navigation.navigate('SavingsGoals' as never)}
                  >
                    <Text style={styles.addGoalButtonText}>{t('more_screen_add_goal')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.slice(0, 5).map(renderGoalCard)
              )}
            </ScrollView>
          </View>

          {/* Bills Reminder */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('more_screen_bills_reminder')}</Text>
              <View style={styles.manageReminderContainer}>
                <TouchableOpacity 
                  style={[styles.manageButton, { backgroundColor: theme.colors.primary }]}
                  onPress={toggleBillsDropdown}
                >
                  <Ionicons name="settings-outline" size={16} color="white" />
                  <Text style={[styles.manageButtonText, { color: 'white' }]}>{t('more_screen_manage')}</Text>
                  <Ionicons 
                    name={billsDropdownVisible ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="white" 
                  />
                </TouchableOpacity>
                {billsDropdownVisible && (
                  <View style={[styles.reminderDropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('viewAll')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="list-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{t('more_screen_view_all_bills')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('addNew')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{t('more_screen_add_new_bill')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleDropdownAction('notifications')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="notifications-outline" size={18} color={theme.colors.text} />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{t('more_screen_notification_settings')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            
            {billsLoading ? (
              <View style={styles.reminderLoadingCard}>
                <View style={styles.loadingIndicator}>
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                </View>
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('more_screen_loading_bills')}</Text>
              </View>
            ) : bills.length === 0 ? (
              <View style={styles.emptyRemindersCard}>
                <LinearGradient
                  colors={['#F8F9FA', '#E9ECEF']}
                  style={styles.emptyStateGradient}
                >
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="calendar-outline" size={40} color="#6C63FF" />
                  </View>
                  <Text style={styles.emptyRemindersTitle}>{t('more_screen_no_bills')}</Text>
                  <Text style={styles.emptyRemindersSubtitle}>{t('more_screen_stay_on_top')}</Text>
                  <TouchableOpacity 
                    style={styles.addReminderButton}
                    onPress={() => navigation.navigate('BillsReminder' as never)}
                  >
                    <LinearGradient
                      colors={['#6C63FF', '#5A52FF']}
                      style={styles.addButtonGradient}
                    >
                      <Ionicons name="add" size={18} color="white" />
                      <Text style={styles.addReminderButtonText}>{t('more_screen_add_first_bill')}</Text>
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
                          {bills.filter(b => b.status === 'pending').length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('more_screen_pending')}</Text>
                      </View>
                      
                      <View style={styles.statDivider} />
                      
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                          <Ionicons name="warning" size={16} color="#FF9800" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {bills.filter(b => b.status === 'overdue').length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('more_screen_overdue')}</Text>
                      </View>
                      
                      <View style={styles.statDivider} />
                      
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
                          <Ionicons name="repeat" size={16} color="#4CAF50" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>
                          {bills.filter(b => b.isRecurring).length}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('more_screen_recurring')}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Bill Cards */}
                <View style={styles.reminderCardsContainer}>
                  {bills
                    .filter(b => b.status === 'pending' || b.status === 'overdue')
                    .sort((a, b) => {
                      // Sort by status (overdue first) then by due date
                      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
                      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    })
                    .slice(0, 3)
                    .map(renderBillCard)}
                </View>
                
                {bills.filter(b => b.status === 'pending' || b.status === 'overdue').length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllRemindersButton}
                    onPress={() => navigation.navigate('BillsReminder' as never)}
                  >
                    <LinearGradient
                      colors={theme.isDark ? [theme.colors.surface, theme.colors.card] : ['#F8F9FA', '#E9ECEF']}
                      style={styles.viewAllGradient}
                    >
                      <Text style={[styles.viewAllText, { color: theme.colors.text }]}>
                        {t('more_screen_view_all_bills_count', { count: bills.filter(b => b.status === 'pending' || b.status === 'overdue').length })}
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
    flexWrap: 'wrap',
  },
  overviewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    flex: 0.31,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  overviewTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
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