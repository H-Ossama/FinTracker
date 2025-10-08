export interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  walletId: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'cash' | 'savings';
  color: string;
}

export interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDue: string;
  isPaid: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}