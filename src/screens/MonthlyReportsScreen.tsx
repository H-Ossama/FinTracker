import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useAds } from '../contexts/AdContext';
import { localStorageService } from '../services/localStorageService';
import { useInterstitialAd } from '../components/InterstitialAd';

type MonthRow = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  count: number;
};

const toMonthKey = (isoOrDate: string | Date): string => {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const monthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const MonthlyReportsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { adsEnabled } = useAds();
  const { showInterstitialIfNeeded, InterstitialComponent } = useInterstitialAd('MonthlyReports');

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MonthRow[]>([]);

  useEffect(() => {
    if (adsEnabled) {
      showInterstitialIfNeeded();
    }
  }, [adsEnabled, showInterstitialIfNeeded]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const transactions: any[] = await localStorageService.getTransactions();

        const map = new Map<string, MonthRow>();
        for (const tx of transactions || []) {
          const month = toMonthKey(tx.date || tx.createdAt || new Date());
          const amount = Number(tx.amount || 0);
          const type = String(tx.type || '').toUpperCase();

          const current = map.get(month) || { month, income: 0, expense: 0, count: 0 };
          if (type === 'INCOME') current.income += amount;
          else if (type === 'EXPENSE') current.expense += amount;
          else {
            // If unknown, infer by sign
            if (amount >= 0) current.income += amount;
            else current.expense += Math.abs(amount);
          }
          current.count += 1;
          map.set(month, current);
        }

        const sorted = Array.from(map.values()).sort((a, b) => (a.month < b.month ? 1 : -1));

        // Keep it lightweight: last 18 months
        const trimmed = sorted.slice(0, 18);

        if (mounted) setRows(trimmed);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.income += r.income;
        acc.expense += r.expense;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [rows]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.headerBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerBackground} />
      
      {/* Dark Header Section */}
      <View style={[styles.darkHeader, { backgroundColor: theme.colors.headerBackground, paddingTop: insets.top }]}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          
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
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.headerIconButton, { backgroundColor: theme.colors.headerSurface }]}
            onPress={() => (navigation as any).navigate('QuickSettings')}
          >
            <Ionicons name="settings-outline" size={22} color={theme.colors.headerText} />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.headerTitleSection}>
          <Text style={[styles.screenTitle, { color: theme.colors.headerText }]}>
            {t('monthly_reports') || 'Monthly Reports'}
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.colors.headerTextSecondary }]}>
            {t('view financial summary') || 'View your financial summary by month'}
          </Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              {t('loading_reports') || 'Loading reports…'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}> 
              <View style={styles.summaryHeader}>
                <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                  {t('summary') || 'Summary'} ({rows.length} {t('months') || 'months'})
                </Text>
              </View>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#34C75920' }]}>
                    <Ionicons name="trending-up" size={20} color="#34C759" />
                  </View>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {t('total income') || 'Total Income'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                    {formatCurrency(totals.income)}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#FF6B6B20' }]}>
                    <Ionicons name="trending-down" size={20} color="#FF6B6B" />
                  </View>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {t('total expenses') || 'Total Expenses'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
                    {formatCurrency(totals.expense)}
                  </Text>
                </View>
              </View>

              <View style={[styles.netBalanceBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.netBalanceLabel, { color: theme.colors.textSecondary }]}>
                  {t('net balance') || 'Net Balance'}
                </Text>
                <Text style={[styles.netBalanceValue, { 
                  color: (totals.income - totals.expense) >= 0 ? '#34C759' : '#FF6B6B' 
                }]}>
                  {formatCurrency(totals.income - totals.expense)}
                </Text>
              </View>
            </View>

            {/* Monthly Reports */}
            <View style={styles.reportsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('monthly breakdown') || 'Monthly Breakdown'}
              </Text>

              {rows.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}> 
                  <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t('no_transactions') || 'No transactions yet.'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                    {t('start_tracking') || 'Start tracking your finances to see reports'}
                  </Text>
                </View>
              ) : (
                rows.map((r) => {
                  const net = r.income - r.expense;
                  const isPositive = net >= 0;
                  
                  return (
                    <View key={`month-${r.month}`} style={[styles.monthCard, { backgroundColor: theme.colors.surface }]}> 
                      <View style={styles.monthHeader}>
                        <View style={styles.monthTitleRow}>
                          <View style={[styles.monthIconBox, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Ionicons name="calendar" size={18} color={theme.colors.primary} />
                          </View>
                          <View>
                            <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
                              {monthLabel(r.month)}
                            </Text>
                            <Text style={[styles.monthCount, { color: theme.colors.textSecondary }]}>
                              {r.count} {t('transactions') || 'transactions'}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={[styles.netBadge, { 
                          backgroundColor: isPositive ? '#34C75920' : '#FF6B6B20' 
                        }]}>
                          <Ionicons 
                            name={isPositive ? "arrow-up" : "arrow-down"} 
                            size={14} 
                            color={isPositive ? '#34C759' : '#FF6B6B'} 
                          />
                          <Text style={[styles.netBadgeText, { 
                            color: isPositive ? '#34C759' : '#FF6B6B' 
                          }]}>
                            {formatCurrency(Math.abs(net))}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                      <View style={styles.monthDetails}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailLeft}>
                            <View style={[styles.detailDot, { backgroundColor: '#34C759' }]} />
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                              {t('income') || 'Income'}
                            </Text>
                          </View>
                          <Text style={[styles.detailValue, { color: '#34C759' }]}>
                            {formatCurrency(r.income)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailLeft}>
                            <View style={[styles.detailDot, { backgroundColor: '#FF6B6B' }]} />
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                              {t('expenses') || 'Expenses'}
                            </Text>
                          </View>
                          <Text style={[styles.detailValue, { color: '#FF6B6B' }]}>
                            {formatCurrency(r.expense)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* Interstitial Ad Modal */}
      <InterstitialComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    marginHorizontal: 8,
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
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    marginTop: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Content Container
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
    overflow: 'hidden',
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  content: {
    padding: 20,
    paddingBottom: 28,
  },

  // Summary Card
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    gap: 8,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  netBalanceBox: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  netBalanceValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Reports Section
  reportsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Empty State
  emptyCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Month Cards
  monthCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  netBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  monthDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MonthlyReportsScreen;
