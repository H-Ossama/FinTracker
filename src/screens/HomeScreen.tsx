import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mockWallets, getTotalBalance, getRecentTransactions } from '../data/mockData';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import TransferModal from '../components/TransferModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

const HomeScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { t, formatCurrency: formatCurrencyLoc } = useLocalization();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  
  const totalBalance = getTotalBalance();
  const recentTransactions = getRecentTransactions(5);
  
  // Animation values for swipeable balance
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Get the three main wallets: pocket, bank, savings
  const walletTypes = ['cash', 'bank', 'savings'] as const;
  const sortedWallets = walletTypes.map(type => 
    mockWallets.find(wallet => wallet.type === type)
  ).filter(Boolean);
  
  const getWalletDisplayName = (type: string) => {
    switch (type) {
      case 'cash': return 'Pocket Money';
      case 'bank': return 'Bank Account';
      case 'savings': return 'Savings';
      default: return 'Total Balance';
    }
  };
  
  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'cash': return 'wallet-outline';
      case 'bank': return 'card-outline';
      case 'savings': return 'shield-checkmark-outline';
      default: return 'cash-outline';
    }
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };
  
  const switchToWallet = (index: number) => {
    setCurrentWalletIndex(index);
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
          const nextIndex = Math.min(currentWalletIndex + 1, sortedWallets.length - 1);
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

  
  const currentWallet = sortedWallets[currentWalletIndex];

  const handleAddExpense = (expense: any) => {
    // In a real app, this would add the expense to the data store
    console.log('Adding expense:', expense);
    // You could also show a success message here
  };

  const handleTransfer = (transfer: any) => {
    // In a real app, this would process the transfer between wallets
    console.log('Processing transfer:', transfer);
    // You could also show a success message here
  };

  const handleAddIncome = (income: any) => {
    // In a real app, this would add the income to the data store
    console.log('Adding income:', income);
    // You could also show a success message here
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setRefreshing(false);
      // In a real app, you would refresh the data from your data source
      console.log('Data refreshed');
    }, 2000);
  }, []);

  const formatCurrency = (amount: number) => {
    return formatCurrencyLoc(amount);
  };

  const renderWalletCard = (wallet: any) => (
    <View key={wallet.id} style={[styles.walletCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.walletHeader}>
        <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
          <Ionicons 
            name={wallet.type === 'bank' ? 'card' : wallet.type === 'cash' ? 'cash' : 'wallet'} 
            size={20} 
            color="white" 
          />
        </View>
        <Text style={[styles.walletName, { color: theme.colors.textSecondary }]}>{wallet.name}</Text>
      </View>
      <Text style={[styles.walletBalance, { color: theme.colors.text }]}>{formatCurrency(wallet.balance)}</Text>
      <TouchableOpacity 
        style={[styles.transferButton, { backgroundColor: theme.isDark ? theme.colors.border : '#F2F2F7' }]}
        onPress={() => setShowTransferModal(true)}
      >
        <Text style={[styles.transferButtonText, { color: theme.colors.primary }]}>Transfer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransactionItem = (transaction: any) => (
    <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.transactionEmoji}>
            {transaction.category === 'Food' ? '🍔' : 
             transaction.category === 'Utilities' ? '💡' : 
             transaction.category === 'Subscriptions' ? '📱' : 
             transaction.category === 'Income' ? '💰' : '💳'}
          </Text>
        </View>
        <View>
          <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>{transaction.title}</Text>
          <Text style={[styles.transactionCategory, { color: theme.colors.textSecondary }]}>{transaction.category}</Text>
        </View>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.type === 'income' ? theme.colors.success : '#FF3B30' }
      ]}>
        {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
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
                {sortedWallets.map((wallet, index) => (
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

          {/* Wallets Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('my_wallets')}</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
              {mockWallets.map(renderWalletCard)}
            </ScrollView>
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
                onPress={() => navigation.navigate('AddIncome')}
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
});

export default HomeScreen;