import { Transaction, Wallet, SpendingCategory, Goal, Reminder } from '../types';

export const mockWallets: Wallet[] = [
  {
    id: '1',
    name: 'Bank Account',
    balance: 2847.64,
    type: 'bank',
    color: '#4A90E2'
  },
  {
    id: '2',
    name: 'Pocket Money',
    balance: 248.8,
    type: 'cash',
    color: '#7ED321'
  },
  {
    id: '3',
    name: 'Savings',
    balance: 1244.65,
    type: 'savings',
    color: '#9013FE'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    title: 'Grocery Shopping',
    category: 'Food',
    amount: -85.50,
    date: '2024-10-07',
    type: 'expense',
    walletId: '1'
  },
  {
    id: '2',
    title: 'Electricity Bill',
    category: 'Utilities',
    amount: -447.84,
    date: '2024-10-06',
    type: 'expense',
    walletId: '1'
  },
  {
    id: '3',
    title: 'Salary',
    category: 'Income',
    amount: 3500.00,
    date: '2024-10-01',
    type: 'income',
    walletId: '1'
  },
  {
    id: '4',
    title: 'Coffee',
    category: 'Food',
    amount: -12.50,
    date: '2024-10-07',
    type: 'expense',
    walletId: '2'
  },
  {
    id: '5',
    title: 'Netflix Subscription',
    category: 'Subscriptions',
    amount: -99.52,
    date: '2024-10-05',
    type: 'expense',
    walletId: '1'
  }
];

export const mockSpendingCategories: SpendingCategory[] = [
  {
    id: '1',
    name: 'Utilities',
    amount: 447.84,
    percentage: 36,
    color: '#F5A623',
    icon: '💡'
  },
  {
    id: '2',
    name: 'Expenses',
    amount: 149.28,
    percentage: 12,
    color: '#7ED321',
    icon: '📄'
  },
  {
    id: '3',
    name: 'Payments',
    amount: 248.8,
    percentage: 20,
    color: '#4A90E2',
    icon: '💳'
  },
  {
    id: '4',
    name: 'Subscriptions',
    amount: 99.52,
    percentage: 8,
    color: '#D0021B',
    icon: '📱'
  },
  {
    id: '5',
    name: 'Food',
    amount: 299.21,
    percentage: 24,
    color: '#9013FE',
    icon: '🍔'
  }
];

export const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 3500,
    targetDate: '2024-12-31',
    category: 'Savings'
  },
  {
    id: '2',
    title: 'Vacation Trip',
    targetAmount: 5000,
    currentAmount: 1200,
    targetDate: '2024-08-15',
    category: 'Travel'
  }
];

export const mockReminders: Reminder[] = [
  {
    id: '1',
    title: 'Rent Payment',
    amount: 800,
    frequency: 'monthly',
    nextDue: '2024-11-01',
    isPaid: false
  },
  {
    id: '2',
    title: 'Gym Membership',
    amount: 45,
    frequency: 'monthly',
    nextDue: '2024-10-15',
    isPaid: false
  }
];

export const getTotalBalance = (): number => {
  return mockWallets.reduce((total, wallet) => total + wallet.balance, 0);
};

export const getTotalSpent = (): number => {
  return mockSpendingCategories.reduce((total, category) => total + category.amount, 0);
};

export const getRecentTransactions = (limit: number = 5): Transaction[] => {
  return mockTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};