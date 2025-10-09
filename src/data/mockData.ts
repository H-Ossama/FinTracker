import { Transaction, Wallet, SpendingCategory, Goal, Reminder, BorrowedMoney, Bill, Budget, BillCategory, BudgetCategory } from '../types';

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

export const mockBorrowedMoney: BorrowedMoney[] = [
  {
    id: '1',
    personName: 'Ahmed Ali',
    amount: 250.00,
    reason: 'Emergency car repair',
    borrowedDate: '2024-10-01',
    dueDate: '2024-10-15',
    isPaid: false,
    notes: 'Promised to pay back by next Friday',
    phoneNumber: '+1234567890',
    email: 'ahmed.ali@email.com'
  },
  {
    id: '2',
    personName: 'Sarah Johnson',
    amount: 100.00,
    reason: 'Lunch money for conference',
    borrowedDate: '2024-10-05',
    dueDate: '2024-10-12',
    isPaid: false,
    notes: 'Work conference expenses',
    phoneNumber: '+0987654321'
  },
  {
    id: '3',
    personName: 'Mike Chen',
    amount: 50.00,
    reason: 'Gas money',
    borrowedDate: '2024-09-28',
    dueDate: '2024-10-05',
    isPaid: true,
    notes: 'Paid back on time'
  },
  {
    id: '4',
    personName: 'Lisa Brown',
    amount: 300.00,
    reason: 'Medical bills',
    borrowedDate: '2024-09-20',
    dueDate: '2024-10-20',
    isPaid: false,
    notes: 'Will pay back in installments',
    email: 'lisa.brown@email.com'
  }
];

// Mock Bills Data
export const mockBills: Bill[] = [
  {
    id: '1',
    title: 'Monthly Rent',
    description: 'Apartment rent payment',
    amount: 1200,
    dueDate: '2024-11-01',
    frequency: 'monthly',
    category: 'Housing',
    categoryId: '1',
    isRecurring: true,
    isAutoPay: false,
    status: 'pending',
    reminderDays: 3,
    remindersPerDay: 1,
    createdAt: '2024-01-01T00:00:00Z',
    lastPaidDate: '2024-10-01T00:00:00Z',
    nextDueDate: '2024-11-01T00:00:00Z',
    paidHistory: [],
    notes: 'Monthly apartment rent'
  },
  {
    id: '2',
    title: 'Electricity Bill',
    description: 'Monthly electricity payment',
    amount: 85,
    dueDate: '2024-10-15',
    frequency: 'monthly',
    category: 'Utilities',
    categoryId: '2',
    isRecurring: true,
    isAutoPay: true,
    status: 'overdue',
    reminderDays: 7,
    remindersPerDay: 2,
    createdAt: '2024-01-01T00:00:00Z',
    nextDueDate: '2024-10-15T00:00:00Z',
    paidHistory: [],
    notes: 'Electric company bill'
  },
  {
    id: '3',
    title: 'Car Insurance',
    description: 'Yearly car insurance payment',
    amount: 420,
    dueDate: '2024-12-01',
    frequency: 'yearly',
    category: 'Insurance',
    categoryId: '4',
    isRecurring: true,
    isAutoPay: false,
    status: 'upcoming',
    reminderDays: 14,
    remindersPerDay: 1,
    createdAt: '2024-01-01T00:00:00Z',
    nextDueDate: '2024-12-01T00:00:00Z',
    paidHistory: [],
    notes: 'Auto insurance quarterly payment'
  },
  {
    id: '4',
    title: 'Netflix Subscription',
    description: 'Monthly streaming subscription',
    amount: 15.99,
    dueDate: '2024-10-20',
    frequency: 'monthly',
    category: 'Subscriptions',
    categoryId: '5',
    isRecurring: true,
    isAutoPay: true,
    status: 'pending',
    reminderDays: 1,
    remindersPerDay: 1,
    createdAt: '2024-01-01T00:00:00Z',
    nextDueDate: '2024-10-20T00:00:00Z',
    paidHistory: [],
    notes: 'Premium Netflix plan'
  }
];

// Mock Budget Categories
export const mockBudgetCategories: BudgetCategory[] = [
  { id: '1', name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
  { id: '2', name: 'Transportation', icon: 'car', color: '#4ECDC4', isDefault: true },
  { id: '3', name: 'Shopping', icon: 'bag', color: '#45B7D1', isDefault: true },
  { id: '4', name: 'Entertainment', icon: 'game-controller', color: '#96CEB4', isDefault: true },
  { id: '5', name: 'Bills & Utilities', icon: 'receipt', color: '#FFEAA7', isDefault: true },
  { id: '6', name: 'Healthcare', icon: 'medical', color: '#DDA0DD', isDefault: true },
];

// Mock Budgets Data
export const mockBudgets: Budget[] = [
  {
    id: '1',
    categoryId: '1',
    categoryName: 'Food & Dining',
    monthYear: '2024-10',
    budgetAmount: 500,
    spentAmount: 342.50,
    remainingAmount: 157.50,
    status: 'warning',
    warningThreshold: 80,
    createdAt: '2024-10-01T00:00:00Z',
    transactions: [
      {
        id: '101',
        title: 'Grocery Shopping',
        category: 'Food',
        amount: -85.50,
        date: '2024-10-07',
        type: 'expense',
        walletId: '1'
      },
      {
        id: '102',
        title: 'Restaurant Dinner',
        category: 'Food',
        amount: -67.00,
        date: '2024-10-05',
        type: 'expense',
        walletId: '1'
      }
    ]
  },
  {
    id: '2',
    categoryId: '2',
    categoryName: 'Transportation',
    monthYear: '2024-10',
    budgetAmount: 200,
    spentAmount: 95.75,
    remainingAmount: 104.25,
    status: 'on-track',
    warningThreshold: 80,
    createdAt: '2024-10-01T00:00:00Z',
    transactions: [
      {
        id: '201',
        title: 'Gas Station',
        category: 'Transportation',
        amount: -45.75,
        date: '2024-10-06',
        type: 'expense',
        walletId: '1'
      },
      {
        id: '202',
        title: 'Uber Ride',
        category: 'Transportation',
        amount: -25.00,
        date: '2024-10-03',
        type: 'expense',
        walletId: '2'
      }
    ]
  },
  {
    id: '3',
    categoryId: '5',
    categoryName: 'Bills & Utilities',
    monthYear: '2024-10',
    budgetAmount: 300,
    spentAmount: 385.50,
    remainingAmount: -85.50,
    status: 'exceeded',
    warningThreshold: 80,
    createdAt: '2024-10-01T00:00:00Z',
    transactions: [
      {
        id: '301',
        title: 'Electricity Bill',
        category: 'Bills & Utilities',
        amount: -145.50,
        date: '2024-10-04',
        type: 'expense',
        walletId: '1'
      },
      {
        id: '302',
        title: 'Internet Bill',
        category: 'Bills & Utilities',
        amount: -89.99,
        date: '2024-10-02',
        type: 'expense',
        walletId: '1'
      }
    ]
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

export const getUnpaidBorrowedMoney = (): BorrowedMoney[] => {
  return mockBorrowedMoney.filter(item => !item.isPaid);
};

export const getAllBorrowedMoney = (): BorrowedMoney[] => {
  return mockBorrowedMoney.sort((a, b) => new Date(b.borrowedDate).getTime() - new Date(a.borrowedDate).getTime());
};

export const getTotalBorrowedAmount = (): number => {
  return mockBorrowedMoney
    .filter(item => !item.isPaid)
    .reduce((total, item) => total + item.amount, 0);
};

// Bills helper functions
export const getPendingBills = (): Bill[] => {
  return mockBills.filter(bill => bill.status === 'pending' || bill.status === 'overdue');
};

export const getTotalPendingBillsAmount = (): number => {
  return getPendingBills().reduce((total, bill) => total + bill.amount, 0);
};

export const getOverdueBills = (): Bill[] => {
  return mockBills.filter(bill => bill.status === 'overdue');
};

// Budget helper functions
export const getCurrentMonthBudgets = (): Budget[] => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return mockBudgets.filter(budget => budget.monthYear === currentMonth);
};

export const getTotalBudgetAmount = (): number => {
  return getCurrentMonthBudgets().reduce((total, budget) => total + budget.budgetAmount, 0);
};

export const getTotalSpentAmount = (): number => {
  return getCurrentMonthBudgets().reduce((total, budget) => total + budget.spentAmount, 0);
};

export const getBudgetsOverLimit = (): Budget[] => {
  return getCurrentMonthBudgets().filter(budget => budget.status === 'exceeded');
};