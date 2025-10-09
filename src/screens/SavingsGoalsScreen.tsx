import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNavigation } from '@react-navigation/native';
import { Goal } from '../types';
import { GoalsService } from '../services/goalsService';
import AddGoalModal from '../components/AddGoalModal';

const SavingsGoalsScreen = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const navigation = useNavigation();
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
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoalsService.deleteGoal(goalId);
              await loadGoals();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const handleAddMoney = (goalId: string) => {
    Alert.prompt(
      'Add Money',
      'How much would you like to add to this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (text?: string) => {
            const amount = parseFloat(text || '0');
            if (amount > 0) {
              try {
                await GoalsService.addMoneyToGoal(goalId, amount);
                await loadGoals();
              } catch (error) {
                Alert.alert('Error', 'Failed to add money to goal');
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
          <Text style={styles.goalTarget} numberOfLines={1} adjustsFontSizeToFit>of {formatCurrency(goal.targetAmount)}</Text>
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
          <Text style={styles.goalDate}>Target: {goal.targetDate}</Text>
          <Text style={[
            styles.daysLeft,
            { color: daysLeft < 30 ? '#FF9500' : theme.colors.textSecondary }
          ]}>
            {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.completedText}>Completed!</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Savings Goals</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalGoals}</Text>
            <Text style={styles.summaryLabel}>Total Goals</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.completedGoals}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalSaved)}</Text>
            <Text style={styles.summaryLabel}>Total Saved</Text>
          </View>
        </View>

        {/* Goals List */}
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
              <Text style={styles.emptyTitle}>No Goals Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first savings goal to start tracking your progress
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addButtonText}>Add Your First Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.goalsContainer}>
              {goals.map(renderGoalCard)}
            </View>
          )}
        </ScrollView>
      </LinearGradient>

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
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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