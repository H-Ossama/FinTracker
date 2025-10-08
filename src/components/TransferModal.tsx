import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { hybridDataService } from '../services/hybridDataService';
import { Wallet } from '../types';

interface HybridWallet {
  id: string;
  name: string;
  type: 'BANK' | 'CASH' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'OTHER';
  balance: number;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'local_only' | 'pending_sync' | 'conflict';
}

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  onTransfer: (success: boolean) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  onTransfer,
}) => {
  const { theme } = useTheme();
  const { formatCurrency, currency } = useLocalization();
  
  const getCurrencySymbol = () => {
    const symbols = { USD: '$', EUR: '€', MAD: 'MAD' };
    return symbols[currency];
  };

  const [wallets, setWallets] = useState<HybridWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [fromWallet, setFromWallet] = useState<HybridWallet | null>(null);
  const [toWallet, setToWallet] = useState<HybridWallet | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showFromWallets, setShowFromWallets] = useState(false);
  const [showToWallets, setShowToWallets] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWallets();
    }
  }, [visible]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const fetchedWallets = await hybridDataService.getWallets();
      setWallets(fetchedWallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
      Alert.alert('Error', 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const getWalletIcon = (walletType: string) => {
    switch (walletType.toLowerCase()) {
      case 'bank':
        return 'card';
      case 'cash':
        return 'cash';
      case 'savings':
        return 'wallet';
      case 'credit_card':
        return 'card';
      case 'investment':
        return 'trending-up';
      default:
        return 'wallet';
    }
  };

  const resetForm = () => {
    setFromWallet(null);
    setToWallet(null);
    setAmount('');
    setNote('');
    setShowFromWallets(false);
    setShowToWallets(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTransfer = async () => {
    if (!fromWallet || !toWallet || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (fromWallet.id === toWallet.id) {
      Alert.alert('Error', 'Please select different wallets for transfer');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (transferAmount > fromWallet.balance && fromWallet.type !== 'CREDIT_CARD') {
      Alert.alert('Error', 'Insufficient balance in source wallet');
      return;
    }

    try {
      setTransferring(true);
      
      await hybridDataService.transferMoney({
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: transferAmount,
        description: note || undefined,
      });

      Alert.alert('Success', 'Transfer completed successfully!');
      onTransfer(true);
      handleClose();
    } catch (error) {
      console.error('Transfer error:', error);
      Alert.alert('Error', 'Transfer failed. Please try again.');
      onTransfer(false);
    } finally {
      setTransferring(false);
    }
  };

  const availableToWallets = fromWallet 
    ? wallets.filter(wallet => wallet.id !== fromWallet.id)
    : wallets;

  const renderWalletSelector = (
    title: string,
    selectedWallet: HybridWallet | null,
    onSelect: (wallet: HybridWallet) => void,
    showList: boolean,
    onToggle: () => void,
    walletOptions: HybridWallet[]
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{title}</Text>
      <TouchableOpacity
        style={[styles.walletSelector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={onToggle}
      >
        {selectedWallet ? (
          <View style={styles.selectedWallet}>
            <View style={[styles.walletIcon, { backgroundColor: selectedWallet.color }]}>
              <Ionicons 
                name={getWalletIcon(selectedWallet.type)} 
                size={16} 
                color="white" 
              />
            </View>
            <View style={styles.walletInfo}>
              <Text style={[styles.walletName, { color: theme.colors.text }]}>{selectedWallet.name}</Text>
              <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                {formatCurrency(selectedWallet.balance)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </View>
        ) : (
          <View style={styles.placeholderWallet}>
            <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
              Select wallet
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>

      {showList && (
        <View style={[styles.walletList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {walletOptions.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={[styles.walletOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                onSelect(wallet);
                onToggle();
              }}
            >
              <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
                <Ionicons 
                  name={getWalletIcon(wallet.type)} 
                  size={16} 
                  color="white" 
                />
              </View>
              <View style={styles.walletInfo}>
                <Text style={[styles.walletName, { color: theme.colors.text }]}>{wallet.name}</Text>
                <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(wallet.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.cancelButton, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Transfer Money</Text>
          <TouchableOpacity onPress={handleTransfer} disabled={transferring}>
            {transferring ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Transfer</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading wallets...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Transfer Direction Indicator */}
          <View style={styles.transferFlow}>
            <View style={styles.flowStep}>
              <View style={[styles.flowIcon, { backgroundColor: fromWallet?.color || theme.colors.primary }]}>
                <Ionicons 
                  name={fromWallet ? getWalletIcon(fromWallet.type) : 'wallet'} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={[styles.flowText, { color: theme.colors.textSecondary }]}>
                {fromWallet ? fromWallet.name : 'From'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={theme.colors.primary} />
            <View style={styles.flowStep}>
              <View style={[styles.flowIcon, { backgroundColor: toWallet?.color || theme.colors.success }]}>
                <Ionicons 
                  name={toWallet ? getWalletIcon(toWallet.type) : 'wallet'} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={[styles.flowText, { color: theme.colors.textSecondary }]}>
                {toWallet ? toWallet.name : 'To'}
              </Text>
            </View>
          </View>

          {/* From Wallet */}
          {renderWalletSelector(
            fromWallet ? `From: ${fromWallet.name}` : 'From Wallet',
            fromWallet,
            (wallet) => {
              setFromWallet(wallet);
              // Reset toWallet if it's the same as the newly selected fromWallet
              if (toWallet && toWallet.id === wallet.id) {
                setToWallet(null);
              }
            },
            showFromWallets,
            () => {
              setShowFromWallets(!showFromWallets);
              setShowToWallets(false);
            },
            wallets
          )}

          {/* To Wallet */}
          {renderWalletSelector(
            toWallet ? `To: ${toWallet.name}` : 'To Wallet',
            toWallet,
            setToWallet,
            showToWallets,
            () => {
              setShowToWallets(!showToWallets);
              setShowFromWallets(false);
            },
            availableToWallets
          )}

          {/* Amount */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Amount *</Text>
            <View style={[styles.amountInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>{getCurrencySymbol()}</Text>
              <TextInput
                style={[styles.amountTextInput, { color: theme.colors.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            {fromWallet && (
              <Text style={[styles.balanceHint, { color: theme.colors.textSecondary }]}>
                Available: {formatCurrency(fromWallet.balance)}
              </Text>
            )}
          </View>

          {/* Note */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Note (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note for this transfer"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Transfer Summary */}
          {fromWallet && toWallet && amount && !isNaN(parseFloat(amount)) && (
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Transfer Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>From:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{fromWallet.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>To:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{toWallet.name}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={[styles.summaryLabel, styles.totalLabel, { color: theme.colors.text }]}>Amount:</Text>
                <Text style={[styles.summaryValue, styles.totalValue, { color: theme.colors.primary }]}>
                  {formatCurrency(parseFloat(amount))}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  cancelButton: {
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  transferFlow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.05)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  flowStep: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  flowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    opacity: 1,
  },
  flowText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectorContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  walletSelector: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    padding: 16,
  },
  selectedWallet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderWallet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  walletIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  walletBalance: {
    fontSize: 14,
    color: '#8E8E93',
  },
  walletList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    marginTop: 8,
    maxHeight: 200,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  inputContainer: {
    marginBottom: 20,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '500',
    marginRight: 8,
    color: '#8E8E93',
  },
  amountTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  balanceHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    padding: 16,
    marginBottom: 20,
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
  summaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
});

export default TransferModal;