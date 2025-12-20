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
        const parsed = JSON.parse(hidden);
        if (Array.isArray(parsed)) {
          setHiddenWallets(Array.from(new Set(parsed.filter((x) => typeof x === 'string'))));
        }
      }
    } catch (error) {
      console.error('Error loading hidden wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHiddenWallets = async (nextHidden: string[]) => {
    try {
      await AsyncStorage.setItem(HIDDEN_WALLETS_KEY, JSON.stringify(nextHidden));
      setHiddenWallets(nextHidden);
    } catch (error) {
      console.error('Error saving hidden wallets:', error);
    }
  };

  const isWalletHidden = (walletId: string): boolean => {
    return hiddenWallets.includes(walletId);
  };

  const setWalletHidden = async (walletId: string, hidden: boolean) => {
    if (!walletId) return;
    const next = hidden
      ? Array.from(new Set([...hiddenWallets, walletId]))
      : hiddenWallets.filter((id) => id !== walletId);
    await saveHiddenWallets(next);
  };

  const toggleWalletHidden = async (walletId: string) => {
    await setWalletHidden(walletId, !isWalletHidden(walletId));
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
    setWalletHidden,
    toggleWalletHidden,
    formatWalletBalance,
    getVisibleWallets,
    getTotalVisibleBalance,
    shouldShowBalance,
    isLoading,
    refreshHiddenWallets: loadHiddenWallets,
  };
};