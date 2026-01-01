import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Goal } from '../types';
import { GoalsService } from '../services/goalsService';
import AddGoalModal from '../components/AddGoalModal';
import { useInterstitialAd } from '../components/InterstitialAd';
import { useAds } from '../contexts/AdContext';

const SavingsGoalsScreen = () => {
  const { theme } = useTheme();
  const { t, formatCurrency } = useLocalization();
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { adsEnabled } = useAds();
  const { showInterstitialIfNeeded, InterstitialComponent } = useInterstitialAd('SavingsGoals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [summary, setSummary] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalSaved: 0,
    totalTarget: 0
  });

  const styles = createStyles(theme);

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (adsEnabled) {
      showInterstitialIfNeeded();
    }
  }, [adsEnabled, showInterstitialIfNeeded]);

  const loadGoals = async () => {
    try {
      const [goalsData, summaryData] = await Promise.all([
        GoalsService.getAllGoals(),
        GoalsService.getGoalsSummary()
      ]);
      setGoals(goalsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'Failed to load goals');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      t('savingsGoals.deleteGoal'),
      t('savingsGoals.deleteConfirm', { goalName: 'this goal' }),
      [
        { text: t('payment.cancel'), style: 'cancel' },
        {
          text: t('savingsGoals.deleteGoal'),
          style: 'destructive',
          onPress: async () => {
            try {
              await GoalsService.deleteGoal(goalId);
              await loadGoals();
              Alert.alert(t('success'), t('savingsGoals.goalDeleted'));
            } catch (error) {
              Alert.alert(t('error'), t('savingsGoals.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleAddMoney = (goalId: string) => {
    Alert.prompt(
      t('add_money_title'),
      'How much would you like to add to this goal?',
      [
        { text: t('payment.cancel'), style: 'cancel' },
        {
          text: t('add'),
          onPress: async (text?: string) => {
            const amount = parseFloat(text || '0');
            if (amount > 0) {
              try {
                await GoalsService.addMoneyToGoal(goalId, amount);
                await loadGoals();
                Alert.alert(t('success'), t('savingsGoals.goalUpdated'));
              } catch (error) {
                Alert.alert(t('error'), t('savingsGoals.updateFailed'));
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddModal(true);
  };

  const handleGoalAdded = async (goal: Goal) => {
    await loadGoals(); // Refresh the goals list
  };

  const renderGoalCard = (goal: Goal) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <TouchableOpacity key={goal.id} style={styles.goalCard} onPress={() => handleEditGoal(goal)}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Text style={styles.goalTitle} numberOfLines={2} ellipsizeMode="tail">
              {goal.title}
            </Text>
            <Text style={styles.goalCategory}>{goal.category}</Text>
          </View>
          <View style={styles.goalActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAddMoney(goal.id);
              }}
            >
              <Ionicons name="add" size={16} color="#4A90E2" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteGoal(goal.id);
              }}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.goalAmounts}>
          <Text style={styles.goalCurrent} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(goal.currentAmount)}</Text>
          <Text style={styles.goalTarget} numberOfLines={1} adjustsFontSizeToFit>
            {t('more_screen_of')} {formatCurrency(goal.targetAmount)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { 
                width: `${progress}%`,
                backgroundColor: isCompleted ? '#34C759' : '#4A90E2'
              }
            ]} />
          </View>
          <Text style={[styles.progressText, { color: isCompleted ? '#34C759' : '#4A90E2' }]}>
            {progress.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.goalFooter}>
          <Text style={styles.goalDate}>{t('more_screen_target')} {goal.targetDate}</Text>
          <Text style={[
            styles.daysLeft,
            { color: daysLeft < 30 ? '#FF9500' : theme.colors.textSecondary }
          ]}>
            {daysLeft > 0 ? 
              t('savingsGoals.dueInDays', { days: daysLeft }) : 
              t('savingsGoals.overdue')
            }
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.completedText}>{t('savingsGoals.completed')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.headerBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerBackground} />
      
      {/* Dark Header Section */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => (navigation as any).navigate('UserProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.headerSurface }]}>
                  <Text style={[styles.avatarInitial, { color: theme.colors.headerText }]}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowAddModal(true)}
            style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
          >
            <Ionicons name="add" size={22} color={theme.colors.headerText} />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.headerTitleSection}>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>{t('savingsGoals.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.headerTextSecondary }]}>
            {summary.completedGoals}/{summary.totalGoals} {t('savingsGoals.completed')}
          </Text>
        </View>

        {/* Summary Cards in Header */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.headerSurface }]}>
            <Text style={[styles.summaryValue, { color: theme.colors.headerText }]}>{summary.totalGoals}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.headerTextSecondary }]}>{t('savingsGoals.totalGoals')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.headerSurface }]}>
            <Text style={[styles.summaryValue, { color: theme.colors.headerText }]}>{summary.completedGoals}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.headerTextSecondary }]}>{t('savingsGoals.completed')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.headerSurface }]}>
            <Text style={[styles.summaryValue, { color: theme.colors.headerText }]}>{formatCurrency(summary.totalSaved)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.headerTextSecondary }]}>{t('savingsGoals.totalSaved')}</Text>
          </View>
        </View>
      </View>

      {/* White Content Section */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('savingsGoals.noGoalsYet')}</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {t('savingsGoals.createFirstGoal')}
              </Text>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addButtonText}>{t('savingsGoals.addFirstGoal')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.goalsContainer}>
              {goals.map(renderGoalCard)}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Add Goal Modal */}
      <AddGoalModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingGoal(null);
        }}
        onGoalAdded={handleGoalAdded}
        editingGoal={editingGoal}
      />

      {/* Interstitial Ad Modal */}
      <InterstitialComponent />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  darkHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.colors.headerBackground,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  goalsContainer: {
    paddingBottom: 20,
  },
  goalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 20,
    flexShrink: 1,
  },
  goalCategory: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFF2F2',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  goalCurrent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 8,
    flexShrink: 1,
  },
  goalTarget: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  completedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SavingsGoalsScreen;