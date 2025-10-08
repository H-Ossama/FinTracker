import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../contexts/ThemeContext';
import { Reminder } from '../screens/RemindersScreen';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface AddReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (reminder: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  reminder?: Reminder;
  categories: Category[];
}

type TransactionType = 'INCOME' | 'EXPENSE';
type ReminderFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

export default function AddReminderModal({
  visible,
  onClose,
  onSave,
  reminder,
  categories,
}: AddReminderModalProps) {
  const { isDark } = useTheme();
  const styles = createStyles(isDark);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<ReminderFrequency>('DAILY');
  const [customInterval, setCustomInterval] = useState('1');
  const [isEnabled, setIsEnabled] = useState(true);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  // Initialize form when editing
  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setAmount(reminder.amount?.toString() || '');
      setTransactionType(reminder.transactionType || 'EXPENSE');
      setCategoryId(reminder.categoryId || '');
      setDueDate(new Date(reminder.dueDate));
      setIsRecurring(reminder.isRecurring);
      setFrequency(reminder.frequency || 'DAILY');
      setCustomInterval('1');
      setIsEnabled(reminder.isActive);
    } else {
      resetForm();
    }
  }, [reminder, visible]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setTransactionType('EXPENSE');
    setCategoryId('');
    setDueDate(new Date());
    setIsRecurring(false);
    setFrequency('DAILY');
    setCustomInterval('1');
    setIsEnabled(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the reminder');
      return;
    }

    const reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      transactionType: amount ? transactionType : undefined,
      categoryId: categoryId || undefined,
      category: categoryId ? categories.find(c => c.id === categoryId) : undefined,
      dueDate: dueDate,
      isRecurring,
      frequency: frequency,
      isActive: isEnabled,
      autoCreateTransaction: !!amount,
      notifyBefore: 15, // 15 minutes default
      enablePushNotification: true,
      enableEmailNotification: false,
      status: 'PENDING',
      completedCount: 0,
      snoozeUntil: undefined,
      lastCompleted: undefined,
      nextDue: undefined,
      walletId: undefined,
      wallet: undefined,
    };

    onSave(reminderData);
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === 'date') {
        const newDate = new Date(dueDate);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDueDate(newDate);
        
        if (Platform.OS === 'android') {
          // Show time picker after date selection on Android
          setDatePickerMode('time');
          setShowTimePicker(true);
        }
      } else {
        const newDate = new Date(dueDate);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setDueDate(newDate);
      }
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getFrequencyLabel = (freq: ReminderFrequency): string => {
    switch (freq) {
      case 'DAILY': return 'Daily';
      case 'WEEKLY': return 'Weekly';
      case 'MONTHLY': return 'Monthly';
      case 'QUARTERLY': return 'Quarterly';
      case 'YEARLY': return 'Yearly';
      case 'CUSTOM': return 'Custom';
      default: return 'Select frequency';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={styles.headerIcon.color} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {reminder ? 'Edit Reminder' : 'Add Reminder'}
          </Text>
          
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
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
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter reminder title"
              placeholderTextColor={styles.placeholder.color}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description (optional)"
              placeholderTextColor={styles.placeholder.color}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Amount and Transaction Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount (optional)</Text>
            <View style={styles.amountContainer}>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={styles.placeholder.color}
                  keyboardType="numeric"
                />
              </View>
              
              {amount && (
                <View style={styles.transactionTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === 'INCOME' && styles.incomeButton,
                    ]}
                    onPress={() => setTransactionType('INCOME')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === 'INCOME' && styles.incomeButtonText,
                      ]}
                    >
                      Income
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === 'EXPENSE' && styles.expenseButton,
                    ]}
                    onPress={() => setTransactionType('EXPENSE')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === 'EXPENSE' && styles.expenseButtonText,
                      ]}
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Category */}
          {amount && (
            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoryId}
                  onValueChange={setCategoryId}
                  style={styles.picker}
                >
                  <Picker.Item label="Select category" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.id}
                      label={category.name}
                      value={category.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Due Date and Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Due Date & Time *</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setDatePickerMode('date');
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={styles.dateTimeIcon.color} />
                <Text style={styles.dateTimeText}>{formatDate(dueDate)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setDatePickerMode('time');
                  setShowTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color={styles.dateTimeIcon.color} />
                <Text style={styles.dateTimeText}>{formatTime(dueDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recurring Settings */}
          <View style={styles.section}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Recurring Reminder</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#767577', true: '#10B981' }}
                thumbColor={isRecurring ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
            
            {isRecurring && (
              <>
                <View style={styles.frequencyContainer}>
                  <Text style={styles.sublabel}>Frequency</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={frequency}
                      onValueChange={setFrequency}
                      style={styles.picker}
                    >
                      <Picker.Item label="Daily" value="DAILY" />
                      <Picker.Item label="Weekly" value="WEEKLY" />
                      <Picker.Item label="Monthly" value="MONTHLY" />
                      <Picker.Item label="Quarterly" value="QUARTERLY" />
                      <Picker.Item label="Yearly" value="YEARLY" />
                      <Picker.Item label="Custom" value="CUSTOM" />
                    </Picker>
                  </View>
                </View>
                
                {frequency === 'CUSTOM' && (
                  <View style={styles.customIntervalContainer}>
                    <Text style={styles.sublabel}>Repeat every</Text>
                    <View style={styles.customIntervalInput}>
                      <TextInput
                        style={styles.intervalInput}
                        value={customInterval}
                        onChangeText={setCustomInterval}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.intervalLabel}>days</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Enable/Disable */}
          <View style={styles.section}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Enable Reminder</Text>
              <Switch
                value={isEnabled}
                onValueChange={setIsEnabled}
                trackColor={{ false: '#767577', true: '#10B981' }}
                thumbColor={isEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.helpText}>
              Disabled reminders won't send notifications
            </Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Date/Time Pickers */}
        {(showDatePicker || showTimePicker) && (
          <DateTimePicker
            value={dueDate}
            mode={datePickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
      </View>
    </Modal>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    closeButton: {
      padding: 4,
    },
    headerIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    saveButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#10B981',
      borderRadius: 8,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginVertical: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 8,
    },
    sublabel: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
      marginBottom: 8,
    },
    input: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    placeholder: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    amountContainer: {
      gap: 12,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#D1D5DB' : '#6B7280',
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    transactionTypeContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      alignItems: 'center',
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    incomeButton: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    incomeButtonText: {
      color: '#FFFFFF',
    },
    expenseButton: {
      backgroundColor: '#EF4444',
      borderColor: '#EF4444',
    },
    expenseButtonText: {
      color: '#FFFFFF',
    },
    pickerContainer: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 8,
      overflow: 'hidden',
    },
    picker: {
      color: isDark ? '#FFFFFF' : '#1F2937',
      backgroundColor: 'transparent',
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    dateTimeIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    dateTimeText: {
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    frequencyContainer: {
      marginTop: 12,
    },
    customIntervalContainer: {
      marginTop: 12,
    },
    customIntervalInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    intervalInput: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#1F2937',
      width: 80,
      textAlign: 'center',
    },
    intervalLabel: {
      fontSize: 16,
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    helpText: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 4,
    },
  });
}