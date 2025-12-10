import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon?: string;
}

interface AddMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMoney: (moneyData: {
    title: string;
    amount: number;
    date: string;
    description?: string;
    walletId: string;
  }) => void;
  selectedWallet?: Wallet | null;
  availableWallets?: Wallet[];
  allowWalletSelection?: boolean;
}

const { width } = Dimensions.get('window');

const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  visible,
  onClose,
  onAddMoney,
  selectedWallet = null,
  availableWallets = [],
  allowWalletSelection = false,
}) => {
  const { theme } = useTheme();
  const { formatCurrency, t } = useLocalization();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentSelectedWallet, setCurrentSelectedWallet] = useState<Wallet | null>(selectedWallet);

  // Update current selected wallet when prop changes
  React.useEffect(() => {
    setCurrentSelectedWallet(selectedWallet);
  }, [selectedWallet]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDescription('');
    setDate(new Date());
    setErrors({});
    setIsLoading(false);
    if (allowWalletSelection) {
      setCurrentSelectedWallet(availableWallets.length > 0 ? availableWallets[0] : null);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = t('title_required');
    }

    if (!amount.trim()) {
      newErrors.amount = t('amount_required');
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = t('valid_amount');
    }

    if (allowWalletSelection && !currentSelectedWallet) {
      newErrors.wallet = t('add_money_wallet_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        const moneyData = {
          title: title.trim(),
          amount: parseFloat(amount),
          date: date.toISOString().split('T')[0],
          description: description.trim() || undefined,
          walletId: currentSelectedWallet?.id || '',
        };

        await onAddMoney(moneyData);
        resetForm();
        onClose();
      } catch (error) {
        console.error('Error adding money:', error);
        Alert.alert(t('error'), t('add_money_error'));
      } finally {
        setIsLoading(false);
      }
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

  const quickAmounts = [20, 50, 100, 200, 500];

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

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
            <Text style={styles.headerTitle}>
              {allowWalletSelection ? t('add_money_title') : t('add_money_to_wallet', { wallet: currentSelectedWallet?.name || 'Wallet' })}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={styles.saveButton}
              disabled={isLoading}
            >
              <Text style={[
                styles.saveButtonText, 
                { color: isLoading ? '#8E8E93' : '#10B981' }
              ]}>
                {isLoading ? t('add_money_adding') : t('add')}
              </Text>
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
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
          {/* Wallet Info */}
          {currentSelectedWallet && (
            <View style={[styles.walletInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.walletIcon, { backgroundColor: currentSelectedWallet.color || theme.colors.success }]}>
                <Ionicons 
                  name={currentSelectedWallet.type === 'BANK' ? 'card' : currentSelectedWallet.type === 'CASH' ? 'cash' : 'wallet'} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={[styles.walletInfoText, { color: theme.colors.text }]}>
                {t('add_money_adding_to')}<Text style={{ fontWeight: '600' }}>{currentSelectedWallet.name}</Text>
              </Text>
              <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                {t('add_money_current_balance', { balance: formatCurrency(currentSelectedWallet.balance) })}
              </Text>
            </View>
          )}

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

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountsContainer}>
              <Text style={[styles.quickAmountsLabel, { color: theme.colors.textSecondary }]}>
                {t('add_money_quick_amounts')}
              </Text>
              <View style={styles.quickAmounts}>
                {quickAmounts.map((quickAmount) => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                      amount === quickAmount.toString() && {
                        backgroundColor: theme.colors.success,
                        borderColor: theme.colors.success,
                      }
                    ]}
                    onPress={() => handleQuickAmount(quickAmount)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      { color: theme.colors.text },
                      amount === quickAmount.toString() && { color: 'white' }
                    ]}>
                      ${quickAmount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Wallet Selection */}
          {allowWalletSelection && availableWallets.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('add_money_select_wallet')}</Text>
              <View style={[styles.walletsContainer, { backgroundColor: theme.colors.surface }]}>
                {availableWallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletItem,
                      { borderBottomColor: theme.colors.border },
                      currentSelectedWallet?.id === wallet.id && {
                        backgroundColor: theme.isDark ? theme.colors.card : '#E8F5E8'
                      },
                    ]}
                    onPress={() => setCurrentSelectedWallet(wallet)}
                  >
                    <View style={styles.walletLeft}>
                      <View style={[styles.walletIconSmall, { backgroundColor: wallet.color }]}>
                        <Ionicons
                          name={
                            wallet.type === 'BANK'
                              ? 'card'
                              : wallet.type === 'CASH'
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
                        <Text style={[styles.walletBalanceSmall, { color: theme.colors.textSecondary }]}>
                          {formatCurrency(wallet.balance)}
                        </Text>
                      </View>
                    </View>
                    {currentSelectedWallet?.id === wallet.id && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {errors.wallet && <Text style={styles.errorText}>{errors.wallet}</Text>}
            </View>
          )}

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('title')}</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border, 
                  color: theme.colors.text 
                }, 
                errors.title && styles.inputError
              ]}
              placeholder={t('add_money_placeholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('date')}</Text>
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDate(date)}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('description_optional')}</Text>
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
              placeholder={t('add_money_note_placeholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Add Money Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              { 
                backgroundColor: theme.colors.success,
                opacity: (isLoading || !title.trim() || !amount.trim()) ? 0.6 : 1 
              }
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !title.trim() || !amount.trim() || (allowWalletSelection && !currentSelectedWallet)}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>
              {isLoading ? t('add_money_adding_money') : t('add_money_button', { amount: amount ? formatCurrency(parseFloat(amount) || 0) : '$0' })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
        </View>
      </View>
    </Modal>
  );
};

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
    marginHorizontal: 10,
  },
  saveButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7ED321',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletInfoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  section: {
    marginBottom: 24,
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
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7ED321',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7ED321',
  },
  quickAmountsContainer: {
    marginTop: 12,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ED321',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 'auto',
  },
  walletsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
  walletIconSmall: {
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
  walletBalanceSmall: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default AddMoneyModal;
