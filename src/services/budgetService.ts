import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget, BudgetCategory, MonthlyBudgetSummary, Transaction } from '../types';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cacheUtils';

const BUDGETS_STORAGE_KEY = '@fintracker_budgets';
const BUDGET_CATEGORIES_STORAGE_KEY = '@fintracker_budget_categories';

// Default budget categories
const defaultBudgetCategories: BudgetCategory[] = [
  { id: '1', name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
  { id: '2', name: 'Transportation', icon: 'car', color: '#4ECDC4', isDefault: true },
  { id: '3', name: 'Shopping', icon: 'bag', color: '#45B7D1', isDefault: true },
  { id: '4', name: 'Entertainment', icon: 'game-controller', color: '#96CEB4', isDefault: true },
  { id: '5', name: 'Bills & Utilities', icon: '🧾', color: '#FFEAA7', isDefault: true },
  { id: '6', name: 'Healthcare', icon: 'medical', color: '#DDA0DD', isDefault: true },
  { id: '7', name: 'Education', icon: 'school', color: '#98D8C8', isDefault: true },
  { id: '8', name: 'Personal Care', icon: 'person', color: '#F7DC6F', isDefault: true },
  { id: '9', name: 'Home & Garden', icon: 'home', color: '#BB8FCE', isDefault: true },
  { id: '10', name: 'Gifts & Donations', icon: 'gift', color: '#85C1E9', isDefault: true },
  { id: '11', name: 'Travel', icon: 'airplane', color: '#F8C471', isDefault: true },
  { id: '12', name: 'Savings & Investments', icon: 'trending-up', color: '#82E0AA', isDefault: true },
  { id: '13', name: 'Miscellaneous', icon: 'ellipsis-horizontal', color: '#BDC3C7', isDefault: true },
];

class BudgetService {
  // Initialize default categories if not exists
  async initializeCategories(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🔧 Initializing budget categories...');
      }
      
      // Test AsyncStorage first (only in dev mode)
      if (__DEV__) {
        await AsyncStorage.setItem('@budget_test_key', 'test_value');
        const testValue = await AsyncStorage.getItem('@budget_test_key');
        console.log('✅ Budget AsyncStorage test:', testValue);
      }
      
      // Check if categories already exist without calling getBudgetCategories to avoid loop
      const categoriesData = await AsyncStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY);
      
      if (!categoriesData) {
        if (__DEV__) {
          console.log('📦 Setting default budget categories...');
        }
        await AsyncStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(defaultBudgetCategories));
        if (__DEV__) {
          console.log('✅ Default budget categories set');
        }
      } else {
        if (__DEV__) {
          console.log('📂 Budget categories already exist, skipping initialization');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing budget categories:', error);
      throw error;
    }
  }

  // Budget CRUD operations
  async createBudget(budgetData: Omit<Budget, 'id' | 'spentAmount' | 'remainingAmount' | 'status' | 'createdAt' | 'transactions'>, options?: { allowDuplicate?: boolean }): Promise<Budget> {
    try {
      const budgets = await this.getAllBudgets();
      
      // Check if budget already exists for this category and month
      const existingBudget = budgets.find(b => 
        b.categoryId === budgetData.categoryId && b.monthYear === budgetData.monthYear
      );
      
      if (existingBudget) {
        if (options?.allowDuplicate) {
          // For system operations, return the existing budget
          console.log(`Budget already exists for category ${budgetData.categoryName} in ${budgetData.monthYear}, returning existing budget`);
          return existingBudget;
        } else {
          // For user operations, throw an error
          throw new Error('Budget already exists for this category and month');
        }
      }

      const newBudget: Budget = {
        ...budgetData,
        id: Date.now().toString(),
        spentAmount: 0,
        remainingAmount: budgetData.budgetAmount,
        status: 'on-track',
        createdAt: new Date().toISOString(),
        transactions: [],
      };

      budgets.push(newBudget);
      await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BUDGETS);
      
      return newBudget;
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  // System method for creating budgets that allows duplicates
  async createBudgetForSystem(budgetData: Omit<Budget, 'id' | 'spentAmount' | 'remainingAmount' | 'status' | 'createdAt' | 'transactions'>): Promise<Budget> {
    return this.createBudget(budgetData, { allowDuplicate: true });
  }

  async getAllBudgets(): Promise<Budget[]> {
    try {
      // Check cache first
      const cachedBudgets = cache.get<Budget[]>(CACHE_KEYS.BUDGETS);
      if (cachedBudgets) {
        return cachedBudgets;
      }

      const budgetsData = await AsyncStorage.getItem(BUDGETS_STORAGE_KEY);
      
      if (budgetsData) {
        const budgets = JSON.parse(budgetsData);
        cache.set(CACHE_KEYS.BUDGETS, budgets, CACHE_TTL.SHORT);
        return budgets;
      }
      
      cache.set(CACHE_KEYS.BUDGETS, [], CACHE_TTL.SHORT);
      return [];
    } catch (error) {
      console.error('❌ Error getting budgets:', error);
      return [];
    }
  }

  async getBudgetsByMonth(monthYear: string): Promise<Budget[]> {
    try {
      const budgets = await this.getAllBudgets();
      return budgets.filter(budget => budget.monthYear === monthYear);
    } catch (error) {
      console.error('Error getting budgets by month:', error);
      return [];
    }
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    try {
      const budgets = await this.getAllBudgets();
      return budgets.find(budget => budget.id === id) || null;
    } catch (error) {
      console.error('Error getting budget by id:', error);
      return null;
    }
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    try {
      const budgets = await this.getAllBudgets();
      const budgetIndex = budgets.findIndex(budget => budget.id === id);
      
      if (budgetIndex === -1) {
        throw new Error('Budget not found');
      }

      const updatedBudget = { ...budgets[budgetIndex], ...updates };
      
      // Recalculate status and remaining amount
      updatedBudget.remainingAmount = updatedBudget.budgetAmount - updatedBudget.spentAmount;
      updatedBudget.status = this.calculateBudgetStatus(updatedBudget);
      
      budgets[budgetIndex] = updatedBudget;
      
      await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BUDGETS);
      
      return updatedBudget;
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  }

  async deleteBudget(id: string): Promise<boolean> {
    try {
      const budgets = await this.getAllBudgets();
      const filteredBudgets = budgets.filter(budget => budget.id !== id);
      
      await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(filteredBudgets));
      
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.BUDGETS);
      
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
  }

  // Transaction integration
  async addTransactionToBudget(transaction: Transaction): Promise<void> {
    try {
      // Handle both lowercase and uppercase transaction types
      const transactionType = transaction.type?.toLowerCase();
      if (transactionType !== 'expense') return; // Only track expenses in budgets
      
      const monthYear = transaction.date.slice(0, 7); // Extract YYYY-MM
      const budgets = await this.getAllBudgets();
      
      // Find budget by category name
      let budget = budgets.find(b => 
        b.monthYear === monthYear && 
        (b.categoryName.toLowerCase() === transaction.category.toLowerCase())
      );

      // If no budget found, try to find a "Miscellaneous" budget or create one
      if (!budget) {
        // First check if there's already a Miscellaneous budget for this month
        budget = budgets.find(b => 
          b.monthYear === monthYear && 
          b.categoryName.toLowerCase() === 'miscellaneous'
        );
        
        if (!budget) {
          // Create a miscellaneous budget if no matching category found
          const miscCategory = await this.getBudgetCategoryByName('Miscellaneous');
          if (miscCategory) {
            try {
              budget = await this.createBudgetForSystem({
                categoryId: miscCategory.id,
                categoryName: miscCategory.name,
                monthYear,
                budgetAmount: 500, // Default budget amount
                warningThreshold: 80,
                notes: 'Auto-created for uncategorized expenses'
              });
            } catch (createError) {
              // If budget creation fails (e.g., already exists), try to find it again
              budget = budgets.find(b => 
                b.monthYear === monthYear && 
                b.categoryName.toLowerCase() === 'miscellaneous'
              );
            }
          }
        }
      }

      if (budget) {
        // Check if transaction is already in the budget to avoid duplicates
        const existingTransaction = budget.transactions.find(t => t.id === transaction.id);
        if (existingTransaction) {
          return; // Transaction already exists in budget
        }
        
        const updatedTransactions = [...budget.transactions, transaction];
        const spentAmount = Math.abs(updatedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0));
        
        await this.updateBudget(budget.id, {
          spentAmount,
          transactions: updatedTransactions
        });
      }
    } catch (error) {
      console.error('Error adding transaction to budget:', error);
      // Don't throw the error to prevent blocking other operations
    }
  }

  async removeTransactionFromBudget(transactionId: string): Promise<void> {
    try {
      const budgets = await this.getAllBudgets();
      
      for (const budget of budgets) {
        const transactionIndex = budget.transactions.findIndex(t => t.id === transactionId);
        if (transactionIndex > -1) {
          const updatedTransactions = budget.transactions.filter(t => t.id !== transactionId);
          const spentAmount = Math.abs(updatedTransactions.reduce((sum, t) => sum + t.amount, 0));
          
          await this.updateBudget(budget.id, {
            spentAmount,
            transactions: updatedTransactions
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error removing transaction from budget:', error);
    }
  }

  // Budget categories
  async getBudgetCategories(): Promise<BudgetCategory[]> {
    try {
      // Check cache first
      const cachedCategories = cache.get<BudgetCategory[]>(CACHE_KEYS.BUDGET_CATEGORIES);
      if (cachedCategories) {
        return cachedCategories;
      }

      const categoriesData = await AsyncStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY);
      
      if (categoriesData) {
        const categories = JSON.parse(categoriesData);
        cache.set(CACHE_KEYS.BUDGET_CATEGORIES, categories, CACHE_TTL.LONG);
        return categories;
      }
      
      // Return default categories without calling initializeCategories to avoid loop
      cache.set(CACHE_KEYS.BUDGET_CATEGORIES, defaultBudgetCategories, CACHE_TTL.LONG);
      return defaultBudgetCategories;
    } catch (error) {
      console.error('❌ Error getting budget categories:', error);
      return defaultBudgetCategories;
    }
  }

  async getBudgetCategoryByName(name: string): Promise<BudgetCategory | null> {
    try {
      const categories = await this.getBudgetCategories();
      return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting budget category by name:', error);
      return null;
    }
  }

  async createBudgetCategory(category: Omit<BudgetCategory, 'id'>): Promise<BudgetCategory> {
    try {
      const categories = await this.getBudgetCategories();
      const newCategory: BudgetCategory = {
        ...category,
        id: Date.now().toString(),
      };

      categories.push(newCategory);
      await AsyncStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      return newCategory;
    } catch (error) {
      console.error('Error creating budget category:', error);
      throw error;
    }
  }

  // Monthly summary
  async getMonthlyBudgetSummary(monthYear: string): Promise<MonthlyBudgetSummary> {
    try {
      const budgets = await this.getBudgetsByMonth(monthYear);
      
      const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
      const totalRemaining = totalBudget - totalSpent;
      
      // Determine overall status
      let status: MonthlyBudgetSummary['status'] = 'on-track';
      if (totalSpent > totalBudget) {
        status = 'exceeded';
      } else if (totalSpent > totalBudget * 0.8) {
        status = 'warning';
      }

      // Calculate actual savings (assuming income - expenses)
      const totalIncome = await this.calculateMonthlyIncome(monthYear);
      const actualSavings = totalIncome - totalSpent;

      return {
        monthYear,
        totalBudget,
        totalSpent,
        totalRemaining,
        categories: budgets,
        status,
        actualSavings
      };
    } catch (error) {
      console.error('Error getting monthly budget summary:', error);
      return {
        monthYear,
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        categories: [],
        status: 'on-track',
        actualSavings: 0
      };
    }
  }

  // Analytics and insights
  async getBudgetAnalytics(monthYear?: string): Promise<{
    totalBudgeted: number;
    totalSpent: number;
    averageSpendingPerCategory: number;
    categoriesOverBudget: Budget[];
    categoriesUnderBudget: Budget[];
    spendingTrend: { month: string; amount: number }[];
    topSpendingCategories: { category: string; amount: number; percentage: number }[];
  }> {
    try {
      const currentMonth = monthYear || new Date().toISOString().slice(0, 7);
      const budgets = await this.getBudgetsByMonth(currentMonth);
      
      const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
      
      const categoriesOverBudget = budgets.filter(b => b.spentAmount > b.budgetAmount);
      const categoriesUnderBudget = budgets.filter(b => b.spentAmount < b.budgetAmount);
      
      // Get spending trend for last 6 months
      const spendingTrend = await this.getSpendingTrend(6);
      
      // Top spending categories
      const topSpendingCategories = budgets
        .sort((a, b) => b.spentAmount - a.spentAmount)
        .slice(0, 5)
        .map(budget => ({
          category: budget.categoryName,
          amount: budget.spentAmount,
          percentage: totalSpent > 0 ? (budget.spentAmount / totalSpent) * 100 : 0
        }));

      return {
        totalBudgeted,
        totalSpent,
        averageSpendingPerCategory: budgets.length > 0 ? totalSpent / budgets.length : 0,
        categoriesOverBudget,
        categoriesUnderBudget,
        spendingTrend,
        topSpendingCategories
      };
    } catch (error) {
      console.error('Error getting budget analytics:', error);
      return {
        totalBudgeted: 0,
        totalSpent: 0,
        averageSpendingPerCategory: 0,
        categoriesOverBudget: [],
        categoriesUnderBudget: [],
        spendingTrend: [],
        topSpendingCategories: []
      };
    }
  }

  async getSpendingTrend(months: number): Promise<{ month: string; amount: number }[]> {
    try {
      const trend: { month: string; amount: number }[] = [];
      const currentDate = new Date();
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = date.toISOString().slice(0, 7);
        
        const budgets = await this.getBudgetsByMonth(monthYear);
        const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
        
        trend.push({
          month: monthYear,
          amount: totalSpent
        });
      }
      
      return trend;
    } catch (error) {
      console.error('Error getting spending trend:', error);
      return [];
    }
  }

  // Budget recommendations
  async getBudgetRecommendations(monthYear: string): Promise<{
    type: 'increase' | 'decrease' | 'create';
    category: string;
    currentAmount: number;
    suggestedAmount: number;
    reason: string;
  }[]> {
    try {
      const recommendations: {
        type: 'increase' | 'decrease' | 'create';
        category: string;
        currentAmount: number;
        suggestedAmount: number;
        reason: string;
      }[] = [];

      const budgets = await this.getBudgetsByMonth(monthYear);
      const analytics = await this.getBudgetAnalytics(monthYear);
      
      // Check for categories that are consistently over budget
      for (const budget of budgets) {
        if (budget.spentAmount > budget.budgetAmount * 1.1) { // 10% over budget
          recommendations.push({
            type: 'increase',
            category: budget.categoryName,
            currentAmount: budget.budgetAmount,
            suggestedAmount: Math.ceil(budget.spentAmount * 1.1),
            reason: 'You consistently spend more than budgeted in this category'
          });
        } else if (budget.spentAmount < budget.budgetAmount * 0.5) { // Less than 50% used
          recommendations.push({
            type: 'decrease',
            category: budget.categoryName,
            currentAmount: budget.budgetAmount,
            suggestedAmount: Math.ceil(budget.spentAmount * 1.2),
            reason: 'You typically spend much less than budgeted'
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting budget recommendations:', error);
      return [];
    }
  }

  // Utility methods
  private calculateBudgetStatus(budget: Budget): Budget['status'] {
    const percentage = (budget.spentAmount / budget.budgetAmount) * 100;
    
    if (percentage > 100) {
      return 'exceeded';
    } else if (percentage >= budget.warningThreshold) {
      return 'warning';
    } else {
      return 'on-track';
    }
  }

  private async calculateMonthlyIncome(monthYear: string): Promise<number> {
    // This would integrate with the transaction service to get actual income
    // For now, return a default value
    return 3000; // Default monthly income
  }

  // Bulk operations
  async createBudgetTemplate(template: { categoryId: string; amount: number }[]): Promise<Budget[]> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const categories = await this.getBudgetCategories();
      const createdBudgets: Budget[] = [];

      for (const item of template) {
        const category = categories.find(c => c.id === item.categoryId);
        if (category) {
          try {
            const budget = await this.createBudgetForSystem({
              categoryId: item.categoryId,
              categoryName: category.name,
              monthYear: currentMonth,
              budgetAmount: item.amount,
              warningThreshold: 80,
            });
            createdBudgets.push(budget);
          } catch (error) {
            // Skip if budget already exists
            if (__DEV__) {
              console.log(`Budget for ${category.name} already exists`);
            }
          }
        }
      }

      return createdBudgets;
    } catch (error) {
      console.error('Error creating budget template:', error);
      throw error;
    }
  }

  async copyBudgetsToNextMonth(fromMonth: string, toMonth: string): Promise<Budget[]> {
    try {
      const sourceBudgets = await this.getBudgetsByMonth(fromMonth);
      const copiedBudgets: Budget[] = [];

      for (const sourceBudget of sourceBudgets) {
        try {
          const newBudget = await this.createBudgetForSystem({
            categoryId: sourceBudget.categoryId,
            categoryName: sourceBudget.categoryName,
            monthYear: toMonth,
            budgetAmount: sourceBudget.budgetAmount,
            warningThreshold: sourceBudget.warningThreshold,
            notes: sourceBudget.notes
          });
          copiedBudgets.push(newBudget);
        } catch (error) {
          // Skip if budget already exists
          if (__DEV__) {
            console.log(`Budget for ${sourceBudget.categoryName} already exists in ${toMonth}`);
          }
        }
      }

      return copiedBudgets;
    } catch (error) {
      console.error('Error copying budgets to next month:', error);
      throw error;
    }
  }

  // Clear all budgets - used for demo mode reset and account deletion
  async clearAllBudgets(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🗑️ Clearing all budgets...');
      }
      
      await AsyncStorage.removeItem(BUDGETS_STORAGE_KEY);
      // Don't clear categories as they are defaults that should persist
      
      // Clear cache
      cache.invalidate(CACHE_KEYS.BUDGETS);
      cache.invalidate(CACHE_KEYS.BUDGET_CATEGORIES);
      
      if (__DEV__) {
        console.log('✅ All budgets cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing budgets:', error);
      throw error;
    }
  }
}

export const budgetService = new BudgetService();