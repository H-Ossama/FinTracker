import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
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
  Image,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BorrowedMoney } from '../types';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import TransferModal from '../components/TransferModal';
import BorrowedMoneyDetailsModal from '../components/BorrowedMoneyDetailsModal';
import AddBorrowedMoneyModal from '../components/AddBorrowedMoneyModal';
import SwipeableWalletDisplay from '../components/SwipeableWalletDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNotification } from '../contexts/NotificationContext';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { useAuth } from '../contexts/AuthContext';
import { useScreenPerformance } from '../hooks/usePerformance';
import borrowedMoneyService from '../services/borrowedMoneyService';
import { useWalletVisibility } from '../hooks/useWalletVisibility';
import { hybridDataService, HybridWallet, HybridTransaction } from '../services/hybridDataService';
import { useOptimizedCallback, useOptimizedMemo, withOptimizedMemo } from '../utils/componentOptimization';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SAMPLE_NOTIFICATIONS_FLAG = 'sample_notifications_seeded';
const NOTIFICATION_STORAGE_KEY = 'notification_state';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, formatCurrency: formatCurrencyLoc } = useLocalization();
  const { state: notificationState, addNotification } = useNotification();
  const quickActions = useQuickActions();
  const { formatWalletBalance, shouldShowBalance } = useWalletVisibility();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState(12000);
  const [showMonthlyLimitModal, setShowMonthlyLimitModal] = useState(false);
  const [monthlyLimitInput, setMonthlyLimitInput] = useState('12000');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBorrowedMoneyDetailsModal, setShowBorrowedMoneyDetailsModal] = useState(false);
  const [showAddBorrowedMoneyModal, setShowAddBorrowedMoneyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBorrowedMoneyForPayment, setSelectedBorrowedMoneyForPayment] = useState<BorrowedMoney | null>(null);
  const [enabledQuickActions, setEnabledQuickActions] = useState<QuickAction[]>([]);
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
  const hasAttemptedSampleSeed = useRef(false);

  // Load all data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadAllData();
        // Load monthly limit
        const savedLimit = await AsyncStorage.getItem('monthlySpendingLimit');
        if (savedLimit) {
          const limit = parseFloat(savedLimit);
          setMonthlyLimit(limit);
          setMonthlyLimitInput(limit.toString());
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Register quick actions
  useEffect(() => {
    quickActions.setTriggerAddExpense(() => setShowAddExpenseModal(true));
    quickActions.setTriggerTransfer(() => setShowTransferModal(true));
    // Add wallet functionality is handled by WalletScreen
  }, [quickActions]);

  // Reload data when screen comes into focus (e.g., after bill payment)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const loadData = async () => {
        if (isMounted) {
          await loadAllData();
        }
      };
      
      loadData();
      
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Load enabled quick actions from settings
  useFocusEffect(
    useCallback(() => {
      const loadQuickActions = async () => {
        try {
          const actions = await quickActionsService.getEnabledQuickActions();
          setEnabledQuickActions(actions);
        } catch (error) {
          console.error('Error loading quick actions:', error);
        }
      };
      loadQuickActions();
    }, [])
  );

  useEffect(() => {
    if (hasAttemptedSampleSeed.current) {
      return;
    }

    hasAttemptedSampleSeed.current = true;

    const seedSampleNotificationsIfNeeded = async () => {
      try {
        const seededFlag = await AsyncStorage.getItem(SAMPLE_NOTIFICATIONS_FLAG);
        if (seededFlag === 'true') {
          return;
        }

        try {
          const storedStateRaw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
          if (storedStateRaw) {
            const storedState = JSON.parse(storedStateRaw);
            if (Array.isArray(storedState?.inAppNotifications) && storedState.inAppNotifications.length > 0) {
              await AsyncStorage.setItem(SAMPLE_NOTIFICATIONS_FLAG, 'true');
              return;
            }
          }
        } catch (storageError) {
          console.warn('Unable to inspect notification storage for samples', storageError);
        }

        if (notificationState.inAppNotifications.length > 0) {
          await AsyncStorage.setItem(SAMPLE_NOTIFICATIONS_FLAG, 'true');
          return;
        }

        addNotification({
          title: 'Testing',
          message: 'This is a test notification to verify functionality works correctly.',
          type: 'info',
          read: false,
        });

        addNotification({
          title: 'Welcome to FinTracker!',
          message: 'Start tracking your finances and achieve your goals.',
          type: 'success',
          read: false,
        });

        addNotification({
          title: 'Budget Alert',
          message: 'You have spent 80% of your dining budget this month.',
          type: 'warning',
          read: false,
        });

        await AsyncStorage.setItem(SAMPLE_NOTIFICATIONS_FLAG, 'true');
      } catch (error) {
        console.warn('Error seeding sample notifications', error);
        hasAttemptedSampleSeed.current = false;
      }
    };

    void seedSampleNotificationsIfNeeded();
  }, [addNotification, notificationState.inAppNotifications.length]);

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

  const handleSaveMonthlyLimit = async () => {
    try {
      const limit = parseFloat(monthlyLimitInput) || 12000;
      if (limit <= 0) {
        Alert.alert('Error', 'Monthly limit must be greater than 0');
        return;
      }
      setMonthlyLimit(limit);
      await AsyncStorage.setItem('monthlySpendingLimit', limit.toString());
      setShowMonthlyLimitModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save monthly limit');
    }
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
      // Calculate current month spending
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlySpending = recentTransactions
        .filter((tx: any) => {
          const txDate = new Date(tx.date);
          return (
            txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear &&
            tx.type === 'EXPENSE'
          );
        })
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

      const newTotal = monthlySpending + expense.amount;
      const remainingBudget = monthlyLimit - newTotal;

      // Check if limit is exceeded
      if (newTotal > monthlyLimit) {
        Alert.alert(
          '⚠️ Monthly Limit Exceeded',
          `This expense will exceed your monthly limit of ${formatCurrency(monthlyLimit)}.\n\nCurrent spending: ${formatCurrency(monthlySpending)}\nExpense amount: ${formatCurrency(expense.amount)}\nTotal: ${formatCurrency(newTotal)}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Anyway', onPress: () => addExpenseConfirmed(expense) },
          ]
        );
      } else if (remainingBudget < monthlyLimit * 0.2) {
        // Warn if less than 20% budget remains
        Alert.alert(
          '⚠️ Budget Warning',
          `You have used ${formatCurrency(newTotal)} of your ${formatCurrency(monthlyLimit)} monthly limit.\n\nRemaining: ${formatCurrency(remainingBudget)}`,
          [
            { text: 'OK', onPress: () => addExpenseConfirmed(expense) },
          ]
        );
      } else {
        addExpenseConfirmed(expense);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
      console.error('Error adding expense:', error);
    }
  };

  const addExpenseConfirmed = async (expense: any) => {
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

  // Handle quick action press based on action type
  const handleQuickActionPress = (action: QuickAction) => {
    // Handle modal-based actions
    if (action.isModal) {
      switch (action.action) {
        case 'addExpense':
          setShowAddExpenseModal(true);
          break;
        case 'addIncome':
          setShowAddIncomeModal(true);
          break;
        case 'transfer':
          setShowTransferModal(true);
          break;
        case 'addWallet':
          // Navigate to wallet tab
          (navigation as any).navigate('TabNavigator', { screen: 'wallet' });
          break;
        case 'addBorrowedMoney':
          setShowAddBorrowedMoneyModal(true);
          break;
        default:
          // For other modal actions with navigateTo, navigate to the screen
          if (action.navigateTo) {
            (navigation as any).navigate(action.navigateTo, action.navigateParams);
          }
      }
    } else {
      // Navigate to the specified screen
      if (action.navigateTo) {
        (navigation as any).navigate(action.navigateTo, action.navigateParams);
      }
    }
  };

  // Get the icon background color (lighter version)
  const getQuickActionBgColor = (color: string) => {
    // Create a lighter background version of the color
    const colorMap: Record<string, string> = {
      '#FF6B6B': '#FFE8E8',
      '#51CF66': '#E8FFE8',
      '#4A90E2': '#E8F4FF',
      '#9013FE': '#F3E8FF',
      '#7ED321': '#EEFFD8',
      '#FF9500': '#FFF5E8',
      '#FF3B30': '#FFE8E8',
      '#007AFF': '#E8F4FF',
      '#5856D6': '#EFEDFF',
      '#34C759': '#E8FFE8',
      '#AF52DE': '#F9E8FF',
      '#FF2D55': '#FFE8ED',
      '#FFD60A': '#FFFBE8',
      '#8E8E93': '#F5F5F5',
      '#30D158': '#E8FFE8',
      '#5AC8FA': '#E8F8FF',
      '#20C6F7': '#E8FBFF',
    };
    return colorMap[color] || '#F5F5F5';
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

  const renderTransactionItem = (transaction: HybridTransaction, index: number) => {
    // Get transaction icon/logo based on type or description
    const getTransactionIcon = (type: string, description?: string) => {
      const desc = description?.toLowerCase() || '';
      if (desc.includes('at&t') || desc.includes('phone') || desc.includes('mobile')) return { icon: 'phone-portrait-outline', color: '#007AFF', bg: '#E8F4FF' };
      if (desc.includes('adobe') || desc.includes('subscription') || desc.includes('cc')) return { icon: 'apps', color: '#FF0000', bg: '#FFE8E8' };
      if (desc.includes('blizzard') || desc.includes('game') || desc.includes('entertainment')) return { icon: 'game-controller', color: '#148EFF', bg: '#E8F4FF' };
      if (desc.includes('netflix') || desc.includes('streaming')) return { icon: 'play-circle', color: '#E50914', bg: '#FFE8E8' };
      if (desc.includes('spotify') || desc.includes('music')) return { icon: 'musical-notes', color: '#1DB954', bg: '#E8FFE8' };
      if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) return { icon: 'restaurant', color: '#FF9500', bg: '#FFF5E8' };
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('electricity') || desc.includes('utility')) return { icon: 'flash', color: '#FFD60A', bg: '#FFFBE8' };
      if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi')) return { icon: 'car', color: '#333333', bg: '#F5F5F5' };
      if (type === 'INCOME') return { icon: 'arrow-down-circle', color: '#34C759', bg: '#E8FFE8' };
      if (type === 'TRANSFER') return { icon: 'swap-horizontal', color: '#007AFF', bg: '#E8F4FF' };
      return { icon: 'card', color: '#8E8E93', bg: '#F5F5F5' };
    };

    const iconInfo = getTransactionIcon(transaction.type, transaction.description);

    return (
      <TouchableOpacity 
        key={transaction.id} 
        style={styles.operationItem}
        onPress={() => (navigation as any).navigate('TransactionsHistory')}
        activeOpacity={0.7}
      >
        <View style={[styles.operationIconContainer, { backgroundColor: iconInfo.bg }]}>
          <Ionicons name={iconInfo.icon as any} size={22} color={iconInfo.color} />
        </View>
        <View style={styles.operationDetails}>
          <Text style={[styles.operationTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {transaction.description || `${transaction.type.toLowerCase()} transaction`}
          </Text>
          <Text style={[styles.operationSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {transaction.notes || transaction.type}
          </Text>
        </View>
        <Text style={[
          styles.operationAmount,
          { color: transaction.type === 'INCOME' ? '#34C759' : theme.colors.text }
        ]}>
          {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Group transactions by date
  const groupTransactionsByDate = (transactions: HybridTransaction[]) => {
    const groups: { [key: string]: HybridTransaction[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let groupKey: string;

      if (date.toDateString() === today.toDateString()) {
        groupKey = t('today') || 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = t('yesterday') || 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });

    return groups;
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
                style={[styles.payModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={processPayment}
              >
                <Text style={styles.payModalButtonText}>Receive Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.headerBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerBackground} />
      
      {loadingData ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('loading_data')}</Text>
        </View>
      ) : (
        <>
          {/* Dark Header Section */}
          <View style={[styles.darkHeader, { backgroundColor: theme.colors.headerBackground, paddingTop: insets.top }]}>
            {/* Top Header Row */}
            <View style={styles.headerRow}>
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
                <Text style={[styles.userName, { color: theme.colors.headerText }]}>{user?.name || t('user')}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.headerTextSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
                  onPress={() => (navigation as any).navigate('QuickSettings')}
                >
                  <Ionicons name="settings-outline" size={22} color={theme.colors.headerText} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
                  onPress={() => (navigation as any).navigate('NotificationCenter')}
                >
                  <Ionicons name="notifications-outline" size={22} color={theme.colors.headerText} />
                  {notificationState.unreadCount > 0 && (
                    <View style={[styles.notificationBadge, { borderColor: theme.colors.headerBackground }]}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationState.unreadCount > 99 ? '99+' : notificationState.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Swipeable Wallet Display */}
            <SwipeableWalletDisplay
              wallets={wallets}
              onWalletChange={(wallet: any, index: number) => {
                setCurrentWalletIndex(index);
                setSelectedWallet(wallet.id);
              }}
              currentWalletIndex={currentWalletIndex}
              isBalanceVisible={isBalanceVisible}
              formatCurrency={formatCurrency}
              getWalletIcon={(type: string) => {
                switch (type.toUpperCase()) {
                  case 'BANK':
                  case 'CREDIT_CARD':
                    return 'card';
                  case 'CASH':
                    return 'cash';
                  case 'SAVINGS':
                  case 'INVESTMENT':
                    return 'wallet';
                  default:
                    return 'wallet';
                }
              }}
            />
            
            {/* Balance Card */}
            <View style={styles.balanceSection}>
              <View style={[styles.limitRow, { borderTopColor: theme.colors.headerBorder }]}>
                <Text style={[styles.limitLabel, { color: theme.colors.headerTextSecondary }]}>{t('monthly_limit') || 'Monthly Limit'}</Text>
                <TouchableOpacity onPress={() => setShowMonthlyLimitModal(true)}>
                  <Text style={[styles.limitValue, { color: theme.colors.headerText }]}>{formatCurrency(monthlyLimit)}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.spentContainer}>
                <View style={styles.spentProgressBar}>
                  <View style={[styles.spentProgressFill, { width: `${Math.min((totalBalance * 0.1) / monthlyLimit * 100, 100)}%` }]} />
                </View>
                <Text style={[styles.spentText, { color: theme.colors.headerTextSecondary }]}>{formatCurrency(totalBalance * 0.1)} {t('spent_this_month') || 'spent this month'}</Text>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => setShowAddExpenseModal(true)}
                >
                  <Text style={[styles.payButtonText, { color: theme.colors.headerBackground }]}>{t('pay') || 'Pay'}</Text>
                  <View style={[styles.payButtonIcon, { backgroundColor: theme.colors.headerBackground }]}>
                    <Text style={[styles.payButtonIconText, { color: theme.colors.headerText }]}>$</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.depositButton, { backgroundColor: theme.colors.headerSurface }]}
                  onPress={() => (navigation as any).navigate('AddIncome')}
                >
                  <Text style={[styles.depositButtonText, { color: theme.colors.headerText }]}>{t('deposit') || 'Deposit'}</Text>
                  <View style={styles.depositButtonIcon}>
                    <Ionicons name="add" size={14} color={theme.colors.headerText} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* White Operations Section */}
          <View style={[styles.operationsContainer, { backgroundColor: theme.colors.background }]}>
            <ScrollView 
              style={styles.operationsScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            >
              {/* Operations Header */}
              <View style={styles.operationsHeader}>
                <Text style={[styles.operationsTitle, { color: theme.colors.text }]}>
                  {t('operations') || 'Operations'}
                </Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('TransactionsHistory')}>
                  <Text style={styles.viewAllText}>{t('view_all') || 'View All'}</Text>
                </TouchableOpacity>
              </View>

              {/* Grouped Transactions */}
              {Object.entries(groupTransactionsByDate(recentTransactions)).map(([date, transactions]) => (
                <View key={date} style={styles.transactionGroup}>
                  <Text style={[styles.groupDateLabel, { color: theme.colors.textSecondary }]}>{date}</Text>
                  {transactions.map((transaction, index) => renderTransactionItem(transaction, index))}
                </View>
              ))}

              {recentTransactions.length === 0 && (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t('no_transactions') || 'No transactions yet'}
                  </Text>
                </View>
              )}

              {/* Quick Actions Section */}
              <View style={styles.quickActionsSection}>
                <View style={styles.quickActionsSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('quick_actions')}</Text>
                  <TouchableOpacity 
                    onPress={() => (navigation as any).navigate('QuickActionsSettings')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="settings-outline" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.quickActionsGrid}>
                  {enabledQuickActions.length > 0 ? (
                    enabledQuickActions.map((action) => (
                      <TouchableOpacity 
                        key={action.id}
                        style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                        onPress={() => handleQuickActionPress(action)}
                      >
                        <View style={[styles.quickActionIcon, { backgroundColor: getQuickActionBgColor(action.color) }]}>
                          <Ionicons name={action.icon as any} size={24} color={action.color} />
                        </View>
                        <Text style={[styles.quickActionText, { color: theme.colors.text }]} numberOfLines={1}>
                          {t(action.action) || action.label}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyQuickActions}>
                      <Text style={[styles.emptyQuickActionsText, { color: theme.colors.textSecondary }]}>
                        {t('no_quick_actions') || 'No quick actions configured'}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.configureButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => (navigation as any).navigate('QuickActionsSettings')}
                      >
                        <Text style={styles.configureButtonText}>{t('configure') || 'Configure'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Borrowed Money Summary */}
              {borrowedMoneyList.length > 0 && (
                <TouchableOpacity 
                  style={[styles.borrowedSummaryCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => (navigation as any).navigate('BorrowedMoneyHistory')}
                >
                  <View style={styles.borrowedSummaryLeft}>
                    <View style={[styles.borrowedIcon, { backgroundColor: '#FFF5E8' }]}>
                      <Ionicons name="people" size={20} color="#FF9500" />
                    </View>
                    <View>
                      <Text style={[styles.borrowedSummaryTitle, { color: theme.colors.text }]}>
                        {t('borrowed_money')}
                      </Text>
                      <Text style={[styles.borrowedSummarySubtitle, { color: theme.colors.textSecondary }]}>
                        {borrowedMoneyList.length} {t('pending') || 'pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.borrowedSummaryAmount, { color: '#FF9500' }]}>
                    {formatCurrency(totalBorrowedAmount)}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </>
      )}

      {/* Modals */}
      <AddExpenseModal
        visible={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onAddExpense={handleAddExpense}
      />
      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleTransfer}
      />
      <AddIncomeModal
        visible={showAddIncomeModal}
        onClose={() => setShowAddIncomeModal(false)}
        onAddIncome={handleAddIncome}
      />
      <BorrowedMoneyDetailsModal
        visible={showBorrowedMoneyDetailsModal}
        onClose={() => setShowBorrowedMoneyDetailsModal(false)}
        borrowedMoney={selectedBorrowedMoney}
        onMarkAsPaid={handleMarkAsPaid}
        onEdit={handleEditBorrowedMoney}
        onDelete={handleDeleteBorrowedMoney}
      />
      <AddBorrowedMoneyModal
        visible={showAddBorrowedMoneyModal}
        onClose={() => setShowAddBorrowedMoneyModal(false)}
        onAdd={handleAddBorrowedMoney}
        onAddWithReminder={handleAddBorrowedMoneyWithReminder}
      />
      {renderPaymentModal()}

      {/* Monthly Limit Modal */}
      <Modal
        visible={showMonthlyLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthlyLimitModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 12 }}>
              {t('monthly_limit') || 'Set Monthly Spending Limit'}
            </Text>
            <TextInput
              value={monthlyLimitInput}
              onChangeText={setMonthlyLimitInput}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
                color: theme.colors.text,
                fontSize: 16,
              }}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                onPress={() => setShowMonthlyLimitModal(false)}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center' }}
                onPress={handleSaveMonthlyLimit}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>{t('save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  
  // Dark Header Section
  darkHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Balance Section
  balanceSection: {
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  limitLabel: {
    fontSize: 14,
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  spentText: {
    fontSize: 13,
    marginTop: 4,
  },
  spentContainer: {
    marginTop: 12,
  },
  spentProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  spentProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  
  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 25,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  payButtonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  depositButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
  },
  depositButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  depositButtonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Operations Section
  operationsContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
    overflow: 'hidden',
  },
  operationsScroll: {
    flex: 1,
    paddingTop: 24,
  },
  operationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  operationsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Transaction Groups
  transactionGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  groupDateLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  
  // Operation Items
  operationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  operationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  operationDetails: {
    flex: 1,
    marginRight: 12,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  operationSubtitle: {
    fontSize: 13,
  },
  operationAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  quickActionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickActionCard: {
    minWidth: '30%',
    maxWidth: '32%',
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyQuickActions: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyQuickActionsText: {
    fontSize: 14,
    marginBottom: 12,
  },
  configureButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  configureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Borrowed Summary
  borrowedSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  borrowedSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  borrowedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  borrowedSummaryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  borrowedSummarySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  borrowedSummaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Empty State
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  
  // Payment Modal (keeping existing styles)
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
  walletName: {
    fontSize: 14,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 13,
    marginTop: 2,
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
  payModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default memo(HomeScreen);