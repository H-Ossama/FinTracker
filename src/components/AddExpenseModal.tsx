import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { mockWallets, mockSpendingCategories } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';

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

const { width } = Dimensions.get('window');

const categories = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#9013FE' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#F5A623' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#4A90E2' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#D0021B' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#7ED321' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: '#BD10E0' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', color: '#B8E986' },
  { id: 'other', name: 'Other', icon: '📄', color: '#8E8E93' },
];

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onAddExpense,
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedWallet, setSelectedWallet] = useState(mockWallets[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setSelectedCategory(categories[0]);
    setSelectedWallet(mockWallets[0]);
    setDescription('');
    setDate(new Date());
    setErrors({});
  };

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
      const expense = {
        title: title.trim(),
        amount: parseFloat(amount),
        category: selectedCategory.name,
        walletId: selectedWallet.id,
        date: date.toISOString().split('T')[0],
        description: description.trim() || undefined,
      };

      onAddExpense(expense);
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Expense</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.headerButton}>
            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }, errors.title && styles.inputError]}
              placeholder="What did you spend on?"
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
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory.id === category.id && { backgroundColor: theme.isDark ? theme.colors.card : '#F0F4FF' },
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
                      selectedCategory.id === category.id && { color: theme.colors.primary, fontWeight: '600' },
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pay From</Text>
            <View style={[styles.walletsContainer, { backgroundColor: theme.colors.surface }]}>
              {mockWallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletItem,
                    { borderBottomColor: theme.colors.border },
                    selectedWallet.id === wallet.id && { backgroundColor: theme.isDark ? theme.colors.card : '#F0F4FF' },
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
                      <Text style={[styles.walletName, { color: theme.colors.text }]}>{wallet.name}</Text>
                      <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>${wallet.balance.toFixed(2)}</Text>
                    </View>
                  </View>
                  {selectedWallet.id === wallet.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date</Text>
            <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDate(date)}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Add a note..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
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
    color: '#4A90E2',
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
  categoryItemSelected: {
    backgroundColor: '#F0F4FF',
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
  categoryNameSelected: {
    color: '#4A90E2',
    fontWeight: '600',
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
  walletItemSelected: {
    backgroundColor: '#F0F4FF',
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
});

export default AddExpenseModal;