import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { budgetService } from '../services/budgetService';
import { Budget, BudgetCategory, MonthlyBudgetSummary } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useInterstitialAd } from '../components/InterstitialAd';
import AdBanner from '../components/AdBanner';
import { useAds } from '../contexts/AdContext';

const { width: screenWidth } = Dimensions.get('window');

const BudgetPlannerScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { adsEnabled, shouldShowBanner } = useAds();
  const { showInterstitialIfNeeded, InterstitialComponent } = useInterstitialAd('BudgetPlanner');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyBudgetSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Add budget form state
  const [newBudget, setNewBudget] = useState({
    categoryId: '',
    categoryName: '',
    budgetAmount: '',
    warningThreshold: 80,
    notes: '',
  });

  const styles = createStyles(theme);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Show interstitial ad on first visit (free users only)
      showInterstitialIfNeeded();
    }, [selectedMonth])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      if (__DEV__) {
        console.log('🔄 Loading budget data for month:', selectedMonth);
      }
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout')), 10000);
      });
      
      const loadPromise = (async () => {
        // Initialize categories first
        await budgetService.initializeCategories();
        if (__DEV__) {
          console.log('✅ Budget categories initialized');
        }
        
        // Load all data
        const [budgetsData, categoriesData, summaryData, analyticsData] = await Promise.all([
          budgetService.getBudgetsByMonth(selectedMonth),
          budgetService.getBudgetCategories(),
          budgetService.getMonthlyBudgetSummary(selectedMonth),
          budgetService.getBudgetAnalytics(selectedMonth),
        ]);
        
        if (__DEV__) {
          console.log('📊 Loaded budget data:', { 
            budgetsCount: budgetsData.length, 
            categoriesCount: categoriesData.length,
            month: selectedMonth
          });
        }
        
        return { budgetsData, categoriesData, summaryData, analyticsData };
      })();
      
      const result = await Promise.race([loadPromise, timeoutPromise]) as {
        budgetsData: Budget[];
        categoriesData: BudgetCategory[];
        summaryData: MonthlyBudgetSummary;
        analyticsData: any;
      };
      
      setBudgets(result.budgetsData);
      setCategories(result.categoriesData);
      setMonthlySummary(result.summaryData);
      setAnalytics(result.analyticsData);
    } catch (error) {
      console.error('❌ Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Set empty data to prevent infinite loading
      setBudgets([]);
      setCategories([]);
      setMonthlySummary(null);
      setAnalytics(null);
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log('✅ Budget loading complete');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddBudget = async () => {
    try {
      if (!newBudget.categoryId || !newBudget.budgetAmount) {
        Alert.alert('Error', 'Please select a category and enter a budget amount');
        return;
      }

      const category = categories.find(c => c.id === newBudget.categoryId);
      if (!category) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      await budgetService.createBudget({
        categoryId: newBudget.categoryId,
        categoryName: category.name,
        monthYear: selectedMonth,
        budgetAmount: parseFloat(newBudget.budgetAmount),
        warningThreshold: newBudget.warningThreshold,
        notes: newBudget.notes,
      });

      setShowAddModal(false);
      resetForm();
      await loadData();
      Alert.alert('Success', 'Budget created successfully!');
    } catch (error) {
      console.error('Error adding budget:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add budget');
    }
  };

  const handleDeleteBudget = async (budget: Budget) => {
    try {
      Alert.alert(
        'Delete Budget',
        `Are you sure you want to delete the budget for "${budget.categoryName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await budgetService.deleteBudget(budget.id);
              await loadData();
              Alert.alert('Success', 'Budget deleted!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting budget:', error);
      Alert.alert('Error', 'Failed to delete budget');
    }
  };

  const handleUpdateBudget = async (budgetId: string, newAmount: number) => {
    try {
      await budgetService.updateBudget(budgetId, { budgetAmount: newAmount });
      await loadData();
    } catch (error) {
      console.error('Error updating budget:', error);
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const resetForm = () => {
    setNewBudget({
      categoryId: '',
      categoryName: '',
      budgetAmount: '',
      warningThreshold: 80,
      notes: '',
    });
  };

  const getStatusColor = (status: Budget['status']) => {
    switch (status) {
      case 'exceeded': return '#FF6B6B';
      case 'warning': return '#FFB02E';
      case 'on-track': return '#4ECDC4';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: Budget['status']) => {
    switch (status) {
      case 'exceeded': return 'warning';
      case 'warning': return 'alert-circle';
      case 'on-track': return 'checkmark-circle';
      default: return 'ellipse';
    }
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      // Use local year/month (avoid UTC conversion causing duplicates around timezone offsets)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${month}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: monthYear, label: monthName, key: `month-${monthYear}` });
    }
    return months;
  };

  const getProgressPercentage = (spent: number, budget: number): number => {
    return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  };

  const preparePieChartData = () => {
    if (!budgets.length) return [];

    return budgets
      .filter(budget => budget.spentAmount > 0)
      .map(budget => {
        const category = categories.find(c => c.id === budget.categoryId);
        return {
          name: budget.categoryName,
          amount: budget.spentAmount,
          color: category?.color || theme.colors.primary,
          legendFontColor: theme.colors.text,
          legendFontSize: 12,
        };
      });
  };

  const renderOverviewCard = () => {
    if (!monthlySummary) return null;

    const statusColor = getStatusColor(monthlySummary.status);
    const spentPercentage = monthlySummary.totalBudget > 0 
      ? (monthlySummary.totalSpent / monthlySummary.totalBudget) * 100 
      : 0;

    return (
      <View style={[styles.overviewCard, { backgroundColor: theme.colors.card }]}>
        <LinearGradient
          colors={[theme.colors.card, theme.colors.surface + '80']}
          style={styles.overviewGradient}
        >
          <Text style={[styles.overviewTitle, { color: theme.colors.text }]}>
            Budget Overview - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { color: theme.colors.text }]}>
                {formatCurrency(monthlySummary.totalSpent)}
              </Text>
              <Text style={[styles.overviewStatLabel, { color: theme.colors.textSecondary }]}>
                Spent
              </Text>
            </View>

            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { color: theme.colors.text }]}>
                {formatCurrency(monthlySummary.totalBudget)}
              </Text>
              <Text style={[styles.overviewStatLabel, { color: theme.colors.textSecondary }]}>
                Budgeted
              </Text>
            </View>

            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { 
                color: monthlySummary.totalRemaining >= 0 ? '#4ECDC4' : '#FF6B6B' 
              }]}>
                {formatCurrency(monthlySummary.totalRemaining)}
              </Text>
              <Text style={[styles.overviewStatLabel, { color: theme.colors.textSecondary }]}>
                {monthlySummary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(spentPercentage, 100)}%`,
                    backgroundColor: statusColor 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {spentPercentage.toFixed(1)}% of budget used
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={getStatusIcon(monthlySummary.status) as any} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {monthlySummary.status === 'on-track' ? 'On Track' : 
               monthlySummary.status === 'warning' ? 'Warning' : 'Exceeded'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderBudgetCard = (budget: Budget) => {
    const category = categories.find(c => c.id === budget.categoryId);
    const progressPercentage = getProgressPercentage(budget.spentAmount, budget.budgetAmount);
    const statusColor = getStatusColor(budget.status);

    return (
      <TouchableOpacity 
        key={budget.id} 
        style={[styles.budgetCard, { backgroundColor: theme.colors.card }]}
      >
        <LinearGradient
          colors={[theme.colors.card, theme.colors.surface + '50']}
          style={styles.budgetCardGradient}
        >
          <View style={styles.budgetHeader}>
            <View style={styles.budgetMainInfo}>
              <View style={[styles.categoryIcon, { backgroundColor: category?.color + '20' }]}>
                <Ionicons 
                  name={category?.icon as any || 'folder'} 
                  size={24} 
                  color={category?.color || theme.colors.primary} 
                />
              </View>
              <View style={styles.budgetDetails}>
                <Text style={[styles.budgetTitle, { color: theme.colors.text }]}>
                  {budget.categoryName}
                </Text>
                <View style={styles.budgetAmounts}>
                  <Text style={[styles.spentAmount, { color: theme.colors.text }]}>
                    {formatCurrency(budget.spentAmount)}
                  </Text>
                  <Text style={[styles.budgetAmount, { color: theme.colors.textSecondary }]}>
                    of {formatCurrency(budget.budgetAmount)}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteBudget(budget)}
            >
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: statusColor 
                  }
                ]} 
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                {progressPercentage.toFixed(1)}%
              </Text>
              <Text style={[styles.remainingText, { 
                color: budget.remainingAmount >= 0 ? '#4ECDC4' : '#FF6B6B' 
              }]}>
                {budget.remainingAmount >= 0 ? 'remaining' : 'over'}: {formatCurrency(Math.abs(budget.remainingAmount))}
              </Text>
            </View>
          </View>

          <View style={styles.budgetFooter}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={getStatusIcon(budget.status) as any} size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {budget.status === 'on-track' ? 'On Track' : 
                 budget.status === 'warning' ? 'Warning' : 'Exceeded'}
              </Text>
            </View>
            
            <Text style={[styles.transactionCount, { color: theme.colors.textSecondary }]}>
              {budget.transactions.length} transactions
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderChart = () => {
    const chartData = preparePieChartData();
    
    if (chartData.length === 0) {
      return (
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Spending Distribution</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="pie-chart-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyChartText, { color: theme.colors.textSecondary }]}>
              No spending data for this month
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Spending Distribution</Text>
        <PieChart
          data={chartData}
          width={screenWidth - 80}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
        />
      </View>
    );
  };

  const renderQuickActions = () => {
    return (
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Add Budget</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={async () => {
            // Copy from previous month
            const previousMonth = new Date(selectedMonth + '-01');
            previousMonth.setMonth(previousMonth.getMonth() - 1);
            const prevMonthStr = previousMonth.toISOString().slice(0, 7);
            
            try {
              await budgetService.copyBudgetsToNextMonth(prevMonthStr, selectedMonth);
              await loadData();
              Alert.alert('Success', 'Budgets copied from previous month!');
            } catch (error) {
              Alert.alert('Error', 'Failed to copy budgets');
            }
          }}
        >
          <Ionicons name="copy" size={20} color={theme.colors.text} />
          <Text style={[styles.quickActionSecondaryText, { color: theme.colors.text }]}>Copy Previous</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAddBudgetModal = () => {
    return (
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Budget</Text>
            <TouchableOpacity onPress={handleAddBudget}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories
                  .filter(cat => !budgets.some(b => b.categoryId === cat.id))
                  .map((category, index) => (
                    <TouchableOpacity
                      key={`category-${category.id}-${index}`}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: newBudget.categoryId === category.id ? category.color + '20' : theme.colors.surface,
                          borderColor: newBudget.categoryId === category.id ? category.color : theme.colors.border,
                        },
                      ]}
                      onPress={() => setNewBudget({ ...newBudget, categoryId: category.id, categoryName: category.name })}
                    >
                      <Ionicons name={category.icon as any} size={20} color={category.color} />
                      <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
              {budgets.length === categories.length && (
                <Text style={[styles.noMoreCategoriesText, { color: theme.colors.textSecondary }]}>
                  All categories have budgets. Delete a budget to add a new one.
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Budget Amount *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newBudget.budgetAmount}
                onChangeText={(text) => setNewBudget({ ...newBudget, budgetAmount: text })}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Warning Threshold (%)</Text>
              <View style={styles.thresholdOptions}>
                {[70, 80, 90].map((threshold, index) => (
                  <TouchableOpacity
                    key={`threshold-${threshold}-${index}`}
                    style={[
                      styles.thresholdOption,
                      {
                        backgroundColor: newBudget.warningThreshold === threshold ? theme.colors.primary : theme.colors.surface,
                        borderColor: newBudget.warningThreshold === threshold ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewBudget({ ...newBudget, warningThreshold: threshold })}
                  >
                    <Text
                      style={[
                        styles.thresholdOptionText,
                        {
                          color: newBudget.warningThreshold === threshold ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {threshold}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newBudget.notes}
                onChangeText={(text) => setNewBudget({ ...newBudget, notes: text })}
                placeholder="Optional notes about this budget"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderMonthPicker = () => {
    const monthOptions = generateMonthOptions();
    
    return (
      <Modal
        visible={showMonthPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.monthPickerOverlay}>
          <View style={[styles.monthPickerContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.monthPickerHeader}>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Text style={[styles.monthPickerCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.monthPickerTitle, { color: theme.colors.text }]}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Text style={[styles.monthPickerDone, { color: theme.colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.monthPickerScroll}>
              {monthOptions.map((month) => (
                <TouchableOpacity
                  key={month.key}
                  style={[
                    styles.monthPickerOption,
                    {
                      backgroundColor: selectedMonth === month.value ? theme.colors.primary + '20' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedMonth(month.value);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthPickerOptionText,
                      {
                        color: selectedMonth === month.value ? theme.colors.primary : theme.colors.text,
                        fontWeight: selectedMonth === month.value ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {month.label}
                  </Text>
                  {selectedMonth === month.value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            onPress={() => navigation.navigate('UserProfile')}
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
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setShowMonthPicker(true)}
              style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowAddModal(true)}
              style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
            >
              <Ionicons name="add" size={22} color={theme.colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.headerTitleSection}>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Budget Planner</Text>
          <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.monthSelector}>
            <Text style={[styles.headerSubtitle, { color: theme.colors.headerTextSecondary }]}>
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.headerTextSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* White Content Section */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview */}
          {renderOverviewCard()}

          {/* Chart */}
          {renderChart()}

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Budgets List */}
          <View style={styles.budgetsList}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category Budgets</Text>
            
            {budgets.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No budgets yet</Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                  Create your first budget to start tracking spending by category
                </Text>
                <TouchableOpacity
                  style={[styles.addFirstBudgetButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addFirstBudgetText}>Create Your First Budget</Text>
                </TouchableOpacity>
              </View>
            ) : (
              budgets.map(renderBudgetCard)
            )}
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Modals */}
      {renderAddBudgetModal()}
      {renderMonthPicker()}

      {/* Banner Ad for free users */}
      {adsEnabled && shouldShowBanner('BudgetPlanner') && (
        <View style={styles.bannerAdContainer}>
          <AdBanner screenName="BudgetPlanner" />
        </View>
      )}

      {/* Interstitial Ad Modal */}
      <InterstitialComponent />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerAdContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  darkHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  overviewCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overviewGradient: {
    padding: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overviewStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  budgetsList: {
    paddingBottom: 20,
  },
  budgetCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  budgetCardGradient: {
    padding: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  budgetDetails: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  spentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  budgetAmount: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '50',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionCount: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addFirstBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstBudgetText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 8,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  noMoreCategoriesText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
  },
  thresholdOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  thresholdOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Month picker styles
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  monthPickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  monthPickerCancel: {
    fontSize: 16,
  },
  monthPickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthPickerScroll: {
    maxHeight: 300,
  },
  monthPickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  monthPickerOptionText: {
    fontSize: 16,
  },
});

export default BudgetPlannerScreen;