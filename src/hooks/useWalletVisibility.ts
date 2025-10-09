import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from '../contexts/LocalizationContext';

const HIDDEN_WALLETS_KEY = 'hiddenWallets';

export const useWalletVisibility = () => {
  const { formatCurrency } = useLocalization();
  const [hiddenWallets, setHiddenWallets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHiddenWallets();
  }, []);

  const loadHiddenWallets = async () => {
    try {
      const hidden = await AsyncStorage.getItem(HIDDEN_WALLETS_KEY);
      if (hidden) {
        setHiddenWallets(JSON.parse(hidden));
      }
    } catch (error) {
      console.error('Error loading hidden wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isWalletHidden = (walletId: string): boolean => {
    return hiddenWallets.includes(walletId);
  };

  const formatWalletBalance = (balance: number, walletId?: string): string => {
    if (walletId && isWalletHidden(walletId)) {
      return '••••••••';
    }
    return formatCurrency(balance);
  };

  const getVisibleWallets = <T extends { id: string }>(wallets: T[]): T[] => {
    return wallets.filter(wallet => !isWalletHidden(wallet.id));
  };

  const getTotalVisibleBalance = (wallets: Array<{ id: string; balance: number }>): number => {
    return wallets
      .filter(wallet => !isWalletHidden(wallet.id))
      .reduce((sum, wallet) => sum + wallet.balance, 0);
  };

  const shouldShowBalance = (walletId?: string): boolean => {
    return !walletId || !isWalletHidden(walletId);
  };

  return {
    hiddenWallets,
    isWalletHidden,
    formatWalletBalance,
    getVisibleWallets,
    getTotalVisibleBalance,
    shouldShowBalance,
    isLoading,
    refreshHiddenWallets: loadHiddenWallets,
  };
};