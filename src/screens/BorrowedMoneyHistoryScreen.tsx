import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorrowedMoney } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import BorrowedMoneyDetailsModal from '../components/BorrowedMoneyDetailsModal';
import AddBorrowedMoneyModal from '../components/AddBorrowedMoneyModal';
import { localStorageService } from '../services/localStorageService';
import borrowedMoneyService from '../services/borrowedMoneyService';

const BorrowedMoneyHistoryScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const insets = useSafeAreaInsets();
  const [borrowedMoneyList, setBorrowedMoneyList] = useState<BorrowedMoney[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBorrowedMoney, setSelectedBorrowedMoney] = useState<BorrowedMoney | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBorrowedMoneyForPayment, setSelectedBorrowedMoneyForPayment] = useState<BorrowedMoney | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadBorrowedMoneyData();
  }, []);

  const loadBorrowedMoneyData = async () => {
    try {
      setLoading(true);
      const allBorrowedMoney = await borrowedMoneyService.getAllBorrowedMoney();
      setBorrowedMoneyList(allBorrowedMoney);
    } catch (error) {
      console.error('Error loading borrowed money data:', error);
      setBorrowedMoneyList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadBorrowedMoneyData().then(() => {
      setRefreshing(false);
    }).catch((error) => {
      console.error('Error refreshing data:', error);
      setRefreshing(false);
    });
  }, []);

  const handleItemPress = (item: BorrowedMoney) => {
    setSelectedBorrowedMoney(item);
    setShowDetailsModal(true);
  };

  const processPayment = async () => {
    if (!selectedBorrowedMoneyForPayment || !selectedWallet) return;
    
    try {
      setShowPaymentModal(false);
      await borrowedMoneyService.markAsPaid(selectedBorrowedMoneyForPayment.id, selectedWallet);
      await loadBorrowedMoneyData();
      setShowDetailsModal(false);
      setSelectedBorrowedMoneyForPayment(null);
      Alert.alert('Success', `Debt of $${selectedBorrowedMoneyForPayment.amount} repaid to ${selectedBorrowedMoneyForPayment.personName}`);
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

      // Load wallets to select from
      const wallets = await localStorageService.getWallets();
      if (wallets.length === 0) {
        Alert.alert('No Wallets', 'You need to have at least one wallet to make the payment from.');
        return;
      }

      // If only one wallet, use it automatically
      if (wallets.length === 1) {
        await borrowedMoneyService.markAsPaid(id, wallets[0].id);
        await loadBorrowedMoneyData();
        setShowDetailsModal(false);
        Alert.alert('Success', `Debt of $${borrowedMoney.amount} repaid to ${borrowedMoney.personName}`);
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

  const handleEdit = async (editedItem: BorrowedMoney) => {
    try {
      await borrowedMoneyService.updateBorrowedMoney(editedItem.id, editedItem);
      await loadBorrowedMoneyData(); // Reload data
    } catch (error) {
      console.error('Error updating borrowed money:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await borrowedMoneyService.deleteBorrowedMoney(id);
      await loadBorrowedMoneyData(); // Reload data
    } catch (error) {
      console.error('Error deleting borrowed money:', error);
    }
  };

  const handleAdd = async (newItem: Omit<BorrowedMoney, 'id'>) => {
    try {
      await borrowedMoneyService.addBorrowedMoney(newItem);
      await loadBorrowedMoneyData(); // Reload data
    } catch (error) {
      console.error('Error adding borrowed money:', error);
    }
  };

  const handleAddWithReminder = async (newItem: Omit<BorrowedMoney, 'id'>) => {
    try {
      const newBorrowedMoney = await borrowedMoneyService.addBorrowedMoney(newItem);
      await loadBorrowedMoneyData(); // Reload data
      
      // Reminder will be handled internally without navigating to reminders screen
      console.log(`Borrowed money added with reminder: ${newBorrowedMoney.id}`);
    } catch (error) {
      console.error('Error adding borrowed money with reminder:', error);
    }
  };

  const filteredList = borrowedMoneyList.filter(item => {
    if (filter === 'pending') return !item.isPaid;
    if (filter === 'paid') return item.isPaid;
    return true;
  });

  const totalPending = borrowedMoneyList
    .filter(item => !item.isPaid)
    .reduce((sum, item) => sum + item.amount, 0);

  const totalPaid = borrowedMoneyList
    .filter(item => item.isPaid)
    .reduce((sum, item) => sum + item.amount, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, isPaid: boolean) => {
    return new Date(dueDate) < new Date() && !isPaid;
  };

  const renderBorrowedMoneyItem = (item: BorrowedMoney) => {
    const overdue = isOverdue(item.dueDate, item.isPaid);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.borrowedMoneyCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.personInfo}>
            <Text style={[styles.personName, { color: theme.colors.text }]}>
              {item.personName}
            </Text>
            <Text style={[styles.reason, { color: theme.colors.textSecondary }]}>
              {item.reason}
            </Text>
          </View>
          <View style={styles.amountInfo}>
            <Text style={[styles.amount, { color: theme.colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: item.isPaid 
                  ? theme.colors.success 
                  : overdue 
                    ? '#FF3B30' 
                    : theme.colors.warning
              }
            ]}>
              <Text style={styles.statusText}>
                {item.isPaid ? t('paid') : overdue ? t('overdue') : t('pending')}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
              {t('borrowed')}: {formatDate(item.borrowedDate)}
            </Text>
            <Text style={[
              styles.dateLabel, 
              { color: overdue ? '#FF3B30' : theme.colors.textSecondary }
            ]}>
              {t('due')}: {formatDate(item.dueDate)}
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={theme.colors.textSecondary} 
          />
        </View>
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
                Repay Debt
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
                Repay to {selectedBorrowedMoneyForPayment.personName}
              </Text>
              <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>
                ${selectedBorrowedMoneyForPayment.amount}
              </Text>
            </View>

            <View style={styles.walletSelection}>
              <Text style={[styles.walletSelectionLabel, { color: theme.colors.text }]}>
                Select wallet to pay from
              </Text>
              <ScrollView style={styles.walletsList}>
                {/* Wallet selection will be implemented here */}
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
                <Text style={styles.payButtonText}>Repay Debt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      
      {/* Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButtonHeader}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('borrowed_money_history')}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowAddModal(true)} 
            style={styles.addButtonHeader}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content Container */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summarySection}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            {t('total_pending')}
          </Text>
          <Text style={[styles.summaryAmount, { color: '#FF9500' }]}>
            {formatCurrency(totalPending)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            {t('total_paid')}
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
            {formatCurrency(totalPaid)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            {t('total_records')}
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>
            {borrowedMoneyList.length}
          </Text>
        </View>
      </ScrollView>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        {(['all', 'pending', 'paid'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === filterOption 
                  ? theme.colors.primary 
                  : theme.colors.surface
              }
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterTabText,
              {
                color: filter === filterOption 
                  ? 'white' 
                  : theme.colors.text
              }
            ]}>
              {t(filterOption)}
              {filterOption === 'pending' && ` (${borrowedMoneyList.filter(item => !item.isPaid).length})`}
              {filterOption === 'paid' && ` (${borrowedMoneyList.filter(item => item.isPaid).length})`}
              {filterOption === 'all' && ` (${borrowedMoneyList.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('loading_borrowed_money')}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {filteredList.length > 0 ? (
            filteredList.map(renderBorrowedMoneyItem)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="people-outline" 
                size={64} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                {t('no_borrowed_money_history')}
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                {filter === 'all' 
                  ? t('add_first_borrowed_record')
                  : t('no_filtered_records').replace('{filter}', t(filter))
                }
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Details Modal */}
      <BorrowedMoneyDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        borrowedMoney={selectedBorrowedMoney}
        onMarkAsPaid={handleMarkAsPaid}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add Modal */}
      <AddBorrowedMoneyModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        onAddWithReminder={handleAddWithReminder}
      />

      {/* Payment Modal */}
      {renderPaymentModal()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  darkHeader: {
    backgroundColor: '#1C1C1E',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  addButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  borrowedMoneyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
});

export default BorrowedMoneyHistoryScreen;