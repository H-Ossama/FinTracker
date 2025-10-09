import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill, BillPayment, BillCategory, BillNotification, Transaction } from '../types';
import { localStorageService } from './localStorageService';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cacheUtils';

const BILLS_STORAGE_KEY = '@fintracker_bills';
const BILL_PAYMENTS_STORAGE_KEY = '@fintracker_bill_payments';
const BILL_CATEGORIES_STORAGE_KEY = '@fintracker_bill_categories';
const BILL_NOTIFICATIONS_STORAGE_KEY = '@fintracker_bill_notifications';

// Default bill categories
const defaultBillCategories: BillCategory[] = [
  { id: '1', name: 'Housing', icon: 'home', color: '#3B82F6', description: 'Rent, mortgage, property taxes' },
  { id: '2', name: 'Utilities', icon: 'flash', color: '#F59E0B', description: 'Electricity, water, gas, internet' },
  { id: '3', name: 'Transportation', icon: 'car', color: '#10B981', description: 'Car payments, insurance, fuel' },
  { id: '4', name: 'Insurance', icon: 'shield-checkmark', color: '#8B5CF6', description: 'Health, life, auto insurance' },
  { id: '5', name: 'Subscriptions', icon: 'tv', color: '#EF4444', description: 'Netflix, Spotify, gym memberships' },
  { id: '6', name: 'Healthcare', icon: '🏥', color: '#EC4899', description: 'Medical bills, prescriptions' },
  { id: '7', name: 'Credit Cards', icon: 'card', color: '#F97316', description: 'Credit card payments' },
  { id: '8', name: 'Loans', icon: 'cash', color: '#6366F1', description: 'Student loans, personal loans' },
  { id: '9', name: 'Phone', icon: '📞', color: '#14B8A6', description: 'Mobile phone bills' },
  { id: '10', name: 'Other', icon: '📄', color: '#6B7280', description: 'Miscellaneous bills' },
];

class BillsService {
  // Initialize default categories if not exists
  async initializeCategories(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🔧 Initializing bill categories...');
      }
      
      // Test AsyncStorage first (only in dev mode)
      if (__DEV__) {
        await AsyncStorage.setItem('@test_key', 'test_value');
        const testValue = await AsyncStorage.getItem('@test_key');
        console.log('✅ AsyncStorage test:', testValue);
      }
      
      // Check if categories already exist without calling getBillCategories to avoid loop
      const categoriesData = await AsyncStorage.getItem(BILL_CATEGORIES_STORAGE_KEY);
      
      if (!categoriesData) {
        if (__DEV__) {
          console.log('📦 Setting default categories...');
        }
        await AsyncStorage.setItem(BILL_CATEGORIES_STORAGE_KEY, JSON.stringify(defaultBillCategories));
        if (__DEV__) {
          console.log('✅ Default categories set');
        }
      } else {
        if (__DEV__) {
          console.log('📂 Categories already exist, skipping initialization');
        }
      }
      
      // Add test bills if none exist
      await this.seedTestBillsIfEmpty();
    } catch (error) {
      console.error('❌ Error initializing bill categories:', error);
      throw error;
    }
  }

  // Add test bills for development/testing
  async seedTestBillsIfEmpty(): Promise<void> {
    try {
      const existingBills = await this.getAllBills();
      
      // Only add test bills if no bills exist
      if (existingBills.length === 0) {
        if (__DEV__) {
          console.log('📋 No bills found, adding test bills...');
        }
        
        // Get current date for realistic due dates
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Create dates relative to today
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        
        const nextMonth = new Date(today);
        nextMonth.setDate(nextMonth.getDate() + 15);
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        
        const testBills = [
          {
            title: 'Electricity Bill',
            description: 'Monthly electricity payment',
            amount: 85.50,
            dueDate: yesterdayStr, // Overdue (yesterday)
            frequency: 'monthly' as const,
            category: 'Utilities',
            categoryId: '2',
            isRecurring: true,
            isAutoPay: false,
            status: 'overdue' as const,
            reminderDays: 3,
            remindersPerDay: 1,
            notes: 'Electric company bill - test overdue'
          },
          {
            title: 'Internet Bill',
            description: 'Monthly internet service',
            amount: 49.99,
            dueDate: todayStr, // Due today (pending)
            frequency: 'monthly' as const,
            category: 'Utilities',
            categoryId: '2',
            isRecurring: true,
            isAutoPay: false,
            status: 'pending' as const,
            reminderDays: 5,
            remindersPerDay: 1,
            notes: 'Internet service provider bill - due today'
          },
          {
            title: 'Water Bill',
            description: 'Monthly water bill',
            amount: 120.00,
            dueDate: tomorrowStr, // Due tomorrow (pending)
            frequency: 'monthly' as const,
            category: 'Utilities',
            categoryId: '2',
            isRecurring: true,
            isAutoPay: false,
            status: 'pending' as const,
            reminderDays: 7,
            remindersPerDay: 1,
            notes: 'Water utility bill - due tomorrow'
          },
          {
            title: 'Netflix Subscription',
            description: 'Monthly streaming service',
            amount: 15.99,
            dueDate: nextWeekStr, // Due next week (upcoming)
            frequency: 'monthly' as const,
            category: 'Subscriptions',
            categoryId: '5',
            isRecurring: true,
            isAutoPay: true,
            status: 'upcoming' as const,
            reminderDays: 1,
            remindersPerDay: 1,
            notes: 'Premium Netflix plan - upcoming'
          },
          {
            title: 'Car Insurance',
            description: 'One-time insurance payment',
            amount: 450.00,
            dueDate: nextMonthStr, // Due in 2 weeks (upcoming)
            frequency: 'one-time' as const,
            category: 'Insurance',
            categoryId: '4',
            isRecurring: false,
            isAutoPay: false,
            status: 'upcoming' as const,
            reminderDays: 14,
            remindersPerDay: 1,
            notes: 'Auto insurance premium - upcoming one-time'
          },
          {
            title: 'Phone Bill',
            description: 'Monthly mobile service',
            amount: 65.00,
            dueDate: nextWeekStr, // Due next week (upcoming)
            frequency: 'monthly' as const,
            category: 'Phone',
            categoryId: '9',
            isRecurring: true,
            isAutoPay: false,
            status: 'upcoming' as const,
            reminderDays: 3,
            remindersPerDay: 1,
            notes: 'Mobile phone service - upcoming'
          }
        ];
        
        // Create each test bill
        for (const billData of testBills) {
          await this.createBill(billData);
        }
        
        if (__DEV__) {
          console.log(`✅ Added ${testBills.length} test bills for testing`);
        }
      } else {
        if (__DEV__) {
          console.log(`📊 Found ${existingBills.length} existing bills, skipping test data`);
        }
      }
    } catch (error) {
      console.error('❌ Error seeding test bills:', error);
      // Don't throw error for test data, just log it
    }
  }

      // Clear all bills (useful for testing)
  async clearAllBills(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🗑️ Clearing all bills...');
      }
      await AsyncStorage.removeItem(BILLS_STORAGE_KEY);
      await AsyncStorage.removeItem(BILL_PAYMENTS_STORAGE_KEY);
      await AsyncStorage.removeItem(BILL_NOTIFICATIONS_STORAGE_KEY);
      if (__DEV__) {
        console.log('✅ All bills cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing bills:', error);
      throw error;
    }
  }

  // Add a quick method to reset and add fresh test bills
  async resetWithTestBills(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🔄 Resetting bills with fresh test data...');
      }
      await this.clearAllBills();
      await this.seedTestBillsIfEmpty();
      if (__DEV__) {
        console.log('✅ Test bills reset complete');
      }
    } catch (error) {
      console.error('❌ Error resetting test bills:', error);
      throw error;
    }
  }

  // Bills CRUD operations
  async createBill(billData: Omit<Bill, 'id' | 'createdAt' | 'nextDueDate' | 'paidHistory'>): Promise<Bill> {
    try {
      const bills = await this.getAllBills();
      const newBill: Bill = {
        ...billData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        nextDueDate: this.calculateNextDueDate(billData.dueDate, billData.frequency),
        paidHistory: [],
      };

      bills.push(newBill);
      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BILLS);
      
      // Create notification if needed
      if (newBill.reminderDays > 0) {
        await this.createBillNotification(newBill);
      }

      return newBill;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  async getAllBills(): Promise<Bill[]> {
    try {
      // Check cache first
      const cachedBills = cache.get<Bill[]>(CACHE_KEYS.BILLS);
      if (cachedBills) {
        return cachedBills;
      }

      const billsData = await AsyncStorage.getItem(BILLS_STORAGE_KEY);
      
      if (billsData) {
        const bills = JSON.parse(billsData);
        
        // Update bill statuses based on current date
        let hasStatusChanges = false;
        const updatedBills = bills.map((bill: Bill) => {
          const originalStatus = bill.status;
          const calculatedStatus = this.calculateBillStatus(bill);
          
          if (originalStatus !== calculatedStatus) {
            hasStatusChanges = true;
            if (__DEV__) {
              console.log(`🔄 Status changed for "${bill.title}": ${originalStatus} → ${calculatedStatus}`);
            }
          }
          
          return {
            ...bill,
            status: calculatedStatus
          };
        });
        
        // Cache the results
        cache.set(CACHE_KEYS.BILLS, updatedBills, CACHE_TTL.SHORT);
        
        // Only log if there were status changes or in development mode
        if (__DEV__ && hasStatusChanges) {
          console.log(`✅ Bills loaded: ${bills.length} bills, ${hasStatusChanges ? 'statuses updated' : 'no status changes'}`);
        }
        
        return updatedBills;
      }
      
      // Cache empty result too
      cache.set(CACHE_KEYS.BILLS, [], CACHE_TTL.SHORT);
      return [];
    } catch (error) {
      console.error('❌ Error getting bills:', error);
      return [];
    }
  }

  async getBillById(id: string): Promise<Bill | null> {
    try {
      const bills = await this.getAllBills();
      return bills.find(bill => bill.id === id) || null;
    } catch (error) {
      console.error('Error getting bill by id:', error);
      return null;
    }
  }

  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | null> {
    try {
      const bills = await this.getAllBills();
      const billIndex = bills.findIndex(bill => bill.id === id);
      
      if (billIndex === -1) {
        throw new Error('Bill not found');
      }

      const updatedBill = { ...bills[billIndex], ...updates };
      bills[billIndex] = updatedBill;
      
      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BILLS);
      
      return updatedBill;
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  }

  async deleteBill(id: string): Promise<boolean> {
    try {
      const bills = await this.getAllBills();
      const filteredBills = bills.filter(bill => bill.id !== id);
      
      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(filteredBills));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BILLS);
      
      // Delete related payments and notifications
      await this.deleteBillPayments(id);
      await this.deleteBillNotifications(id);
      
      return true;
    } catch (error) {
      console.error('Error deleting bill:', error);
      return false;
    }
  }

  // Bill payment operations
  async markBillAsPaid(billId: string, walletId: string, amount?: number, notes?: string): Promise<BillPayment> {
    try {
      if (__DEV__) {
        console.log('💰 Starting bill payment process:', { billId, walletId, amount });
      }
      
      const bill = await this.getBillById(billId);
      if (!bill) {
        throw new Error('Bill not found');
      }

      if (__DEV__) {
        console.log('📋 Bill details:', { title: bill.title, status: bill.status, isRecurring: bill.isRecurring });
      }

      const paymentAmount = amount || bill.amount;
      const payment: BillPayment = {
        id: Date.now().toString(),
        billId,
        amount: paymentAmount,
        paidDate: new Date().toISOString(),
        walletId,
        notes,
        isLate: new Date(bill.nextDueDate) < new Date(),
      };

      // Add payment to bill history
      const updatedBill: Partial<Bill> = {
        status: 'paid',
        lastPaidDate: payment.paidDate,
        paidHistory: [...bill.paidHistory, payment],
      };

      // For recurring bills, calculate next due date but keep status as 'paid' initially
      if (bill.isRecurring) {
        const nextDueDate = this.calculateNextDueDate(bill.nextDueDate, bill.frequency);
        updatedBill.nextDueDate = nextDueDate;
        
        // Check if the next due date is far enough in the future to warrant 'upcoming' status
        const now = new Date();
        const dueDate = new Date(nextDueDate);
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        // If next due date is more than reminder days away, set to upcoming, otherwise keep as paid
        if (daysDiff > bill.reminderDays) {
          updatedBill.status = 'upcoming';
        }
        if (__DEV__) {
          console.log('🔄 Recurring bill - next due date:', nextDueDate, 'days until due:', daysDiff);
        }
      } else {
        if (__DEV__) {
          console.log('✅ Non-recurring bill - marked as paid');
        }
      }

      await this.updateBill(billId, updatedBill);
      if (__DEV__) {
        console.log('📝 Bill updated in storage');
      }
      
      // Store payment separately
      await this.saveBillPayment(payment);
      if (__DEV__) {
        console.log('💾 Payment saved to history');
      }
      
      // Create transaction record
      await this.createTransactionFromPayment(payment, bill);
      if (__DEV__) {
        console.log('💳 Transaction created successfully');
      }

      return payment;
    } catch (error) {
      console.error('❌ Error marking bill as paid:', error);
      throw error;
    }
  }

  async getBillPayments(billId?: string): Promise<BillPayment[]> {
    try {
      const paymentsData = await AsyncStorage.getItem(BILL_PAYMENTS_STORAGE_KEY);
      if (paymentsData) {
        const payments = JSON.parse(paymentsData);
        return billId ? payments.filter((p: BillPayment) => p.billId === billId) : payments;
      }
      return [];
    } catch (error) {
      console.error('Error getting bill payments:', error);
      return [];
    }
  }

  private async saveBillPayment(payment: BillPayment): Promise<void> {
    try {
      const payments = await this.getBillPayments();
      payments.push(payment);
      await AsyncStorage.setItem(BILL_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    } catch (error) {
      console.error('Error saving bill payment:', error);
      throw error;
    }
  }

  private async deleteBillPayments(billId: string): Promise<void> {
    try {
      const payments = await this.getBillPayments();
      const filteredPayments = payments.filter(payment => payment.billId !== billId);
      await AsyncStorage.setItem(BILL_PAYMENTS_STORAGE_KEY, JSON.stringify(filteredPayments));
    } catch (error) {
      console.error('Error deleting bill payments:', error);
    }
  }

  // Bill categories
  async getBillCategories(): Promise<BillCategory[]> {
    try {
      // Check cache first
      const cachedCategories = cache.get<BillCategory[]>(CACHE_KEYS.BILL_CATEGORIES);
      if (cachedCategories) {
        return cachedCategories;
      }

      const categoriesData = await AsyncStorage.getItem(BILL_CATEGORIES_STORAGE_KEY);
      
      if (categoriesData) {
        const categories = JSON.parse(categoriesData);
        cache.set(CACHE_KEYS.BILL_CATEGORIES, categories, CACHE_TTL.LONG);
        return categories;
      }
      
      // Return default categories without calling initializeCategories to avoid loop
      if (__DEV__) {
        console.log('🔄 No categories in storage, returning defaults');
      }
      cache.set(CACHE_KEYS.BILL_CATEGORIES, defaultBillCategories, CACHE_TTL.LONG);
      return defaultBillCategories;
    } catch (error) {
      console.error('❌ Error getting bill categories:', error);
      return defaultBillCategories;
    }
  }

  async createBillCategory(category: Omit<BillCategory, 'id'>): Promise<BillCategory> {
    try {
      const categories = await this.getBillCategories();
      const newCategory: BillCategory = {
        ...category,
        id: Date.now().toString(),
      };

      categories.push(newCategory);
      await AsyncStorage.setItem(BILL_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      return newCategory;
    } catch (error) {
      console.error('Error creating bill category:', error);
      throw error;
    }
  }

  // Bill notifications
  async createBillNotification(bill: Bill): Promise<BillNotification> {
    try {
      const notification: BillNotification = {
        id: Date.now().toString(),
        billId: bill.id,
        title: `Bill Reminder: ${bill.title}`,
        message: `Your ${bill.title} bill of $${bill.amount} is due on ${new Date(bill.nextDueDate).toLocaleDateString()}`,
        dueDate: bill.nextDueDate,
        type: 'reminder',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      const notifications = await this.getBillNotifications();
      notifications.push(notification);
      await AsyncStorage.setItem(BILL_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      
      return notification;
    } catch (error) {
      console.error('Error creating bill notification:', error);
      throw error;
    }
  }

  async getBillNotifications(): Promise<BillNotification[]> {
    try {
      const notificationsData = await AsyncStorage.getItem(BILL_NOTIFICATIONS_STORAGE_KEY);
      if (notificationsData) {
        return JSON.parse(notificationsData);
      }
      return [];
    } catch (error) {
      console.error('Error getting bill notifications:', error);
      return [];
    }
  }

  private async deleteBillNotifications(billId: string): Promise<void> {
    try {
      const notifications = await this.getBillNotifications();
      const filteredNotifications = notifications.filter(notification => notification.billId !== billId);
      await AsyncStorage.setItem(BILL_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(filteredNotifications));
    } catch (error) {
      console.error('Error deleting bill notifications:', error);
    }
  }

  // Utility methods
  private calculateNextDueDate(currentDueDate: string, frequency: Bill['frequency']): string {
    const date = new Date(currentDueDate);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'one-time':
        return currentDueDate; // Don't change for one-time bills
    }
    
    return date.toISOString();
  }

  private calculateBillStatus(bill: Bill): Bill['status'] {
    const now = new Date();
    const dueDate = new Date(bill.nextDueDate);
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    // Check if bill was recently paid (within last 24 hours)
    if (bill.lastPaidDate) {
      const lastPaid = new Date(bill.lastPaidDate);
      const hoursSincePayment = (now.getTime() - lastPaid.getTime()) / (1000 * 3600);
      
      // If paid within last 24 hours, keep as paid regardless of due date
      if (hoursSincePayment < 24) {
        if (__DEV__) {
          console.log('📅 Bill was recently paid, keeping status as paid:', bill.title);
        }
        return 'paid';
      }
    }

    // Don't recalculate status for paid bills unless it's time for the next cycle
    if (bill.status === 'paid') {
      // For recurring bills, check if it's time for the next billing cycle
      if (bill.isRecurring && bill.lastPaidDate) {
        const lastPaid = new Date(bill.lastPaidDate);
        const daysSincePayment = Math.ceil((now.getTime() - lastPaid.getTime()) / (1000 * 3600 * 24));
        
        // Only recalculate if enough time has passed for a new billing cycle
        const minCycleDays = bill.frequency === 'weekly' ? 7 : bill.frequency === 'monthly' ? 28 : 350;
        if (daysSincePayment < minCycleDays * 0.8) { // 80% of cycle time
          return 'paid';
        }
      } else if (!bill.isRecurring) {
        // Non-recurring paid bills stay paid
        return 'paid';
      }
    }

    // Calculate status based on due date
    if (daysDiff < 0) {
      return 'overdue';
    } else if (daysDiff <= bill.reminderDays) {
      return 'pending';
    } else {
      return 'upcoming';
    }
  }

  private async createTransactionFromPayment(payment: BillPayment, bill: Bill): Promise<void> {
    try {
      // Get the matching transaction category ID based on bill category name
      const categories = await localStorageService.getCategories();
      let transactionCategoryId = bill.categoryId;
      
      // Map bill category to transaction category
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(bill.category.toLowerCase()) ||
        bill.category.toLowerCase().includes(cat.name.toLowerCase())
      );
      
      if (matchingCategory) {
        transactionCategoryId = matchingCategory.id;
      } else {
        // Try to find a Bills & Utilities category as fallback
        const billsCategory = categories.find(cat => 
          cat.name.toLowerCase().includes('bill') ||
          cat.name.toLowerCase().includes('utilit')
        );
        if (billsCategory) {
          transactionCategoryId = billsCategory.id;
        }
      }

      // Create transaction using the local storage service which handles wallet balance update
      await localStorageService.createTransaction({
        amount: payment.amount,
        description: `${bill.title}`,
        type: 'EXPENSE',
        date: payment.paidDate.split('T')[0], // Convert to YYYY-MM-DD format
        notes: payment.notes || `Bill payment for ${bill.category}`,
        walletId: payment.walletId,
        categoryId: transactionCategoryId,
      });

      if (__DEV__) {
        console.log('✅ Transaction created successfully for bill payment:', {
          billTitle: bill.title,
          amount: payment.amount,
          walletId: payment.walletId,
          categoryId: transactionCategoryId,
          categoryName: matchingCategory?.name || 'Bills'
        });
      }
    } catch (error) {
      console.error('❌ Error creating transaction from payment:', error);
      throw error;
    }
  }

  // Analytics methods
  async getBillsAnalytics(monthYear?: string): Promise<{
    totalPending: number;
    totalOverdue: number;
    totalPaidThisMonth: number;
    averageMonthlyBills: number;
    categoryBreakdown: { category: string; amount: number; count: number }[];
  }> {
    try {
      const bills = await this.getAllBills();
      const payments = await this.getBillPayments();
      
      const currentMonth = monthYear || new Date().toISOString().slice(0, 7);
      
      const pendingBills = bills.filter(b => b.status === 'pending');
      const overdueBills = bills.filter(b => b.status === 'overdue');
      
      const thisMonthPayments = payments.filter(p => 
        p.paidDate.slice(0, 7) === currentMonth
      );

      const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);
      const totalOverdue = overdueBills.reduce((sum, b) => sum + b.amount, 0);
      const totalPaidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

      // Calculate category breakdown
      const categoryMap = new Map<string, { amount: number; count: number }>();
      bills.forEach(bill => {
        const existing = categoryMap.get(bill.category) || { amount: 0, count: 0 };
        categoryMap.set(bill.category, {
          amount: existing.amount + bill.amount,
          count: existing.count + 1
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      }));

      return {
        totalPending,
        totalOverdue,
        totalPaidThisMonth,
        averageMonthlyBills: bills.length > 0 ? bills.reduce((sum, b) => sum + b.amount, 0) / bills.length : 0,
        categoryBreakdown
      };
    } catch (error) {
      console.error('Error getting bills analytics:', error);
      return {
        totalPending: 0,
        totalOverdue: 0,
        totalPaidThisMonth: 0,
        averageMonthlyBills: 0,
        categoryBreakdown: []
      };
    }
  }

  async getUpcomingBills(days: number = 7): Promise<Bill[]> {
    try {
      const bills = await this.getAllBills();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return bills
        .filter(bill => {
          const dueDate = new Date(bill.nextDueDate);
          return dueDate <= futureDate && (bill.status === 'pending' || bill.status === 'upcoming');
        })
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    } catch (error) {
      console.error('Error getting upcoming bills:', error);
      return [];
    }
  }

  async getOverdueBills(): Promise<Bill[]> {
    try {
      const bills = await this.getAllBills();
      return bills.filter(bill => bill.status === 'overdue');
    } catch (error) {
      console.error('Error getting overdue bills:', error);
      return [];
    }
  }
}

export const billsService = new BillsService();