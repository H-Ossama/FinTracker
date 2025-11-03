import React, { createContext, useContext, ReactNode } from 'react';

interface QuickActionsContextType {
  triggerAddExpense: () => void;
  triggerTransfer: () => void;
  triggerAddWallet: () => void;
  setTriggerAddExpense: (fn: () => void) => void;
  setTriggerTransfer: (fn: () => void) => void;
  setTriggerAddWallet: (fn: () => void) => void;
}

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined);

interface QuickActionsProviderProps {
  children: ReactNode;
}

export const QuickActionsProvider: React.FC<QuickActionsProviderProps> = ({ children }) => {
  // Store the trigger functions
  let addExpenseTrigger: (() => void) | null = null;
  let transferTrigger: (() => void) | null = null;
  let addWalletTrigger: (() => void) | null = null;

  const triggerAddExpense = () => {
    if (addExpenseTrigger) {
      addExpenseTrigger();
    }
  };

  const triggerTransfer = () => {
    if (transferTrigger) {
      transferTrigger();
    }
  };

  const triggerAddWallet = () => {
    if (addWalletTrigger) {
      addWalletTrigger();
    }
  };

  const setTriggerAddExpense = (fn: () => void) => {
    addExpenseTrigger = fn;
  };

  const setTriggerTransfer = (fn: () => void) => {
    transferTrigger = fn;
  };

  const setTriggerAddWallet = (fn: () => void) => {
    addWalletTrigger = fn;
  };

  const value: QuickActionsContextType = {
    triggerAddExpense,
    triggerTransfer,
    triggerAddWallet,
    setTriggerAddExpense,
    setTriggerTransfer,
    setTriggerAddWallet,
  };

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
    </QuickActionsContext.Provider>
  );
};

export const useQuickActions = (): QuickActionsContextType => {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error('useQuickActions must be used within a QuickActionsProvider');
  }
  return context;
};

export default QuickActionsContext;