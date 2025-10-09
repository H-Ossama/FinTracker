import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { hybridDataService, HybridWallet } from '../services/hybridDataService';
import { LocalCategory } from '../services/localStorageService';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface AddIncomeScreenProps {
  navigation: any;
}

interface ExtendedIncomeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  actualCategoryId?: string;
  displayName?: string;
  dbCategory?: LocalCategory;
}

const defaultIncomeCategories: ExtendedIncomeCategory[] = [
  { id: 'salary', name: 'Salary', icon: 'briefcase', color: '#4A90E2' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#7ED321' },
  { id: 'business', name: 'Business', icon: 'business', color: '#9013FE' },
  { id: 'investment', name: 'Investment', icon: 'trending-up', color: '#F5A623' },
  { id: 'rental', name: 'Rental', icon: 'home', color: '#D0021B' },
  { id: 'bonus', name: 'Bonus', icon: 'gift', color: '#BD10E0' },
  { id: 'refund', name: 'Refund', icon: 'return-up-back', color: '#50E3C2' },
  { id: 'other', name: 'Other', icon: 'cash', color: '#8E8E93' },
];

const AddIncomeScreen: React.FC<AddIncomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, formatCurrency } = useLocalization();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<HybridWallet | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wallets, setWallets] = useState<HybridWallet[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<ExtendedIncomeCategory[]>(defaultIncomeCategories);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletsData, categoriesData] = await Promise.all([
        hybridDataService.getWallets(),
        hybridDataService.getCategories()
      ]);

      setWallets(walletsData);
      setCategories(categoriesData);

      // Set default selections
      if (walletsData.length > 0) {
        setSelectedWallet(walletsData[0]);
      }

      // Find or create income-related categories
      const salaryCategory = categoriesData.find(c => 
        c.name.toLowerCase().includes('salary') || 
        c.name.toLowerCase().includes('income')
      );
      
      if (salaryCategory) {
        setSelectedCategory(salaryCategory);
      }

      // Update income categories with actual category data where available
      const updatedIncomeCategories = defaultIncomeCategories.map(defaultCat => {
        const matchingCategory = categoriesData.find(c => 
          c.name.toLowerCase().includes(defaultCat.name.toLowerCase())
        );
        return {
          ...defaultCat,
          // Keep the default display name but use real category ID if found
          actualCategoryId: matchingCategory?.id,
          displayName: defaultCat.name, // Always use the nice display name
          dbCategory: matchingCategory
        };
      });
      
      setIncomeCategories(updatedIncomeCategories);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        t('error') || 'Error',
        t('failed_to_load_data') || 'Failed to load wallets and categories. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = t('title_required') || 'Title is required';
    }

    if (!amount.trim()) {
      newErrors.amount = t('amount_required') || 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = t('valid_amount') || 'Please enter a valid amount';
    }

    if (!selectedWallet) {
      newErrors.wallet = t('wallet_required') || 'Please select a wallet';
    }

    if (!selectedCategory) {
      newErrors.category = t('category_required') || 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedWallet || !selectedCategory) {
      return;
    }

    setSubmitting(true);
    try {
      const transactionData = {
        amount: parseFloat(amount),
        description: title.trim(),
        type: 'INCOME' as const,
        date: date.toISOString(),
        notes: description.trim() || undefined,
        walletId: selectedWallet.id,
        categoryId: selectedCategory.id,
      };

      await hybridDataService.createTransaction(transactionData);
      
      Alert.alert(
        t('success') || 'Success',
        (t('income_added_success') || 'Income of {amount} added to {wallet} successfully!')
          .replace('{amount}', formatCurrency(parseFloat(amount)))
          .replace('{wallet}', selectedWallet.name),
        [
          {
            text: t('ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding income:', error);
      Alert.alert(
        t('error') || 'Error',
        t('failed_to_add_income') || 'Failed to add income. Please try again.',
        [{ text: t('ok') || 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('loading') || 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('add_income_title')}</Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[styles.headerButton, submitting && styles.headerButtonDisabled]}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.success} />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.colors.success }]}>
                {t('save') || 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

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
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('amount')}</Text>
            <View style={[
              styles.amountContainer, 
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              errors.amount && styles.inputError
            ]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.success }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.success }]}
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('title')}</Text>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
                errors.title && styles.inputError
              ]}
              placeholder={t('income_description')}
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('category')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
            >
              {incomeCategories.map((category) => {
                const isSelected = selectedCategory?.id === (category.actualCategoryId || category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: isSelected 
                          ? (theme.isDark ? theme.colors.card : '#F0F9FF')
                          : 'transparent',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected 
                          ? theme.colors.primary || category.color
                          : theme.colors.border || '#E5E5EA'
                      },
                    ]}
                    onPress={() => {
                      // Use the actual database category if available, otherwise create a structure
                      const actualCategory = category.dbCategory || {
                        id: category.actualCategoryId || category.id,
                        name: category.displayName || category.name,
                        icon: category.icon,
                        color: category.color,
                        isCustom: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      setSelectedCategory(actualCategory);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: category.color },
                        isSelected && styles.categoryIconSelected,
                      ]}
                    >
                      <Ionicons 
                        name={category.icon as any} 
                        size={24} 
                        color="white" 
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.categoryName,
                        { color: theme.colors.textSecondary },
                        isSelected && { 
                          color: theme.colors.primary || '#7ED321', 
                          fontWeight: '600' 
                        },
                      ]}
                    >
                      {category.displayName || category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Wallet Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('received_in')}</Text>
            <View style={[styles.walletsContainer, { backgroundColor: theme.colors.surface }]}>
              {wallets.map((wallet) => {
                const isSelected = selectedWallet?.id === wallet.id;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletItem,
                      { borderBottomColor: theme.colors.border },
                      isSelected && { 
                        backgroundColor: theme.isDark ? theme.colors.card : '#E8F5E8' 
                      },
                    ]}
                    onPress={() => setSelectedWallet(wallet)}
                  >
                    <View style={styles.walletLeft}>
                      <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
                        <Ionicons
                          name={
                            wallet.type === 'BANK'
                              ? 'card'
                              : wallet.type === 'CASH'
                              ? 'cash'
                              : wallet.type === 'SAVINGS'
                              ? 'shield-checkmark'
                              : 'wallet'
                          }
                          size={16}
                          color="white"
                        />
                      </View>
                      <View>
                        <Text style={[styles.walletName, { color: theme.colors.text }]}>
                          {wallet.name}
                        </Text>
                        <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                          {formatCurrency(wallet.balance)}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('date')}</Text>
            <TouchableOpacity 
              style={[
                styles.dateButton, 
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {formatDate(date)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('description_optional')}
            </Text>
            <TextInput
              style={[
                styles.input, 
                styles.descriptionInput, 
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border, 
                  color: theme.colors.text 
                }
              ]}
              placeholder={t('income_note_placeholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Income Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{t('summary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('amount')}:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                {amount ? `+${formatCurrency(parseFloat(amount) || 0)}` : '$0.00'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('category') || 'Category'}:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {selectedCategory ? selectedCategory.name : t('select_category') || 'Select category'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('wallet_label') || 'Wallet'}:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {selectedWallet ? selectedWallet.name : t('select_wallet') || 'Select wallet'}
              </Text>
            </View>
          </View>
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
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7ED321',
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
    color: '#7ED321',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7ED321',
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
    paddingVertical: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 12,
    padding: 12,
    borderRadius: 16,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIconSelected: {
    borderWidth: 3,
    borderColor: '#7ED321',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  categoryName: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 70,
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
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
});

export default AddIncomeScreen;