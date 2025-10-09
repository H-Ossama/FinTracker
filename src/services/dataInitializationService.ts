import { billsService } from './billsService';
import { budgetService } from './budgetService';
import { mockBills, mockBudgets } from '../data/mockData';

class DataInitializationService {
  async initializeSampleData(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🔧 Initializing sample data...');
      }
      
      // Initialize services first (this will set up categories in storage)
      await billsService.initializeCategories();
      await budgetService.initializeCategories();
      
      // Check if data already exists to avoid duplicates
      const existingBills = await billsService.getAllBills();
      const existingBudgets = await budgetService.getAllBudgets();
      
      if (__DEV__) {
        console.log('📊 Current data state:', {
          billsCount: existingBills.length,
          budgetsCount: existingBudgets.length
        });
      }
      
      // Add sample bills if none exist
      if (existingBills.length === 0) {
        if (__DEV__) {
          console.log('📄 Adding sample bills...');
        }
        for (const billData of mockBills) {
          try {
            await billsService.createBill({
              title: billData.title,
              description: billData.description,
              amount: billData.amount,
              dueDate: billData.dueDate,
              frequency: billData.frequency,
              category: billData.category,
              categoryId: billData.categoryId,
              isRecurring: billData.isRecurring,
              isAutoPay: billData.isAutoPay,
              status: billData.status,
              reminderDays: billData.reminderDays,
              remindersPerDay: billData.remindersPerDay,
              notes: billData.notes,
            });
          } catch (error) {
            if (__DEV__) {
              console.warn('Failed to create sample bill:', billData.title, error);
            }
          }
        }
        if (__DEV__) {
          console.log('✅ Sample bills added');
        }
      } else {
        if (__DEV__) {
          console.log('📄 Bills already exist, skipping sample bills');
        }
      }
      
      // Add sample budgets if none exist
      if (existingBudgets.length === 0) {
        if (__DEV__) {
          console.log('💰 Adding sample budgets...');
        }
        for (const budgetData of mockBudgets) {
          try {
            await budgetService.createBudget({
              categoryId: budgetData.categoryId,
              categoryName: budgetData.categoryName,
              monthYear: budgetData.monthYear,
              budgetAmount: budgetData.budgetAmount,
              warningThreshold: budgetData.warningThreshold,
              notes: budgetData.notes,
            });
            
            // Add sample transactions to the budget
            for (const transaction of budgetData.transactions) {
              await budgetService.addTransactionToBudget(transaction);
            }
          } catch (error) {
            if (__DEV__) {
              console.warn('Failed to create sample budget:', budgetData.categoryName, error);
            }
          }
        }
        if (__DEV__) {
          console.log('✅ Sample budgets added');
        }
      } else {
        if (__DEV__) {
          console.log('💰 Budgets already exist, skipping sample budgets');
        }
      }
      
      if (__DEV__) {
        console.log('🎉 Sample data initialization complete!');
      }
    } catch (error) {
      console.error('❌ Error initializing sample data:', error);
    }
  }

  async resetAllData(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🗑️ Resetting all data...');
      }
      
      // Get all bills and budgets
      const bills = await billsService.getAllBills();
      const budgets = await budgetService.getAllBudgets();
      
      // Delete all bills
      for (const bill of bills) {
        await billsService.deleteBill(bill.id);
      }
      
      // Delete all budgets
      for (const budget of budgets) {
        await budgetService.deleteBudget(budget.id);
      }
      
      if (__DEV__) {
        console.log('✅ All data reset complete!');
      }
    } catch (error) {
      console.error('❌ Error resetting data:', error);
    }
  }

  async exportData(): Promise<{
    bills: any[];
    budgets: any[];
    timestamp: string;
  }> {
    try {
      const bills = await billsService.getAllBills();
      const budgets = await budgetService.getAllBudgets();
      
      return {
        bills,
        budgets,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        bills: [],
        budgets: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDataStats(): Promise<{
    billsCount: number;
    budgetsCount: number;
    pendingBills: number;
    overdueBills: number;
    totalBudgetAmount: number;
    totalSpentAmount: number;
  }> {
    try {
      const bills = await billsService.getAllBills();
      const budgets = await budgetService.getAllBudgets();
      
      const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
      const overdueBills = bills.filter(b => b.status === 'overdue').length;
      const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
      const totalSpentAmount = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
      
      return {
        billsCount: bills.length,
        budgetsCount: budgets.length,
        pendingBills,
        overdueBills,
        totalBudgetAmount,
        totalSpentAmount,
      };
    } catch (error) {
      console.error('Error getting data stats:', error);
      return {
        billsCount: 0,
        budgetsCount: 0,
        pendingBills: 0,
        overdueBills: 0,
        totalBudgetAmount: 0,
        totalSpentAmount: 0,
      };
    }
  }
}

export const dataInitializationService = new DataInitializationService();