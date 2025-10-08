import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BorrowedMoney } from '../types';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import TransferModal from '../components/TransferModal';
import BorrowedMoneyDetailsModal from '../components/BorrowedMoneyDetailsModal';
import AddBorrowedMoneyModal from '../components/AddBorrowedMoneyModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import borrowedMoneyService from '../services/borrowedMoneyService';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';
import { hybridDataService, HybridWallet, HybridTransaction } from '../services/hybridDataService';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, formatCurrency: formatCurrencyLoc } = useLocalization();
  const { headerPadding } = useSafeAreaHelper();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBorrowedMoneyDetailsModal, setShowBorrowedMoneyDetailsModal] = useState(false);
  const [showAddBorrowedMoneyModal, setShowAddBorrowedMoneyModal] = useState(false);
  const [selectedBorrowedMoney, setSelectedBorrowedMoney] = useState<BorrowedMoney | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [borrowedMoneyList, setBorrowedMoneyList] = useState<BorrowedMoney[]>([]);
  const [totalBorrowedAmount, setTotalBorrowedAmount] = useState(0);
  const [wallets, setWallets] = useState<HybridWallet[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<HybridTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Animation values for swipeable balance
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoadingData(true);
      await Promise.all([
        loadWalletData(),
        loadTransactionData(),
        loadBorrowedMoneyData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const fetchedWallets = await hybridDataService.getWallets();
      setWallets(fetchedWallets);
      const balance = await hybridDataService.getWalletBalance();
      setTotalBalance(balance);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const loadTransactionData = async () => {
    try {
      const transactions = await hybridDataService.getRecentTransactions(5);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error loading transaction data:', error);
    }
  };

  const loadBorrowedMoneyData = async () => {
    try {
      const unpaidBorrowedMoney = await borrowedMoneyService.getUnpaidBorrowedMoney();
      const totalAmount = await borrowedMoneyService.getTotalBorrowedAmount();
      setBorrowedMoneyList(unpaidBorrowedMoney);
      setTotalBorrowedAmount(totalAmount);
    } catch (error) {
      console.error('Error loading borrowed money data:', error);
      // Fallback to empty data
      setBorrowedMoneyList([]);
      setTotalBorrowedAmount(0);
    }
  };
  
  // Get the three main wallets: cash, bank, savings - convert types to lowercase for compatibility
  const walletTypes = ['CASH', 'BANK', 'SAVINGS'] as const;
  const sortedWallets = walletTypes.map(type => 
    wallets.find(wallet => wallet.type === type)
  ).filter(Boolean);
  
  const getWalletDisplayName = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CASH': return 'Pocket Money';
      case 'BANK': return 'Bank Account';
      case 'SAVINGS': return 'Savings';
      default: return 'Total Balance';
    }
  };
  
  const getWalletIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CASH': return 'wallet-outline';
      case 'BANK': return 'card-outline';
      case 'SAVINGS': return 'shield-checkmark-outline';
      default: return 'cash-outline';
    }
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };
  
  const switchToWallet = (index: number) => {
    const safeIndex = Math.min(index, displayWallets.length - 1);
    setCurrentWalletIndex(safeIndex);
    // Animate the scale back to normal
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };
  
  // PanResponder for handling swipe gestures
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to horizontal swipes
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderMove: (_, gestureState) => {
      // Scale down slightly during gesture
      const scaleValue = 1 - (Math.abs(gestureState.dx) / 1000);
      scaleAnim.setValue(Math.max(scaleValue, 0.9));
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx, vx } = gestureState;
      const swipeThreshold = 50;
      const velocityThreshold = 0.5;
      
      if (Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold) {
        if (dx > 0 || vx > velocityThreshold) {
          // Swipe right - previous wallet
          const prevIndex = Math.max(currentWalletIndex - 1, 0);
          switchToWallet(prevIndex);
        } else if (dx < 0 || vx < -velocityThreshold) {
          // Swipe left - next wallet
          const nextIndex = Math.min(currentWalletIndex + 1, displayWallets.length - 1);
          switchToWallet(nextIndex);
        }
      } else {
        // Return to normal scale if no swipe detected
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }).start();
      }
    },
  });

  // Ensure we have at least one wallet to display
  const displayWallets = sortedWallets.length > 0 ? sortedWallets : wallets.slice(0, 3);
  const currentWallet = displayWallets[currentWalletIndex] || displayWallets[0];

  const handleAddExpense = async (expense: any) => {
    try {
      await hybridDataService.createTransaction({
        amount: expense.amount,
        description: expense.title || expense.description,
        type: 'EXPENSE',
        walletId: expense.walletId,
        date: expense.date,
        notes: expense.notes,
        categoryId: expense.categoryId
      });
      
      // Refresh data after adding expense
      await loadAllData();
      console.log('Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleTransfer = async (success: boolean) => {
    if (success) {
      // Refresh data after successful transfer
      await loadAllData();
      console.log('Transfer completed successfully');
    }
  };

  const handleAddIncome = async (income: any) => {
    try {
      await hybridDataService.createTransaction({
        amount: income.amount,
        description: income.title || income.description,
        type: 'INCOME',
        walletId: income.walletId,
        date: income.date,
        notes: income.notes
      });
      
      // Refresh data after adding income
      await loadAllData();
      console.log('Income added successfully');
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAllData().then(() => {
      setRefreshing(false);
      console.log('All data refreshed');
    }).catch((error) => {
      console.error('Error refreshing data:', error);
      setRefreshing(false);
    });
  }, []);

  const handleBorrowedMoneyPress = (item: BorrowedMoney) => {
    setSelectedBorrowedMoney(item);
    setShowBorrowedMoneyDetailsModal(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await borrowedMoneyService.markAsPaid(id);
      await loadBorrowedMoneyData();
      setShowBorrowedMoneyDetailsModal(false);
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleEditBorrowedMoney = async (editedItem: BorrowedMoney) => {
    try {
      await borrowedMoneyService.updateBorrowedMoney(editedItem.id, editedItem);
      await loadBorrowedMoneyData();
    } catch (error) {
      console.error('Error updating borrowed money:', error);
    }
  };

  const handleDeleteBorrowedMoney = async (id: string) => {
    try {
      await borrowedMoneyService.deleteBorrowedMoney(id);
      await loadBorrowedMoneyData();
    } catch (error) {
      console.error('Error deleting borrowed money:', error);
    }
  };

  const handleAddBorrowedMoney = async (newItem: Omit<BorrowedMoney, 'id'>) => {
    try {
      await borrowedMoneyService.addBorrowedMoney(newItem);
      await loadBorrowedMoneyData();
    } catch (error) {
      console.error('Error adding borrowed money:', error);
    }
  };

  const handleAddBorrowedMoneyWithReminder = async (newItem: Omit<BorrowedMoney, 'id'>) => {
    try {
      const newBorrowedMoney = await borrowedMoneyService.addBorrowedMoney(newItem);
      await loadBorrowedMoneyData();
      
      // Navigate to reminders screen to set up the reminder
      (navigation as any).navigate('Reminders', { 
        newReminder: {
          title: `Payment due from ${newItem.personName}`,
          amount: newItem.amount,
          dueDate: newItem.dueDate,
          type: 'borrowed_money',
          relatedId: newBorrowedMoney.id,
        }
      });
    } catch (error) {
      console.error('Error adding borrowed money with reminder:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyLoc(amount);
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderBorrowedMoneyCard = (item: BorrowedMoney) => {
    const overdue = isOverdue(item.dueDate);
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.walletCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleBorrowedMoneyPress(item)}
      >
        <View style={styles.walletHeader}>
          <View style={[styles.walletIcon, { backgroundColor: overdue ? '#FF3B30' : '#FF9500' }]}>
            <Ionicons 
              name={overdue ? 'warning' : 'person'} 
              size={20} 
              color="white" 
            />
          </View>
          <Text style={[styles.walletName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.personName}
          </Text>
        </View>
        <Text style={[styles.walletBalance, { color: theme.colors.text }]}>
          {formatCurrency(item.amount)}
        </Text>
        <View style={styles.borrowedMoneyInfo}>
          <Text style={[styles.borrowedReason, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.reason}
          </Text>
          <Text style={[
            styles.borrowedDueDate, 
            { color: overdue ? '#FF3B30' : theme.colors.textSecondary }
          ]}>
            Due: {formatDate(item.dueDate)}
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.transferButton, 
            { backgroundColor: overdue ? '#FF3B30' : theme.isDark ? theme.colors.border : '#F2F2F7' }
          ]}
          onPress={() => handleBorrowedMoneyPress(item)}
        >
          <Text style={[
            styles.transferButtonText, 
            { color: overdue ? 'white' : theme.colors.primary }
          ]}>
            {overdue ? 'Overdue' : 'Details'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTransactionItem = (transaction: HybridTransaction) => {
    // Get transaction emoji based on type or description
    const getTransactionEmoji = (type: string, description?: string) => {
      if (type === 'INCOME') return '💰';
      if (type === 'TRANSFER') return '🔄';
      
      // For expenses, try to guess based on description
      const desc = description?.toLowerCase() || '';
      if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) return '🍔';
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('electricity') || desc.includes('utility')) return '💡';
      if (desc.includes('netflix') || desc.includes('subscription') || desc.includes('spotify')) return '📱';
      if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi')) return '🚗';
      return '💳';
    };

    const formatTransactionDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    };

    return (
      <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: theme.colors.background }]}>
            <Text style={styles.transactionEmoji}>
              {getTransactionEmoji(transaction.type, transaction.description)}
            </Text>
          </View>
          <View>
            <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>
              {transaction.description || `${transaction.type.toLowerCase()} transaction`}
            </Text>
            <Text style={[styles.transactionCategory, { color: theme.colors.textSecondary }]}>
              {formatTransactionDate(transaction.date)}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.type === 'INCOME' ? theme.colors.success : '#FF3B30' }
        ]}>
          {transaction.type === 'INCOME' ? '+' : transaction.type === 'TRANSFER' ? '↔' : ''}{formatCurrency(transaction.amount)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {loadingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading your data...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]} // Android
                tintColor={theme.colors.primary} // iOS
              />
            }
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: theme.colors.text }]}>{t('good_morning')}</Text>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Swipeable Balance Card */}
          <Animated.View 
            style={[
              styles.balanceCard, 
              { backgroundColor: theme.colors.surface, transform: [{ scale: scaleAnim }] }
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.balanceHeader}>
              <View style={styles.walletTypeInfo}>
                <Ionicons 
                  name={getWalletIcon(currentWallet?.type || 'cash')} 
                  size={20} 
                  color={currentWallet?.color || theme.colors.primary}
                  style={styles.walletTypeIcon}
                />
                <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
                  {getWalletDisplayName(currentWallet?.type || 'cash')}
                </Text>
              </View>
              <View style={styles.walletIndicators}>
                {displayWallets.map((wallet, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => switchToWallet(index)}
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: index === currentWalletIndex 
                          ? currentWallet?.color || theme.colors.primary
                          : theme.colors.border,
                        width: index === currentWalletIndex ? 12 : 8,
                        height: index === currentWalletIndex ? 12 : 8,
                        borderRadius: index === currentWalletIndex ? 6 : 4,
                      }
                    ]}
                  />
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={toggleBalanceVisibility} style={styles.balanceRow}>
              <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
                {isBalanceVisible ? formatCurrency(currentWallet?.balance || 0) : '••••••'}
              </Text>
              <Ionicons 
                name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} 
                size={20} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
            {isBalanceVisible && (
              <Text style={[styles.totalBalanceHint, { color: theme.colors.textSecondary }]}>
                Total: {formatCurrency(totalBalance)}
              </Text>
            )}
            <View style={styles.swipeHint}>
              <Text style={[styles.swipeHintText, { color: theme.colors.textSecondary }]}>
                Swipe left/right to switch wallets
              </Text>
              <Ionicons 
                name="swap-horizontal-outline" 
                size={16} 
                color={theme.colors.textSecondary} 
              />
            </View>
          </Animated.View>

          {/* Borrowed Money Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Borrowed Money</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('BorrowedMoneyHistory')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {borrowedMoneyList.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
                  {borrowedMoneyList.slice(0, 5).map(renderBorrowedMoneyCard)}
                </ScrollView>
                <View style={[styles.totalBorrowedCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.totalBorrowedHeader}>
                    <Ionicons name="people" size={20} color={theme.colors.warning} />
                    <Text style={[styles.totalBorrowedLabel, { color: theme.colors.textSecondary }]}>
                      Total Amount Owed to You
                    </Text>
                  </View>
                  <Text style={[styles.totalBorrowedAmount, { color: theme.colors.warning }]}>
                    {formatCurrency(totalBorrowedAmount)}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.addBorrowedButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowAddBorrowedMoneyModal(true)}
                  >
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={styles.addBorrowedButtonText}>Add New</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={[styles.emptyBorrowedMoney, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyBorrowedTitle, { color: theme.colors.text }]}>
                  No borrowed money records
                </Text>
                <Text style={[styles.emptyBorrowedSubtitle, { color: theme.colors.textSecondary }]}>
                  Keep track of money you've lent to others
                </Text>
                <TouchableOpacity 
                  style={[styles.addBorrowedButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowAddBorrowedMoneyModal(true)}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addBorrowedButtonText}>Add First Record</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('quick_actions')}</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowAddExpenseModal(true)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#4A90E2' }]}>
                  <Ionicons name="add" size={24} color="white" />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.text }]}>{t('add_expense')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowTransferModal(true)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#7ED321' }]}>
                  <Ionicons name="swap-horizontal" size={24} color="white" />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.text }]}>{t('transfer')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => (navigation as any).navigate('AddIncome')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FF9500' }]}>
                  <Ionicons name="trending-up" size={24} color="white" />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.text }]}>{t('add_income')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('recent_transactions')}</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.transactionsList, { backgroundColor: theme.colors.surface }]}>
              {recentTransactions.map(renderTransactionItem)}
            </View>
          </View>

          {/* Smart Tip */}
          <View style={[styles.tipCard, { 
            backgroundColor: theme.isDark ? theme.colors.card : '#FFF9E6',
            borderLeftColor: theme.colors.warning 
          }]}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{t('smart_tip')}</Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>You spent 20% less this week than last week. Keep it up!</Text>
            </View>
            </View>
          </ScrollView>
        )}

        {/* Add Expense Modal */}
        <AddExpenseModal
          visible={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          onAddExpense={handleAddExpense}
        />

        {/* Transfer Modal */}
        <TransferModal
          visible={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransfer}
        />

        {/* Add Income Modal */}
        <AddIncomeModal
          visible={showAddIncomeModal}
          onClose={() => setShowAddIncomeModal(false)}
          onAddIncome={handleAddIncome}
        />

        {/* Borrowed Money Details Modal */}
        <BorrowedMoneyDetailsModal
          visible={showBorrowedMoneyDetailsModal}
          onClose={() => setShowBorrowedMoneyDetailsModal(false)}
          borrowedMoney={selectedBorrowedMoney}
          onMarkAsPaid={handleMarkAsPaid}
          onEdit={handleEditBorrowedMoney}
          onDelete={handleDeleteBorrowedMoney}
        />

        {/* Add Borrowed Money Modal */}
        <AddBorrowedMoneyModal
          visible={showAddBorrowedMoneyModal}
          onClose={() => setShowAddBorrowedMoneyModal(false)}
          onAdd={handleAddBorrowedMoney}
          onAddWithReminder={handleAddBorrowedMoneyWithReminder}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTypeIcon: {
    marginRight: 8,
  },
  walletIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  totalBalanceHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  swipeHintText: {
    fontSize: 12,
    marginRight: 6,
    fontStyle: 'italic',
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
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  walletsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  walletCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  walletName: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  transferButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  transferButtonText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionEmoji: {
    fontSize: 18,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  tipIcon: {
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  borrowedMoneyInfo: {
    marginBottom: 8,
  },
  borrowedReason: {
    fontSize: 12,
    marginBottom: 2,
  },
  borrowedDueDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  totalBorrowedCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  totalBorrowedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalBorrowedLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  totalBorrowedAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addBorrowedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBorrowedButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyBorrowedMoney: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyBorrowedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyBorrowedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;