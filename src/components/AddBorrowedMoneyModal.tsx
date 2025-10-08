import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { BorrowedMoney } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';

interface AddBorrowedMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (borrowedMoney: Omit<BorrowedMoney, 'id'>) => void;
  onAddWithReminder?: (borrowedMoney: Omit<BorrowedMoney, 'id'>) => void;
}

const AddBorrowedMoneyModal: React.FC<AddBorrowedMoneyModalProps> = ({
  visible,
  onClose,
  onAdd,
  onAddWithReminder,
}) => {
  const { theme } = useTheme();
  const { headerPadding } = useSafeAreaHelper();
  const [formData, setFormData] = useState({
    personName: '',
    amount: '',
    reason: '',
    dueDate: new Date(),
    notes: '',
    phoneNumber: '',
    email: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addToReminders, setAddToReminders] = useState(true);

  const resetForm = () => {
    setFormData({
      personName: '',
      amount: '',
      reason: '',
      dueDate: new Date(),
      notes: '',
      phoneNumber: '',
      email: '',
    });
    setAddToReminders(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = () => {
    if (!formData.personName.trim()) {
      Alert.alert('Error', 'Please enter the person\'s name');
      return;
    }
    
    if (!formData.amount.trim() || isNaN(Number(formData.amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (!formData.reason.trim()) {
      Alert.alert('Error', 'Please enter the reason for borrowing');
      return;
    }

    const borrowedMoney: Omit<BorrowedMoney, 'id'> = {
      personName: formData.personName.trim(),
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
      borrowedDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate.toISOString().split('T')[0],
      isPaid: false,
      notes: formData.notes.trim() || undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      email: formData.email.trim() || undefined,
    };

    if (addToReminders && onAddWithReminder) {
      onAddWithReminder(borrowedMoney);
    } else {
      onAdd(borrowedMoney);
    }
    
    resetForm();
    onClose();
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setFormData({...formData, dueDate: selectedDate});
    }
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
        <View style={[styles.header, { borderBottomColor: theme.colors.border }, headerPadding]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Add Borrowed Money
          </Text>
          <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
            <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
          {/* Person Details Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Person Details
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Name *
              </Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.personName}
                onChangeText={(text) => setFormData({...formData, personName: text})}
                placeholder="Enter person's name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Phone Number
              </Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                placeholder="Enter phone number"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Enter email address"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Loan Details Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Loan Details
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Amount *
              </Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.amount}
                onChangeText={(text) => setFormData({...formData, amount: text})}
                placeholder="Enter amount"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Reason *
              </Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.reason}
                onChangeText={(text) => setFormData({...formData, reason: text})}
                placeholder="Why did they borrow this money?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Due Date * 
              </Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.datePickerText, { color: theme.colors.text }]}>
                  {formatDateForDisplay(formData.dueDate)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={formData.dueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Notes
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background 
                }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({...formData, notes: text})}
                placeholder="Additional notes or comments"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerText, { color: theme.colors.textSecondary }]}>
              * Required fields
            </Text>
          </View>

          {/* Add to Reminders Toggle */}
          <View style={[styles.reminderSection, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.reminderHeader}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.reminderTitle, { color: theme.colors.text }]}>
                Add to Reminders
              </Text>
            </View>
            <Text style={[styles.reminderSubtitle, { color: theme.colors.textSecondary }]}>
              Automatically create a reminder for the due date
            </Text>
            <TouchableOpacity 
              style={[styles.reminderToggle, { 
                backgroundColor: addToReminders ? theme.colors.primary : theme.colors.border 
              }]}
              onPress={() => setAddToReminders(!addToReminders)}
            >
              <View style={[styles.reminderToggleKnob, {
                transform: [{ translateX: addToReminders ? 20 : 0 }],
                backgroundColor: 'white'
              }]} />
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
  },
  closeButton: {
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
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
  },
  disclaimer: {
    padding: 16,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  reminderSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reminderSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  reminderToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reminderToggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginHorizontal: 2,
  },
});

export default AddBorrowedMoneyModal;