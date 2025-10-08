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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface AddWalletModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWallet: (wallet: {
    name: string;
    type: 'bank' | 'cash' | 'savings' | 'investment' | 'credit';
    color: string;
    initialBalance: number;
  }) => void;
}

const { width } = Dimensions.get('window');

const walletTypes = [
  { id: 'bank', name: 'Bank Account', icon: 'card', description: 'Checking or savings account' },
  { id: 'cash', name: 'Cash', icon: 'cash', description: 'Physical cash on hand' },
  { id: 'savings', name: 'Savings', icon: 'wallet', description: 'High-yield savings account' },
  { id: 'investment', name: 'Investment', icon: 'trending-up', description: 'Investment portfolio' },
  { id: 'credit', name: 'Credit Card', icon: 'card-outline', description: 'Credit card account' },
];

const colorOptions = [
  '#4A90E2', // Blue
  '#7ED321', // Green
  '#9013FE', // Purple
  '#F5A623', // Orange
  '#D0021B', // Red
  '#50E3C2', // Teal
  '#BD10E0', // Magenta
  '#B8E986', // Light Green
  '#4ECDC4', // Cyan
  '#FF6B6B', // Light Red
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint
];

const AddWalletModal: React.FC<AddWalletModalProps> = ({
  visible,
  onClose,
  onAddWallet,
}) => {
  const { theme } = useTheme();
  const { currency, formatCurrency } = useLocalization();
  
  const getCurrencySymbol = () => {
    const symbols = { USD: '$', EUR: '€', MAD: 'MAD' };
    return symbols[currency];
  };
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState(walletTypes[0]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [initialBalance, setInitialBalance] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const resetForm = () => {
    setName('');
    setSelectedType(walletTypes[0]);
    setSelectedColor(colorOptions[0]);
    setInitialBalance('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Wallet name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!initialBalance.trim()) {
      newErrors.initialBalance = 'Initial balance is required';
    } else if (isNaN(parseFloat(initialBalance))) {
      newErrors.initialBalance = 'Please enter a valid amount';
    } else if (parseFloat(initialBalance) < 0) {
      newErrors.initialBalance = 'Balance cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const wallet = {
        name: name.trim(),
        type: selectedType.id as 'bank' | 'cash' | 'savings' | 'investment' | 'credit',
        color: selectedColor,
        initialBalance: parseFloat(initialBalance),
      };

      onAddWallet(wallet);
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add New Wallet</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.headerButton}>
            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Save</Text>
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
          {/* Wallet Preview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: selectedColor }]}>
              <View style={styles.previewHeader}>
                <View style={styles.previewTitleRow}>
                  <Ionicons 
                    name={selectedType.icon as any} 
                    size={24} 
                    color="white" 
                  />
                  <Text style={styles.previewName}>
                    {name.trim() || 'Wallet Name'}
                  </Text>
                </View>
              </View>
              <Text style={styles.previewBalance}>
                {formatCurrency(parseFloat(initialBalance) || 0)}
              </Text>
              <Text style={styles.previewType}>{selectedType.name}</Text>
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Wallet Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }, errors.name && styles.inputError]}
              placeholder="Enter wallet name"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={30}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>Choose a name that helps you identify this wallet</Text>
          </View>

          {/* Wallet Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Wallet Type</Text>
            <View style={[styles.typesContainer, { backgroundColor: theme.colors.surface }]}>
              {walletTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    { borderBottomColor: theme.colors.border },
                    selectedType.id === type.id && { backgroundColor: theme.isDark ? theme.colors.card : '#F0F4FF' },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: selectedColor + '20' },
                      selectedType.id === type.id && { backgroundColor: selectedColor },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={selectedType.id === type.id ? 'white' : selectedColor}
                    />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text
                      style={[
                        styles.typeName,
                        { color: theme.colors.text },
                        selectedType.id === type.id && { color: theme.colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {type.name}
                    </Text>
                    <Text style={[styles.typeDescription, { color: theme.colors.textSecondary }]}>{type.description}</Text>
                  </View>
                  {selectedType.id === type.id && (
                    <Ionicons name="checkmark-circle" size={20} color={selectedColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Choose Color</Text>
            <View style={[styles.colorsContainer, { backgroundColor: theme.colors.surface }]}>
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Initial Balance */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Initial Balance</Text>
            <View style={[styles.amountContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, errors.initialBalance && styles.inputError]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>{getCurrencySymbol()}</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={initialBalance}
                onChangeText={setInitialBalance}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.initialBalance && (
              <Text style={styles.errorText}>{errors.initialBalance}</Text>
            )}
            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
              Enter the current balance for this wallet (can be 0)
            </Text>
          </View>

          {/* Add Button */}
          <TouchableOpacity style={[styles.addButton, { backgroundColor: selectedColor }]} onPress={handleSubmit}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Wallet</Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
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
  previewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  previewBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  previewType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  typesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  typeItemSelected: {
    backgroundColor: '#F0F4FF',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  typeNameSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  typeDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 32,
    marginBottom: 32,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});

export default AddWalletModal;