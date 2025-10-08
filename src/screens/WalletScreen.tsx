import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AddWalletModal from '../components/AddWalletModal';
import AddMoneyModal from '../components/AddMoneyModal';
import TransferModal from '../components/TransferModal';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { hybridDataService } from '../services/hybridDataService';

const WalletScreen = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedWalletForMoney, setSelectedWalletForMoney] = useState<any>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const fetchedWallets = await hybridDataService.getWallets();
      setWallets(fetchedWallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
      Alert.alert('Error', 'Failed to load wallets');
    } finally {
      setLoading(false);
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
      
      Alert.alert('Success', 'Wallet created successfully!');
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    }
  };

  const handleAddMoney = async (moneyData: any) => {
    try {
      // Use the walletId from moneyData if available, otherwise fall back to selectedWalletForMoney
      const targetWalletId = moneyData.walletId || selectedWalletForMoney?.id;
      const targetWallet = wallets.find(w => w.id === targetWalletId) || selectedWalletForMoney;
      
      if (!targetWalletId || !targetWallet) {
        Alert.alert('Error', 'Please select a wallet to add money to.');
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
      
      Alert.alert('Success', `${formatCurrency(moneyData.amount)} added to ${targetWallet.name}!`);
    } catch (error) {
      console.error('Error adding money:', error);
      Alert.alert('Error', 'Failed to add money. Please try again.');
    }
  };

  const handleTransfer = (success: boolean) => {
    if (success) {
      loadWallets(); // Refresh the wallet list after successful transfer
    }
  };

  const handleDeleteWallet = async (walletId: string, walletName: string, walletBalance: number) => {
    // Check if wallet has balance
    const hasBalance = walletBalance !== 0;
    const balanceWarning = hasBalance 
      ? `\n\nWarning: This wallet has a balance of ${formatCurrency(walletBalance)}. Deleting it will remove this balance from your records.`
      : '';

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${walletName}"?${balanceWarning}\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting wallet:', walletId);
              await hybridDataService.deleteWallet(walletId);
              console.log('Wallet deleted successfully');
              
              // Refresh the wallet list
              await loadWallets();
              
              Alert.alert('Success', 'Wallet deleted successfully!');
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet. Please try again.');
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

  const renderWalletCard = (wallet: any) => {
    const transactions = getWalletTransactions(wallet.id);
    
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
              <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)}>
                <Ionicons 
                  name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} 
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
            {isBalanceVisible ? formatCurrency(wallet.balance) : '••••••'}
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
              <Text style={styles.walletActionText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.walletActionButton}
              onPress={() => setIsTransferModalVisible(true)}
            >
              <Ionicons name="swap-horizontal" size={16} color="white" />
              <Text style={styles.walletActionText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        {/* Recent Transactions for this wallet */}
        <View style={[styles.walletTransactions, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.walletTransactionsTitle, { color: theme.colors.text }]}>Recent Activity</Text>
          <Text style={[styles.noTransactionsText, { color: theme.colors.textSecondary }]}>No recent transactions</Text>
        </View>
      </View>
    );
  };

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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>My Wallets</Text>
          </View>

          {/* Total Balance Overview */}
          <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>Total Balance</Text>
            <Text style={[styles.overviewAmount, { color: theme.colors.text }]}>
              {isBalanceVisible 
                ? formatCurrency(wallets.reduce((sum, wallet) => sum + wallet.balance, 0))
                : '••••••'
              }
            </Text>
            <View style={styles.overviewStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(1200)}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>This Month</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{wallets.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active Wallets</Text>
              </View>
            </View>
          </View>

          {/* Quick Transfer */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setIsTransferModalVisible(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#4A90E2' }]}>
                  <Ionicons name="swap-horizontal" size={20} color="white" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => {
                  if (wallets.length === 0) {
                    Alert.alert('No Wallets', 'Please create a wallet first before adding money.');
                  } else {
                    // Always allow wallet selection for quick action
                    setSelectedWalletForMoney(null); // No pre-selection
                    setShowAddMoneyModal(true);
                  }
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#7ED321' }]}>
                  <Ionicons name="add" size={20} color="white" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Add Money</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setShowAddWalletModal(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FF9500' }]}>
                  <Ionicons name="card" size={20} color="white" />
                </View>
                <Text style={[styles.quickActionText, { color: theme.colors.text }]}>New Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallets List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Wallets</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading wallets...</Text>
              </View>
            ) : wallets.length > 0 ? (
              wallets.map(renderWalletCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No wallets yet. Create your first wallet to get started!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewCard: {
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
  overviewLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  overviewAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    color: '#333',
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
  deleteButton: {
    padding: 4,
    opacity: 0.8,
  },
});

export default WalletScreen;