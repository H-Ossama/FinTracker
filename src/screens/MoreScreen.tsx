import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mockGoals, mockReminders } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization, Language, Currency } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { SyncSettingsModal } from '../components/SyncSettingsModal';
import { notificationService } from '../services/notificationService';

const MoreScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, currency, setLanguage, setCurrency, t, formatCurrency } = useLocalization();
  const { user, isAuthenticated, biometricEnabled } = useAuth();
  const navigation = useNavigation();
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const styles = createStyles(theme);

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

  const handleTestNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        '🎉 Test Notification',
        'This is a test notification from FinTracker! Local notifications are working perfectly.',
        { test: true, screen: 'MoreScreen' },
        { seconds: 2 } as any // Trigger in 2 seconds
      );
      console.log('✅ Test notification scheduled successfully');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  };

  const menuSections = [
    {
      title: 'Financial Tools',
      items: [
        {
          id: 'goals',
          title: 'Savings Goals',
          subtitle: `${mockGoals.length} active goals`,
          icon: 'flag',
          color: '#4A90E2',
          badge: mockGoals.length.toString(),
        },
        {
          id: 'reminders',
          title: 'Payment Reminders',
          subtitle: `${mockReminders.filter(r => !r.isPaid).length} upcoming`,
          icon: 'alarm',
          color: '#FF9500',
          badge: mockReminders.filter(r => !r.isPaid).length.toString(),
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
    {
      title: 'Account & Settings',
      items: [
        {
          id: 'account',
          title: 'Account Settings',
          subtitle: 'Profile, security, privacy',
          icon: 'person-circle',
          color: '#007AFF',
        },
        {
          id: 'privacy',
          title: 'Privacy & Security',
          subtitle: 'App lock, biometrics',
          icon: 'shield-checkmark',
          color: '#FF3B30',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'Manage alerts • Tap to test',
          icon: 'notifications',
          color: '#5AC8FA',
        },
        {
          id: 'appearance',
          title: 'Appearance',
          subtitle: 'Theme settings',
          icon: 'color-palette',
          color: '#AF52DE',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          subtitle: 'FAQs and guides',
          icon: 'help-circle',
          color: '#8E8E93',
        },
        {
          id: 'contact',
          title: 'Contact Support',
          subtitle: 'Get help from our team',
          icon: 'mail',
          color: '#007AFF',
        },
        {
          id: 'about',
          title: 'About FinTracker',
          subtitle: 'Version 1.0.0',
          icon: 'information-circle',
          color: '#6D6D70',
        },
      ],
    },
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.menuItem}
      onPress={() => {
        if (item.id === 'account') {
          handleProfilePress();
        } else if (item.id === 'backup') {
          setShowSyncModal(true);
        } else if (item.id === 'reminders') {
          navigation.navigate('Reminders' as never);
        } else if (item.id === 'notifications') {
          // Test notification functionality
          handleTestNotification();
          // Also navigate to notification center
          navigation.navigate('NotificationCenter' as never);
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

  const renderGoalCard = (goal: any) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    
    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalProgress}>{progress.toFixed(0)}%</Text>
        </View>
        <View style={styles.goalAmounts}>
          <Text style={[styles.goalCurrent, { color: theme.colors.text }]}>{formatCurrency(goal.currentAmount)}</Text>
          <Text style={[styles.goalTarget, { color: theme.colors.textSecondary }]}>of {formatCurrency(goal.targetAmount)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.goalDate, { color: theme.colors.textSecondary }]}>Target: {goal.targetDate}</Text>
      </View>
    );
  };

  const renderReminderCard = (reminder: any) => (
    <View key={reminder.id} style={styles.reminderCard}>
      <View style={styles.reminderLeft}>
        <View style={[styles.reminderIcon, { backgroundColor: reminder.isPaid ? '#7ED321' : '#FF9500' }]}>
          <Ionicons 
            name={reminder.isPaid ? 'checkmark' : 'time'} 
            size={16} 
            color="white" 
          />
        </View>
        <View>
          <Text style={[styles.reminderTitle, { color: theme.colors.text }]}>{reminder.title}</Text>
          <Text style={[styles.reminderDate, { color: theme.colors.textSecondary }]}>Due: {reminder.nextDue}</Text>
        </View>
      </View>
      <View style={styles.reminderRight}>
        <Text style={[styles.reminderAmount, { color: theme.colors.text }]}>{formatCurrency(reminder.amount)}</Text>
        <Text style={[styles.reminderStatus, { 
          color: reminder.isPaid ? '#7ED321' : '#FF9500' 
        }]}>
          {reminder.isPaid ? 'Paid' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>More</Text>
            <TouchableOpacity onPress={handleProfilePress}>
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
              <Text style={styles.overviewValue}>{mockGoals.length}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Pending Bills</Text>
              <Text style={styles.overviewValue}>{mockReminders.filter(r => !r.isPaid).length}</Text>
            </View>
          </View>

          {/* Recent Goals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mockGoals.map(renderGoalCard)}
            </ScrollView>
          </View>

          {/* Upcoming Reminders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.remindersContainer}>
              {mockReminders.slice(0, 3).map(renderReminderCard)}
            </View>
          </View>

          {/* Settings Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Settings</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="eye-off" size={20} color="#8E8E93" />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Hide Balance</Text>
                </View>
                <Switch
                  value={isBalanceMasked}
                  onValueChange={setIsBalanceMasked}
                  trackColor={{ false: '#E5E5EA', true: '#4A90E2' }}
                  thumbColor={isBalanceMasked ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="finger-print" size={20} color="#8E8E93" />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Biometric Lock</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={() => {}} // Read-only - managed in profile
                  trackColor={{ false: '#E5E5EA', true: '#4A90E2' }}
                  thumbColor={biometricEnabled ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="moon" size={20} color="#8E8E93" />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Dark Mode</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E5E5EA', true: '#4A90E2' }}
                  thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
                <View style={styles.settingLeft}>
                  <Ionicons name="language" size={20} color="#8E8E93" />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Language</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {language === 'en' ? 'English' : language === 'de' ? 'Deutsch' : 'العربية'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem} onPress={() => setShowCurrencyModal(true)}>
                <View style={styles.settingLeft}>
                  <Ionicons name="card" size={20} color="#8E8E93" />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Currency</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{currency}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
            </View>
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

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {[
              { code: 'en' as Language, name: 'English', native: 'English' },
              { code: 'de' as Language, name: 'German', native: 'Deutsch' },
              { code: 'ar' as Language, name: 'Arabic', native: 'العربية' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.optionItem}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{lang.native}</Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color="#4A90E2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {[
              { code: 'USD' as Currency, name: 'US Dollar', symbol: '$' },
              { code: 'EUR' as Currency, name: 'Euro', symbol: '€' },
              { code: 'MAD' as Currency, name: 'Moroccan Dirham', symbol: 'MAD' },
            ].map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={styles.optionItem}
                onPress={() => {
                  setCurrency(curr.code);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{curr.name} ({curr.symbol})</Text>
                {currency === curr.code && (
                  <Ionicons name="checkmark" size={20} color="#4A90E2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
    paddingTop: 20,
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
    width: 200,
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
  },
  goalCurrent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  goalTarget: {
    fontSize: 12,
    color: '#8E8E93',
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
});

export default MoreScreen;