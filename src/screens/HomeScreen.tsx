import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BorrowedMoney } from '../types';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import TransferModal from '../components/TransferModal';
import BorrowedMoneyDetailsModal from '../components/BorrowedMoneyDetailsModal';
import AddBorrowedMoneyModal from '../components/AddBorrowedMoneyModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNotification } from '../contexts/NotificationContext';
import borrowedMoneyService from '../services/borrowedMoneyService';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';
import { useWalletVisibility } from '../hooks/useWalletVisibility';
import { hybridDataService, HybridWallet, HybridTransaction } from '../services/hybridDataService';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, formatCurrency: formatCurrencyLoc } = useLocalization();
  const { state: notificationState, addNotification } = useNotification();
  const { headerPadding } = useSafeAreaHelper();
  const { formatWalletBalance, shouldShowBalance } = useWalletVisibility();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBorrowedMoneyDetailsModal, setShowBorrowedMoneyDetailsModal] = useState(false);
  const [showAddBorrowedMoneyModal, setShowAddBorrowedMoneyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBorrowedMoneyForPayment, setSelectedBorrowedMoneyForPayment] = useState<BorrowedMoney | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
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
    addSampleNotifications();
  }, []);

  // Reload data when screen comes into focus (e.g., after bill payment)
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const addSampleNotifications = () => {
    // Only add sample notifications if there are no existing notifications
    if (notificationState.inAppNotifications.length === 0) {
      // Add a test notification first
      setTimeout(() => {
        addNotification({
          title: 'Testing',
          message: 'This is a test notification to verify functionality works correctly.',
          type: 'info',
          read: false,
        });
      }, 500);

      // Add other sample notifications
      setTimeout(() => {
        addNotification({
          title: 'Welcome to FinTracker!',
          message: 'Start tracking your finances and achieve your goals.',
          type: 'success',
          read: false,
        });
      }, 1000);

      setTimeout(() => {
        addNotification({
          title: 'Budget Alert',
          message: 'You have spent 80% of your dining budget this month.',
          type: 'warning',
          read: false,
        });
      }, 1500);
    }
  };

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
      case 'CASH': return t('pocket_money');
      case 'BANK': return t('bank_account');
      case 'SAVINGS': return t('savings');
      default: return t('total_balance');
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

  const processPayment = async () => {
    if (!selectedBorrowedMoneyForPayment || !selectedWallet) return;
    
    try {
      setShowPaymentModal(false);
      await borrowedMoneyService.markAsPaid(selectedBorrowedMoneyForPayment.id, selectedWallet);
      await loadBorrowedMoneyData();
      await loadAllData();
      setShowBorrowedMoneyDetailsModal(false);
      setSelectedBorrowedMoneyForPayment(null);
      Alert.alert('Success', `Payment of ${formatCurrency(selectedBorrowedMoneyForPayment.amount)} received from ${selectedBorrowedMoneyForPayment.personName}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const borrowedMoney = await borrowedMoneyService.getBorrowedMoneyById(id);
      if (!borrowedMoney) {
        Alert.alert('Error', 'Borrowed money record not found');
        return;
      }

      if (wallets.length === 0) {
        Alert.alert('No Wallets', 'You need to have at least one wallet to receive the payment.');
        return;
      }

      // If only one wallet, use it automatically
      if (wallets.length === 1) {
        await borrowedMoneyService.markAsPaid(id, wallets[0].id);
        await loadBorrowedMoneyData();
        await loadAllData();
        setShowBorrowedMoneyDetailsModal(false);
        Alert.alert('Success', `Payment of ${formatCurrency(borrowedMoney.amount)} received from ${borrowedMoney.personName}`);
        return;
      }

      // Multiple wallets - show styled modal
      setSelectedBorrowedMoneyForPayment(borrowedMoney);
      setSelectedWallet(wallets[0].id); // Default to first wallet
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error marking borrowed money as paid:', error);
      Alert.alert('Error', 'Failed to mark as paid');
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
      
      // Reminder will be handled internally without navigating to reminders screen
      console.log(`Borrowed money added with reminder: ${newBorrowedMoney.id}`);
    } catch (error) {
      console.error('Error adding borrowed money with reminder:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t('no_date');
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
            {t('due')}: {formatDate(item.dueDate)}
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
            {overdue ? t('overdue') : t('details')}
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
      
      if (diffDays === 1) return t('today');
      if (diffDays === 2) return t('yesterday');
      if (diffDays <= 7) return `${diffDays} ${t('days_ago')}`;
      return date.toLocaleDateString();
    };

    return (
      <TouchableOpacity 
        key={transaction.id} 
        style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => (navigation as any).navigate('TransactionsHistory')}
      >
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
      </TouchableOpacity>
    );
  };

  const renderPaymentModal = () => {
    if (!selectedBorrowedMoneyForPayment) return null;

    return (
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.paymentModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.paymentModalHeader}>
              <Text style={[styles.paymentModalTitle, { color: theme.colors.text }]}>
                {t('payment.title') || 'Receive Payment'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentBillTitle, { color: theme.colors.text }]}>
                Payment from {selectedBorrowedMoneyForPayment.personName}
              </Text>
              <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>
                {formatCurrency(selectedBorrowedMoneyForPayment.amount)}
              </Text>
            </View>

            <View style={styles.walletSelection}>
              <Text style={[styles.walletSelectionLabel, { color: theme.colors.text }]}>
                Select wallet to receive payment
              </Text>
              <ScrollView style={styles.walletsList}>
                {wallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletOption,
                      {
                        backgroundColor: selectedWallet === wallet.id ? theme.colors.primary + '20' : theme.colors.surface,
                        borderColor: selectedWallet === wallet.id ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedWallet(wallet.id)}
                  >
                    <View style={styles.walletInfo}>
                      <Text style={[styles.walletName, { color: theme.colors.text }]}>
                        {wallet.name}
                      </Text>
                      <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                        Balance: {formatWalletBalance(wallet.balance, wallet.id)}
                      </Text>
                    </View>
                    {selectedWallet === wallet.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
                onPress={processPayment}
              >
                <Text style={styles.payButtonText}>Receive Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('loading_data')}</Text>
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
            <TouchableOpacity onPress={() => (navigation as any).navigate('NotificationCenter')}>
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                {/* Show badge only if there are unread notifications */}
                {notificationState.unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationState.unreadCount > 99 ? '99+' : notificationState.unreadCount.toString()}
                    </Text>
                  </View>
                )}
              </View>
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
                {(isBalanceVisible && shouldShowBalance(currentWallet?.id)) 
                  ? formatWalletBalance(currentWallet?.balance || 0, currentWallet?.id) 
                  : '••••••'}
              </Text>
              <Ionicons 
                name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} 
                size={20} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
            {isBalanceVisible && (
              <Text style={[styles.totalBalanceHint, { color: theme.colors.textSecondary }]}>
                {t('total_balance')}: {formatCurrency(totalBalance)}
              </Text>
            )}
            <View style={styles.swipeHint}>
              <Text style={[styles.swipeHintText, { color: theme.colors.textSecondary }]}>
                {t('swipe_hint')}
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('borrowed_money')}</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('BorrowedMoneyHistory')}>
                <Text style={styles.seeAllText}>{t('see_all')}</Text>
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
                      {t('total_amount_owed')}
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
                    <Text style={styles.addBorrowedButtonText}>{t('add_new')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={[styles.emptyBorrowedMoney, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyBorrowedTitle, { color: theme.colors.text }]}>
                  {t('no_borrowed_money')}
                </Text>
                <Text style={[styles.emptyBorrowedSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('track_borrowed_money')}
                </Text>
                <TouchableOpacity 
                  style={[styles.addBorrowedButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowAddBorrowedMoneyModal(true)}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addBorrowedButtonText}>{t('add_first_record')}</Text>
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
              <TouchableOpacity onPress={() => (navigation as any).navigate('TransactionsHistory')}>
                <Text style={styles.seeAllText}>{t('see_all')}</Text>
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
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>{t('tip_message')}</Text>
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

        {/* Payment Modal */}
        {renderPaymentModal()}
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
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  paymentDetails: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  paymentBillTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  walletSelection: {
    marginBottom: 24,
  },
  walletSelectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  walletsList: {
    maxHeight: 200,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  walletInfo: {
    flex: 1,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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