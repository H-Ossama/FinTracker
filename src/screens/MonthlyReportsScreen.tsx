import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { localStorageService } from '../services/localStorageService';

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
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MonthRow[]>([]);

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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Monthly Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading reports…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Summary (shown months)</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Income</Text>
              <Text style={[styles.summaryValue, { color: '#32D74B' }]}>{formatCurrency(totals.income)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>{formatCurrency(totals.expense)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Net</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {formatCurrency(totals.income - totals.expense)}
              </Text>
            </View>
          </View>

          {rows.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}> 
              <Ionicons name="document-text-outline" size={22} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No transactions yet.</Text>
            </View>
          ) : (
            rows.map((r) => {
              const net = r.income - r.expense;
              return (
                <View key={`month-${r.month}`} style={[styles.monthCard, { backgroundColor: theme.colors.surface }]}> 
                  <View style={styles.monthHeader}>
                    <Text style={[styles.monthTitle, { color: theme.colors.text }]}>{monthLabel(r.month)}</Text>
                    <Text style={[styles.monthCount, { color: theme.colors.textSecondary }]}>{r.count} tx</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Income</Text>
                    <Text style={[styles.value, { color: '#32D74B' }]}>{formatCurrency(r.income)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Expenses</Text>
                    <Text style={[styles.value, { color: '#FF6B6B' }]}>{formatCurrency(r.expense)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Net</Text>
                    <Text style={[styles.value, { color: net >= 0 ? '#32D74B' : '#FF6B6B' }]}>
                      {formatCurrency(net)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthCard: {
    padding: 14,
    borderRadius: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default MonthlyReportsScreen;
