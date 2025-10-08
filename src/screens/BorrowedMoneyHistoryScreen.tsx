import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorrowedMoney } from '../types';
import { getAllBorrowedMoney, getTotalBorrowedAmount } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import BorrowedMoneyDetailsModal from '../components/BorrowedMoneyDetailsModal';
import AddBorrowedMoneyModal from '../components/AddBorrowedMoneyModal';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';

const BorrowedMoneyHistoryScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const { headerPadding } = useSafeAreaHelper();
  const [borrowedMoneyList, setBorrowedMoneyList] = useState<BorrowedMoney[]>(getAllBorrowedMoney());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBorrowedMoney, setSelectedBorrowedMoney] = useState<BorrowedMoney | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setBorrowedMoneyList(getAllBorrowedMoney());
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleItemPress = (item: BorrowedMoney) => {
    setSelectedBorrowedMoney(item);
    setShowDetailsModal(true);
  };

  const handleMarkAsPaid = (id: string) => {
    setBorrowedMoneyList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isPaid: true } : item
      )
    );
    setShowDetailsModal(false);
  };

  const handleEdit = (editedItem: BorrowedMoney) => {
    setBorrowedMoneyList(prev => 
      prev.map(item => 
        item.id === editedItem.id ? editedItem : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setBorrowedMoneyList(prev => prev.filter(item => item.id !== id));
  };

  const handleAdd = (newItem: Omit<BorrowedMoney, 'id'>) => {
    const newBorrowedMoney: BorrowedMoney = {
      ...newItem,
      id: Date.now().toString(),
    };
    setBorrowedMoneyList(prev => [newBorrowedMoney, ...prev]);
  };

  const handleAddWithReminder = async (newItem: Omit<BorrowedMoney, 'id'>) => {
    const newBorrowedMoney: BorrowedMoney = {
      ...newItem,
      id: Date.now().toString(),
    };
    setBorrowedMoneyList(prev => [newBorrowedMoney, ...prev]);
    
    // Navigate to reminders screen to set up the reminder
    navigation.navigate('Reminders', { 
      newReminder: {
        title: `Payment due from ${newItem.personName}`,
        amount: newItem.amount,
        dueDate: newItem.dueDate,
        type: 'borrowed_money',
        relatedId: newBorrowedMoney.id,
      }
    });
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
                {item.isPaid ? 'PAID' : overdue ? 'OVERDUE' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
              Borrowed: {formatDate(item.borrowedDate)}
            </Text>
            <Text style={[
              styles.dateLabel, 
              { color: overdue ? '#FF3B30' : theme.colors.textSecondary }
            ]}>
              Due: {formatDate(item.dueDate)}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }, headerPadding]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Borrowed Money
        </Text>
        <TouchableOpacity 
          onPress={() => setShowAddModal(true)} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summarySection}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Pending
          </Text>
          <Text style={[styles.summaryAmount, { color: '#FF9500' }]}>
            {formatCurrency(totalPending)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Paid
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
            {formatCurrency(totalPaid)}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Records
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
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              {filterOption === 'pending' && ` (${borrowedMoneyList.filter(item => !item.isPaid).length})`}
              {filterOption === 'paid' && ` (${borrowedMoneyList.filter(item => item.isPaid).length})`}
              {filterOption === 'all' && ` (${borrowedMoneyList.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
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
              No borrowed money records
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
              {filter === 'all' 
                ? 'Add your first borrowed money record'
                : `No ${filter} records found`
              }
            </Text>
          </View>
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
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
});

export default BorrowedMoneyHistoryScreen;