import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { hybridDataService, HybridTransaction } from '../services/hybridDataService';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';

const TransactionsHistoryScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const { headerPadding } = useSafeAreaHelper();
  
  const [transactions, setTransactions] = useState<HybridTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setTransactions([]);
      }
      
      const limit = reset ? 50 : 20; // Load more initially, then smaller chunks
      
      // Get all transactions first
      const allTransactions = await hybridDataService.getTransactions(undefined, reset ? 50 : transactions.length + 20);
      
      // Apply client-side filtering
      let filteredTransactions = allTransactions;
      if (filter !== 'all') {
        const filterType = filter.toUpperCase();
        filteredTransactions = allTransactions.filter(t => t.type === filterType);
      }
      
      if (reset) {
        setTransactions(filteredTransactions);
      } else {
        // For "load more", we would need to implement pagination differently
        // For now, just set all filtered transactions
        setTransactions(filteredTransactions);
      }
      
      // Simple check if there might be more data
      setHasMore(allTransactions.length >= limit);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || filter !== 'all') return; // Disable load more for filtered views
    
    setLoadingMore(true);
    await loadTransactions(false);
  };

  const getTransactionEmoji = (type: string, description?: string) => {
    if (type === 'INCOME') return '💰';
    if (type === 'TRANSFER') return '🔄';
    
    // For expenses, try to guess based on description
    const desc = description?.toLowerCase() || '';
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) return '🍔';
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('electricity') || desc.includes('utility')) return '💡';
    if (desc.includes('netflix') || desc.includes('subscription') || desc.includes('spotify')) return '📱';
    if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi')) return '🚗';
    if (desc.includes('shopping') || desc.includes('clothes') || desc.includes('store')) return '🛒';
    if (desc.includes('health') || desc.includes('medical') || desc.includes('doctor')) return '🏥';
    if (desc.includes('entertainment') || desc.includes('movie') || desc.includes('game')) return '🎬';
    return '💳';
  };

  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return t('today');
    if (diffDays === 2) return t('yesterday');
    if (diffDays <= 7) return `${diffDays - 1} ${t('days_ago')}`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return theme.colors.success || '#00C851';
      case 'EXPENSE': return '#FF3B30';
      case 'TRANSFER': return theme.colors.primary || '#007AFF';
      default: return theme.colors.textSecondary;
    }
  };

  const getTransactionSign = (type: string) => {
    switch (type) {
      case 'INCOME': return '+';
      case 'TRANSFER': return '↔';
      default: return '';
    }
  };

  const renderTransactionItem = ({ item: transaction }: { item: HybridTransaction }) => (
    <TouchableOpacity 
      style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => {
        // TODO: Navigate to transaction details
        console.log('Transaction pressed:', transaction.id);
      }}
    >
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.transactionEmoji}>
            {getTransactionEmoji(transaction.type, transaction.description)}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>
            {transaction.description || `${transaction.type.toLowerCase()} transaction`}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
              {formatTransactionDate(transaction.date)}
            </Text>
            {transaction.notes && (
              <>
                <Text style={[styles.transactionSeparator, { color: theme.colors.textSecondary }]}>
                  {' • '}
                </Text>
                <Text style={[styles.transactionNotes, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {transaction.notes}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: getTransactionTypeColor(transaction.type) }
        ]}>
          {getTransactionSign(transaction.type)}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={[styles.transactionType, { color: theme.colors.textSecondary }]}>
          {transaction.type.toLowerCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterTab = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      key={filterType}
      style={[
        styles.filterTab,
        {
          backgroundColor: filter === filterType 
            ? theme.colors.primary 
            : theme.colors.surface
        }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterTabText,
        {
          color: filter === filterType 
            ? 'white' 
            : theme.colors.text
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="receipt-outline" 
        size={48} 
        color={theme.colors.textSecondary} 
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {t('no_transactions')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {filter === 'all' 
          ? t('no_transactions_subtitle')
          : t('no_filtered_transactions').replace('{filter}', t(filter))
        }
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.footerLoadingText, { color: theme.colors.textSecondary }]}>
          {t('loading_more')}
        </Text>
      </View>
    );
  };

  const getTransactionStats = () => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const transfers = transactions.filter(t => t.type === 'TRANSFER').length;
    
    return { income, expense, transfers };
  };

  const stats = getTransactionStats();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={[styles.header, headerPadding]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('transactions_history')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Stats Overview */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {formatCurrency(stats.income)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('income')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>
              {formatCurrency(stats.expense)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('expenses')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.transfers}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('transfers')}
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {renderFilterTab('all', t('all'))}
          {renderFilterTab('income', t('income'))}
          {renderFilterTab('expense', t('expenses'))}
          {renderFilterTab('transfer', t('transfers'))}
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              {t('loading_transactions')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            style={styles.transactionsList}
            contentContainerStyle={[
              styles.transactionsListContent,
              { backgroundColor: theme.colors.surface }
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]} // Android
                tintColor={theme.colors.primary} // iOS
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 32, // Compensate for back button
  },
  headerSpacer: {
    width: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  transactionsList: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionsListContent: {
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionSeparator: {
    fontSize: 12,
  },
  transactionNotes: {
    fontSize: 12,
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '500',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default TransactionsHistoryScreen;