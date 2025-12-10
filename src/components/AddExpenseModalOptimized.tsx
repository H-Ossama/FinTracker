/**
 * Optimized Add Expense Modal with performance improvements
 * - Memoized components to prevent unnecessary re-renders
 * - Debounced input handling
 * - Lazy loading of heavy components
 * - Reduced StyleSheet calculations
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { hybridDataService, HybridWallet } from '../services/hybridDataService';
import { LocalCategory } from '../services/localStorageService';
import { 
  useStableCallback, 
  useDebouncedValue, 
  useStyles,
  withMemoization 
} from '../utils/performanceUtils';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExpense: (expense: {
    title: string;
    amount: number;
    category: string;
    walletId: string;
    date: string;
    description?: string;
  }) => void;
}

// Memoized category item component
const CategoryItem = memo<{
  category: LocalCategory;
  isSelected: boolean;
  onPress: (id: string) => void;
  theme: any;
}>(({ category, isSelected, onPress, theme }) => {
  const handlePress = useCallback(() => {
    onPress(category.id);
  }, [category.id, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        isSelected && { backgroundColor: theme.isDark ? theme.colors.card : '#F0F4FF' },
      ]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: category.color },
          isSelected && styles.categoryIconSelected,
        ]}
      >
        <Text style={styles.categoryEmoji}>{category.icon}</Text>
      </View>
      <Text
        style={[
          styles.categoryName,
          { color: theme.colors.textSecondary },
          isSelected && { color: theme.colors.primary, fontWeight: '600' },
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
});

// Memoized wallet item component
const WalletItem = memo<{
  wallet: HybridWallet;
  isSelected: boolean;
  onPress: (id: string) => void;
  theme: any;
}>(({ wallet, isSelected, onPress, theme }) => {
  const handlePress = useCallback(() => {
    onPress(wallet.id);
  }, [wallet.id, onPress]);

  const iconName = wallet.type === 'BANK' ? 'card' : wallet.type === 'CASH' ? 'cash' : 'wallet';

  return (
    <TouchableOpacity
      style={[
        styles.walletItem,
        { borderBottomColor: theme.colors.border },
        isSelected && { backgroundColor: theme.isDark ? theme.colors.card : '#F0F4FF' },
      ]}
      onPress={handlePress}
    >
      <View style={styles.walletLeft}>
        <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
          <Ionicons name={iconName as any} size={16} color="white" />
        </View>
        <View>
          <Text style={[styles.walletName, { color: theme.colors.text }]}>{wallet.name}</Text>
          <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
            ${wallet.balance.toFixed(2)}
          </Text>
        </View>
      </View>
      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />}
    </TouchableOpacity>
  );
});

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onAddExpense,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  
  // State with stable references
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [wallets, setWallets] = useState<HybridWallet[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced values for better performance
  const debouncedTitle = useDebouncedValue(title, 300);
  const debouncedAmount = useDebouncedValue(amount, 300);

  // Memoized styles
  const modalStyles = useStyles(() => ({
    container: [styles.container, { backgroundColor: theme.colors.background }],
    header: [styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }],
    headerTitle: [styles.headerTitle, { color: theme.colors.text }],
    saveButtonText: [styles.saveButtonText, { color: theme.colors.primary }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
  }), [theme]);

  // Stable callback references
  const loadData = useStableCallback(async () => {
    try {
      setLoading(true);
      const fetchedWallets = await hybridDataService.getWallets();
      setWallets(fetchedWallets);
      
      const localCategories: LocalCategory[] = [
        { id: 'food', name: t('food'), icon: '🍔', color: '#9013FE', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'utilities', name: t('utilities'), icon: '💡', color: '#F5A623', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'transport', name: t('transport'), icon: '🚗', color: '#4A90E2', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'shopping', name: t('shopping'), icon: '🛍️', color: '#D0021B', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'entertainment', name: t('entertainment'), icon: '🎬', color: '#7ED321', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'healthcare', name: t('healthcare'), icon: '🏥', color: '#BD10E0', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'subscriptions', name: t('subscriptions'), icon: '📱', color: '#B8E986', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'other', name: t('other'), icon: '📄', color: '#8E8E93', isCustom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      setCategories(localCategories);
      
      if (fetchedWallets.length > 0 && !selectedWallet) {
        setSelectedWallet(fetchedWallets[0].id);
      }
      if (localCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(localCategories[0].id);
      }
    } catch (error) {
      console.error('Error loading data for expense modal:', error);
    } finally {
      setLoading(false);
    }
  }, [t, selectedWallet, selectedCategory]);

  const resetForm = useStableCallback(() => {
    setTitle('');
    setAmount('');
    setDescription('');
    setDate(new Date());
    setErrors({});
    if (categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
    if (wallets.length > 0) {
      setSelectedWallet(wallets[0].id);
    }
  }, [categories, wallets]);

  const validateForm = useStableCallback(() => {
    const newErrors: { [key: string]: string } = {};

    if (!debouncedTitle.trim()) {
      newErrors.title = t('title_required');
    }

    if (!debouncedAmount.trim()) {
      newErrors.amount = t('amount_required');
    } else if (isNaN(parseFloat(debouncedAmount)) || parseFloat(debouncedAmount) <= 0) {
      newErrors.amount = t('valid_amount');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [debouncedTitle, debouncedAmount, t]);

  const handleSubmit = useStableCallback(() => {
    if (validateForm()) {
      const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
      const expense = {
        title: debouncedTitle.trim(),
        amount: parseFloat(debouncedAmount),
        category: selectedCategoryObj?.name || 'General',
        categoryId: selectedCategory,
        walletId: selectedWallet,
        date: date.toISOString().split('T')[0],
        description: description.trim() || undefined,
      };

      onAddExpense(expense);
      resetForm();
      onClose();
    }
  }, [validateForm, categories, selectedCategory, debouncedTitle, debouncedAmount, selectedWallet, date, description, onAddExpense, resetForm, onClose]);

  const handleClose = useStableCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const onDateChange = useStableCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const handleCategoryPress = useStableCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleWalletPress = useStableCallback((walletId: string) => {
    setSelectedWallet(walletId);
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        
        {/* Dark Header */}
        <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('add_expense_title')}</Text>
            <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content Container */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('loading')}</Text>
              </View>
            ) : (
              <>
                {/* Amount Input */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('amount')}</Text>
                  <View style={[styles.amountContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, errors.amount && styles.inputError]}>
                    <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
                    <TextInput
                      style={[styles.amountInput, { color: theme.colors.text }]}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>

                {/* Title Input */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('title')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }, errors.title && styles.inputError]}
                    placeholder={t('what_spend_on')}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                  />
                  {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                </View>

                {/* Category Selection */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('category')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                  >
                    {categories.map((category) => (
                      <CategoryItem
                        key={category.id}
                        category={category}
                        isSelected={selectedCategory === category.id}
                        onPress={handleCategoryPress}
                        theme={theme}
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* Wallet Selection */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('pay_from')}</Text>
                  <View style={[styles.walletsContainer, { backgroundColor: theme.colors.surface }]}>
                    {wallets.map((wallet) => (
                      <WalletItem
                        key={wallet.id}
                        wallet={wallet}
                        isSelected={selectedWallet === wallet.id}
                        onPress={handleWalletPress}
                        theme={theme}
                      />
                    ))}
                  </View>
                </View>

                {/* Date Selection */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('date')}</Text>
                  <TouchableOpacity 
                    style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.dateText, { color: theme.colors.text }]}>
                      {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Description Input */}
                <View style={styles.section}>
                  <Text style={modalStyles.sectionTitle}>{t('description_optional')}</Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder={t('add_note')}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
        </View>
      </View>
    </Modal>
  );
};

// Optimize styles by creating them only once
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
  closeButton: {
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
  saveButton: {
    paddingHorizontal: 4,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  categoriesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconSelected: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  walletsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  walletBalance: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
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

export default withMemoization(AddExpenseModal);