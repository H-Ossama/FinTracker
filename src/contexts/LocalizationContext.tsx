import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'de' | 'ar';
export type Currency = 'USD' | 'EUR' | 'MAD';

interface LocalizationContextType {
  language: Language;
  currency: Currency;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
}

const translations = {
  en: {
    'home': 'Home',
    'insights': 'Insights',
    'wallet': 'Wallet',
    'more': 'More',
    'good_morning': 'Good Morning!',
    'total_balance': 'Total Balance',
    'my_wallets': 'My Wallets',
    'see_all': 'See All',
    'quick_actions': 'Quick Actions',
    'add_expense': 'Add Expense',
    'transfer': 'Transfer',
    'add_income': 'Add Income',
    'recent_transactions': 'Recent Transactions',
    'smart_tip': 'Smart Tip',
    'settings': 'Settings',
    'language': 'Language',
    'currency': 'Currency',
    'dark_mode': 'Dark Mode',
    'english': 'English',
    'german': 'German',
    'arabic': 'Arabic',
  },
  de: {
    'home': 'Startseite',
    'insights': 'Einblicke',
    'wallet': 'Geldbörse',
    'more': 'Mehr',
    'good_morning': 'Guten Morgen!',
    'total_balance': 'Gesamtguthaben',
    'my_wallets': 'Meine Geldbörsen',
    'see_all': 'Alle anzeigen',
    'quick_actions': 'Schnellaktionen',
    'add_expense': 'Ausgabe hinzufügen',
    'transfer': 'Übertragen',
    'add_income': 'Einkommen hinzufügen',
    'recent_transactions': 'Letzte Transaktionen',
    'smart_tip': 'Intelligenter Tipp',
    'settings': 'Einstellungen',
    'language': 'Sprache',
    'currency': 'Währung',
    'dark_mode': 'Dunkler Modus',
    'english': 'Englisch',
    'german': 'Deutsch',
    'arabic': 'Arabisch',
  },
  ar: {
    'home': 'الرئيسية',
    'insights': 'الإحصائيات',
    'wallet': 'المحفظة',
    'more': 'المزيد',
    'good_morning': 'صباح الخير!',
    'total_balance': 'الرصيد الإجمالي',
    'my_wallets': 'محافظي',
    'see_all': 'عرض الكل',
    'quick_actions': 'الإجراءات السريعة',
    'add_expense': 'إضافة مصروف',
    'transfer': 'تحويل',
    'add_income': 'إضافة دخل',
    'recent_transactions': 'المعاملات الأخيرة',
    'smart_tip': 'نصيحة ذكية',
    'settings': 'الإعدادات',
    'language': 'اللغة',
    'currency': 'العملة',
    'dark_mode': 'الوضع المظلم',
    'english': 'الإنجليزية',
    'german': 'الألمانية',
    'arabic': 'العربية',
  },
};

const currencySymbols = {
  USD: '$',
  EUR: '€',
  MAD: 'MAD',
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@fintracker_language';
const CURRENCY_STORAGE_KEY = '@fintracker_currency';

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      
      if (savedLanguage && ['en', 'de', 'ar'].includes(savedLanguage)) {
        setLanguageState(savedLanguage as Language);
      }
      
      if (savedCurrency && ['USD', 'EUR', 'MAD'].includes(savedCurrency)) {
        setCurrencyState(savedCurrency as Currency);
      }
    } catch (error) {
      console.error('Error loading localization preferences:', error);
    }
  };

  const setLanguage = async (newLanguage: Language) => {
    try {
      setLanguageState(newLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const setCurrency = async (newCurrency: Currency) => {
    try {
      setCurrencyState(newCurrency);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  };

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  const formatCurrency = (amount: number): string => {
    const symbol = currencySymbols[currency];
    const formattedAmount = Math.abs(amount).toFixed(2);
    
    // For Arabic and some currencies, format differently
    if (language === 'ar') {
      return `${formattedAmount} ${symbol}`;
    }
    
    if (currency === 'MAD') {
      return `${formattedAmount} ${symbol}`;
    }
    
    return `${symbol}${formattedAmount}`;
  };

  return (
    <LocalizationContext.Provider
      value={{
        language,
        currency,
        setLanguage,
        setCurrency,
        t,
        formatCurrency,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};