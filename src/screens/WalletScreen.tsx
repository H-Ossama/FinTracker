import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AddWalletModal from '../components/AddWalletModal';
import { useWalletVisibility } from '../hooks/useWalletVisibility';
import AddMoneyModal from '../components/AddMoneyModal';
import TransferModal from '../components/TransferModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { useAuth } from '../contexts/AuthContext';
import { hybridDataService } from '../services/hybridDataService';
import { withOptimizedMemo } from '../utils/componentOptimization';

const WalletScreen = () => {
  const { theme } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const { formatWalletBalance, getTotalVisibleBalance, isWalletHidden, toggleWalletHidden } = useWalletVisibility();
  const quickActions = useQuickActions();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const PREFERRED_WALLET_KEY = 'preferredWalletId';
  
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedWalletForMoney, setSelectedWalletForMoney] = useState<any>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [monthlySpending, setMonthlySpending] = useState(0);

  useEffect(() => {
    loadWallets();
  }, []);

  // Register quick action for adding wallet
  useEffect(() => {
    quickActions.setTriggerAddWallet(() => setShowAddWalletModal(true));
  }, [quickActions]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const fetchedWallets = await hybridDataService.getWallets();
      const preferredId = await (await import('@react-native-async-storage/async-storage')).default.getItem(PREFERRED_WALLET_KEY);
      setWallets(
        fetchedWallets.map((w: any) => ({
          ...w,
          isPreferred: preferredId ? w.id === preferredId : false,
        }))
      );
      await calculateMonthlySpending();
    } catch (error) {
      console.error('Error loading wallets:', error);
      Alert.alert(t('error'), t('wallet_screen_error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlySpending = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Get all transactions for the current month
      const allTransactions = await hybridDataService.getTransactions();
      
      const monthlyTotal = allTransactions
        .filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return transactionDate.getMonth() + 1 === currentMonth && 
                 transactionDate.getFullYear() === currentYear &&
                 transaction.type === 'EXPENSE';
        })
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
      
      setMonthlySpending(monthlyTotal);
    } catch (error) {
      console.error('Error calculating monthly spending:', error);
      setMonthlySpending(0);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallets();
    setRefreshing(false);
  };

  const handleAddWallet = async (walletData: any) => {
    try {
      console.log('Creating wallet:', walletData);
      
      // Map the wallet type to match the backend enum
      const walletTypeMap: { [key: string]: 'BANK' | 'CASH' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT_CARD' | 'OTHER' } = {
        'bank': 'BANK',
        'cash': 'CASH', 
        'savings': 'SAVINGS',
        'investment': 'INVESTMENT',
        'credit': 'CREDIT_CARD'
      };

      const mappedType = walletTypeMap[walletData.type] || 'OTHER';

      const newWallet = await hybridDataService.createWallet({
        name: walletData.name,
        type: mappedType,
        balance: walletData.initialBalance || 0,
        color: walletData.color,
        icon: walletData.type // Use the type as icon identifier
      });

      console.log('Wallet created successfully:', newWallet);
      setShowAddWalletModal(false);
      
      // Refresh the wallet list
      await loadWallets();
      
      Alert.alert(t('success'), t('wallet_screen_success_created'));
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert(t('error'), t('wallet_screen_error_create'));
    }
  };

  const handleAddMoney = async (moneyData: any) => {
    try {
      // Use the walletId from moneyData if available, otherwise fall back to selectedWalletForMoney
      const targetWalletId = moneyData.walletId || selectedWalletForMoney?.id;
      const targetWallet = wallets.find(w => w.id === targetWalletId) || selectedWalletForMoney;
      
      if (!targetWalletId || !targetWallet) {
        Alert.alert(t('error'), t('wallet_screen_select_wallet_error'));
        return;
      }

      console.log('Adding money to wallet:', targetWalletId, moneyData);
      
      // Add income transaction and update wallet balance
      await hybridDataService.createTransaction({
        description: moneyData.title,
        amount: moneyData.amount,
        type: 'INCOME',
        walletId: targetWalletId,
        date: moneyData.date,
        notes: moneyData.description || ''
      });

      console.log('Money added successfully');
      setShowAddMoneyModal(false);
      setSelectedWalletForMoney(null);
      
      // Refresh the wallet list to show updated balance
      await loadWallets();
      
      Alert.alert(t('success'), t('wallet_screen_success_money_added', {
        amount: formatCurrency(moneyData.amount),
        wallet: targetWallet.name
      }));
    } catch (error) {
      console.error('Error adding money:', error);
      Alert.alert(t('error'), t('wallet_screen_error_add_money'));
    }
  };

  const handleTransfer = (success: boolean) => {
    if (success) {
      loadWallets(); // Refresh the wallet list after successful transfer
    }
  };

  const handleDeleteWallet = async (walletId: string, walletName: string, walletBalance: number) => {
    const preferredWalletId = wallets.find((w: any) => w.isPreferred)?.id;
    // Check if wallet has balance
    const hasBalance = walletBalance !== 0;
    const confirmationMessage = hasBalance 
      ? t('wallet_screen_delete_confirmation', {
          name: walletName,
          balance: formatCurrency(walletBalance)
        })
      : t('wallet_screen_delete_no_balance', { name: walletName });

    Alert.alert(
      t('wallet_screen_delete_wallet'),
      confirmationMessage,
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting wallet:', walletId);
              await hybridDataService.deleteWallet(walletId);
              console.log('Wallet deleted successfully');

              // If deleted wallet was preferred, clear preference.
              if (preferredWalletId && preferredWalletId === walletId) {
                const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                await AsyncStorage.removeItem(PREFERRED_WALLET_KEY);
              }
              
              // Refresh the wallet list
              await loadWallets();
              
              Alert.alert(t('success'), t('wallet_screen_success_deleted'));
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert(t('error'), t('wallet_screen_error_delete'));
            }
          },
        },
      ]
    );
  };

  const getWalletTransactions = async (walletId: string) => {
    try {
      const result = await hybridDataService.getWalletTransactions(walletId, 3);
      return result.transactions;
    } catch (error) {
      console.error('Error loading wallet transactions:', error);
      return [];
    }
  };

  const handleSetPreferredWallet = async (walletId: string) => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(PREFERRED_WALLET_KEY, walletId);
      setWallets(prev => prev.map(w => ({ ...w, isPreferred: w.id === walletId })));
      Alert.alert(t('success'), t('wallet set as preferred, this is the default wallet that will be displayed first in Dashboard'));
    } catch (error) {
      console.error('Error setting preferred wallet:', error);
      Alert.alert(t('error'), t('wallet_screen_error_update'));
    }
  };

  const renderWalletCard = (wallet: any) => {
    // Don't call async functions during render
    // getWalletTransactions is async and shouldn't be called here
    
    return (
      <View key={wallet.id} style={styles.walletCard}>
        <LinearGradient
          colors={[wallet.color, `${wallet.color}CC`]}
          style={styles.walletGradient}
        >
          <View style={styles.walletHeader}>
            <View style={styles.walletTitleRow}>
              <Ionicons 
                name={wallet.type === 'BANK' ? 'card' : wallet.type === 'CASH' ? 'cash' : 'wallet'} 
                size={24} 
                color="white" 
              />
              <Text style={styles.walletName}>{wallet.name}</Text>
            </View>
            <View style={styles.walletHeaderActions}>
              <TouchableOpacity 
                onPress={() => handleSetPreferredWallet(wallet.id)}
                style={styles.preferredButton}
              >
                <Ionicons 
                  name={wallet.isPreferred ? 'star' : 'star-outline'} 
                  size={20} 
                  color={wallet.isPreferred ? '#FFD700' : 'white'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void toggleWalletHidden(wallet.id)}>
                <Ionicons
                  name={isWalletHidden(wallet.id) ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDeleteWallet(wallet.id, wallet.name, wallet.balance)}
                style={styles.deleteButton}
              >
                <Ionicons 
                  name="trash-outline" 
                  size={18} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.walletBalance}>
            {formatWalletBalance(wallet.balance, wallet.id)}
          </Text>
          
          <View style={styles.walletActions}>
            <TouchableOpacity 
              style={styles.walletActionButton}
              onPress={() => {
                setSelectedWalletForMoney(wallet);
                setShowAddMoneyModal(true);
              }}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.walletActionText}>{t('wallet_screen_add_money')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.walletActionButton}
              onPress={() => setIsTransferModalVisible(true)}
            >
              <Ionicons name="swap-horizontal" size={16} color="white" />
              <Text style={styles.walletActionText}>{t('transfer')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        {/* Recent Transactions for this wallet */}
        <View style={[styles.walletTransactions, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.walletTransactionsTitle, { color: theme.colors.text }]}>{t('wallet_screen_recent_activity')}</Text>
          <Text style={[styles.noTransactionsText, { color: theme.colors.textSecondary }]}>{t('wallet_screen_no_transactions')}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.headerBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerBackground} />
      
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
            <Text style={[styles.userName, { color: theme.colors.headerText }]}>{user?.name || 'User'}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.headerTextSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
              onPress={() => (navigation as any).navigate('QuickSettings')}
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Overview in Header */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: theme.colors.headerTextSecondary }]}>{t('wallet_screen_total_balance')}</Text>
          <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)} style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: theme.colors.headerText }]}>
              {isBalanceVisible 
                ? formatCurrency(getTotalVisibleBalance(wallets))
                : '••••••'
              }
            </Text>
          </TouchableOpacity>
          
          <View style={styles.walletStatsRow}>
            <View style={styles.walletStatItem}>
              <Text style={[styles.walletStatValue, { color: theme.colors.headerText }]}>{wallets.length}</Text>
              <Text style={[styles.walletStatLabel, { color: theme.colors.headerTextSecondary }]}>{t('wallet_screen_active_wallets')}</Text>
            </View>
            <View style={[styles.walletStatDivider, { backgroundColor: theme.colors.headerBorder }]} />
            <View style={styles.walletStatItem}>
              <Text style={[styles.walletStatValue, { color: theme.colors.headerText }]}>{formatCurrency(monthlySpending)}</Text>
              <Text style={[styles.walletStatLabel, { color: theme.colors.headerTextSecondary }]}>{t('wallet_screen_this_month')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* White Content Section */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('wallet_screen_quick_actions')}</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setIsTransferModalVisible(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#E8F4FF' }]}>
                  <Ionicons name="swap-horizontal" size={20} color="#007AFF" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>{t('transfer')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => {
                  if (wallets.length === 0) {
                    Alert.alert(t('wallet_screen_no_wallets'), t('wallet_screen_no_wallets_add_money'));
                  } else {
                    setSelectedWalletForMoney(null);
                    setShowAddMoneyModal(true);
                  }
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#E8FFE8' }]}>
                  <Ionicons name="add" size={20} color="#34C759" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>{t('wallet_screen_add_money')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setShowAddWalletModal(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFF5E8' }]}>
                  <Ionicons name="card" size={20} color="#FF9500" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>{t('wallet_screen_new_wallet')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallets List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('wallet_screen_your_wallets')}</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('wallet_screen_loading')}</Text>
              </View>
            ) : wallets.length > 0 ? (
              wallets.map(renderWalletCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {t('wallet_screen_no_wallets')}
                </Text>
              </View>
            )}
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
        
      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
        onTransfer={handleTransfer}
      />
      
      {/* Add Wallet Modal */}
      <AddWalletModal
        visible={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        onAddWallet={handleAddWallet}
      />

      {/* Add Money Modal */}
      <AddMoneyModal
        visible={showAddMoneyModal}
        onClose={() => {
          setShowAddMoneyModal(false);
          setSelectedWalletForMoney(null);
        }}
        onAddMoney={handleAddMoney}
        selectedWallet={selectedWalletForMoney}
        availableWallets={wallets}
        allowWalletSelection={!selectedWalletForMoney}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginRight: 10,
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
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceSection: {
    paddingTop: 10,
    paddingBottom: 20,
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
  walletStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  walletStatItem: {
    flex: 1,
  },
  walletStatValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  walletStatLabel: {
    fontSize: 12,
  },
  walletStatDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  walletCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  walletGradient: {
    padding: 20,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  walletBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 0.48,
    justifyContent: 'center',
  },
  walletActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  walletTransactions: {
    backgroundColor: 'white',
    padding: 16,
  },
  walletTransactionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionEmoji: {
    fontSize: 16,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  noTransactionsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
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
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  transferForm: {
    paddingTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  walletSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  walletSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  amountInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  transferButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  walletHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferredButton: {
    padding: 4,
    opacity: 0.9,
  },
  deleteButton: {
    padding: 4,
    opacity: 0.8,
  },
});

export default memo(WalletScreen);