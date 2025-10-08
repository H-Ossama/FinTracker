import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { mockWallets } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface AddIncomeScreenProps {
  navigation: any;
}

const incomeCategories = [
  { id: 'salary', name: 'Salary', icon: '💼', color: '#4A90E2' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#7ED321' },
  { id: 'business', name: 'Business', icon: '🏢', color: '#9013FE' },
  { id: 'investment', name: 'Investment', icon: '📈', color: '#F5A623' },
  { id: 'rental', name: 'Rental', icon: '🏠', color: '#D0021B' },
  { id: 'bonus', name: 'Bonus', icon: '🎁', color: '#BD10E0' },
  { id: 'refund', name: 'Refund', icon: '↩️', color: '#50E3C2' },
  { id: 'other', name: 'Other', icon: '💰', color: '#8E8E93' },
];

const AddIncomeScreen: React.FC<AddIncomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, formatCurrency } = useLocalization();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(incomeCategories[0]);
  const [selectedWallet, setSelectedWallet] = useState(mockWallets[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const income = {
        id: Date.now().toString(),
        title: title.trim(),
        amount: parseFloat(amount),
        category: selectedCategory.name,
        walletId: selectedWallet.id,
        date: date.toISOString().split('T')[0],
        type: 'income' as const,
        description: description.trim() || undefined,
      };

      // In a real app, this would save to your data store
      console.log('Adding income:', income);
      
      Alert.alert(
        'Success!',
        `Income of ${formatCurrency(parseFloat(amount))} has been added to your ${selectedWallet.name}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Income</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.headerButton}>
            <Text style={[styles.saveButtonText, { color: theme.colors.success }]}>Save</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Title</Text>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text },
                errors.title && styles.inputError
              ]}
              placeholder="What income did you receive?"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
            >
              {incomeCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory.id === category.id && { 
                      backgroundColor: theme.isDark ? theme.colors.card : '#E8F5E8' 
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color },
                      selectedCategory.id === category.id && styles.categoryIconSelected,
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: theme.colors.textSecondary },
                      selectedCategory.id === category.id && { 
                        color: theme.colors.success, 
                        fontWeight: '600' 
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Wallet Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add To</Text>
            <View style={[styles.walletsContainer, { backgroundColor: theme.colors.surface }]}>
              {mockWallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletItem,
                    { borderBottomColor: theme.colors.border },
                    selectedWallet.id === wallet.id && { 
                      backgroundColor: theme.isDark ? theme.colors.card : '#E8F5E8' 
                    },
                  ]}
                  onPress={() => setSelectedWallet(wallet)}
                >
                  <View style={styles.walletLeft}>
                    <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
                      <Ionicons
                        name={
                          wallet.type === 'bank'
                            ? 'card'
                            : wallet.type === 'cash'
                            ? 'cash'
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
                  {selectedWallet.id === wallet.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date</Text>
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
              Description (Optional)
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
              placeholder="Add a note about this income..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Income Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Amount:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                {amount ? `+${formatCurrency(parseFloat(amount) || 0)}` : '$0.00'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Category:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {selectedCategory.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Wallet:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {selectedWallet.name}
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
    borderColor: '#7ED321',
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
});

export default AddIncomeScreen;