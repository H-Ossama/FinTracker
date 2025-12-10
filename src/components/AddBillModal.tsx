import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { billsService } from '../services/billsService';
import { Bill, BillCategory } from '../types';

interface AddBillModalProps {
  visible: boolean;
  onClose: () => void;
  onBillAdded: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  visible,
  onClose,
  onBillAdded,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    frequency: 'monthly' as Bill['frequency'],
    categoryId: '',
    isRecurring: true,
    isAutoPay: false,
    reminderDays: 3,
    remindersPerDay: 1,
    notes: '',
  });

  const styles = createStyles(theme);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const categoriesData = await billsService.getBillCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      categoryId: '',
      isRecurring: true,
      isAutoPay: false,
      reminderDays: 3,
      remindersPerDay: 1,
      notes: '',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim() || !formData.amount || !formData.categoryId) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const category = categories.find(c => c.id === formData.categoryId);
      if (!category) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      setLoading(true);

      await billsService.createBill({
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        frequency: formData.frequency,
        category: category.name,
        categoryId: formData.categoryId,
        isRecurring: formData.isRecurring,
        isAutoPay: formData.isAutoPay,
        status: 'upcoming',
        reminderDays: formData.reminderDays,
        remindersPerDay: formData.remindersPerDay,
        notes: formData.notes.trim(),
      });

      resetForm();
      onBillAdded();
      onClose();
      Alert.alert('Success', 'Bill added successfully!');
    } catch (error) {
      console.error('Error adding bill:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add bill');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        
        {/* Dark Header */}
        <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Bill</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
              <Text style={[styles.saveButtonText, { 
                color: loading ? '#8E8E93' : '#4A90E2' 
              }]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content Container */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Bill Title *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                value={formData.title}
                onChangeText={(text) => updateFormData('title', text)}
                placeholder="e.g., Electricity Bill, Rent Payment"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Amount *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                value={formData.amount}
                onChangeText={(text) => updateFormData('amount', text)}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formTextArea, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                value={formData.description}
                onChangeText={(text) => updateFormData('description', text)}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={200}
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={`bill-category-${category.id}-${index}`}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: formData.categoryId === category.id 
                        ? category.color + '20' 
                        : theme.colors.surface,
                      borderColor: formData.categoryId === category.id 
                        ? category.color 
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => updateFormData('categoryId', category.id)}
                >
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                  <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Schedule</Text>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Due Date</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text,
                    borderColor: theme.colors.border 
                  }]}
                  value={formData.dueDate}
                  onChangeText={(text) => updateFormData('dueDate', text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Frequency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(['weekly', 'monthly', 'yearly', 'one-time'] as const).map((freq, index) => (
                    <TouchableOpacity
                      key={`frequency-${freq}-${index}`}
                      style={[
                        styles.frequencyOption,
                        {
                          backgroundColor: formData.frequency === freq 
                            ? theme.colors.primary 
                            : theme.colors.surface,
                          borderColor: formData.frequency === freq 
                            ? theme.colors.primary 
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => updateFormData('frequency', freq)}
                    >
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          {
                            color: formData.frequency === freq ? '#FFFFFF' : theme.colors.text,
                          },
                        ]}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
            
            <View style={styles.switchContainer}>
              <View style={styles.switchItem}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Recurring Bill</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Automatically schedule next payment
                  </Text>
                </View>
                <Switch
                  value={formData.isRecurring}
                  onValueChange={(value) => updateFormData('isRecurring', value)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={formData.isRecurring ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>

              <View style={styles.switchItem}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Auto Pay</Text>
                  <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                    Mark as paid automatically
                  </Text>
                </View>
                <Switch
                  value={formData.isAutoPay}
                  onValueChange={(value) => updateFormData('isAutoPay', value)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={formData.isAutoPay ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminder (days before due)</Text>
              <View style={styles.reminderOptions}>
                {[1, 3, 7, 14].map((days, index) => (
                  <TouchableOpacity
                    key={`reminder-days-${days}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: formData.reminderDays === days 
                          ? theme.colors.primary 
                          : theme.colors.surface,
                        borderColor: formData.reminderDays === days 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => updateFormData('reminderDays', days)}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: formData.reminderDays === days ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminders per day</Text>
              <View style={styles.reminderOptions}>
                {[1, 2, 3, 4].map((count, index) => (
                  <TouchableOpacity
                    key={`reminders-per-day-${count}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: formData.remindersPerDay === count 
                          ? theme.colors.primary 
                          : theme.colors.surface,
                        borderColor: formData.remindersPerDay === count 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => updateFormData('remindersPerDay', count)}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: formData.remindersPerDay === count ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {count}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.formTextArea, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                value={formData.notes}
                onChangeText={(text) => updateFormData('notes', text)}
                placeholder="Additional notes about this bill"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={300}
              />
            </View>
          </View>
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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
    width: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  categoriesScroll: {
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 100,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  frequencyOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  switchContainer: {
    marginBottom: 16,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  reminderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reminderOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AddBillModal;