import { ApiResponse } from '../types';
import { firebaseAuthService } from './firebaseAuthService';

interface SpendingCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface SpendingStatistics {
  transactionCount: number;
  averagePerDay: number;
  highestCategory: string;
}

interface SpendingData {
  period: {
    type: 'week' | 'month' | 'year';
    startDate: string;
    endDate: string;
    days: number;
  };
  totalSpent: number;
  categories: SpendingCategory[];
  statistics: SpendingStatistics;
}

interface Recommendation {
  type: 'warning' | 'achievement' | 'tip';
  title: string;
  description: string;
  category?: string;
  emoji: string;
  percentageChange?: number;
}

interface TrendPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
}

interface TrendData {
  trend: TrendPoint[];
  period: {
    type: 'week' | 'month' | 'year';
    startDate: string;
    endDate: string;
    groupBy: 'day' | 'week' | 'month';
  };
}

interface RecommendationsData {
  recommendations: Recommendation[];
  monthlySummary: {
    current: Record<string, { amount: number; transactions: number; name: string }>;
    average: Record<string, { amount: number; transactions: number }>;
  };
}

class AnalyticsService {
  // For now, we'll use local calculations only
  // Later, we can add Firebase Functions for advanced analytics
  private loggedMessages: Set<string> = new Set();

  /**
   * Log a message only once to avoid console spam
   */
  private logOnce(message: string, emoji: string = ''): void {
    const key = `${emoji}${message}`;
    if (!this.loggedMessages.has(key)) {
      console.log(`${emoji} ${message}`.trim());
      this.loggedMessages.add(key);
    }
  }

  async getSpendingByCategory(period: 'week' | 'month' | 'year'): Promise<ApiResponse<SpendingData>> {
    try {
      // Check if user is authenticated
      const isAuth = firebaseAuthService.isAuthenticated();
      
      if (isAuth) {
        // For now, use local calculations even when authenticated
        // TODO: Implement Firebase Functions for server-side analytics
        this.logOnce('Using local analytics (Firebase Functions coming soon...)', '📊');
        return this.getLocalSpendingByCategory(period);
      } else {
        // Offline mode - use local calculations
        return this.getLocalSpendingByCategory(period);
      }
    } catch (error) {
      console.error('Error fetching spending data:', error);
      // Fallback to local data if API fails
      return this.getLocalSpendingByCategory(period);
    }
  }

  async getTrendData(
    period: 'week' | 'month' | 'year', 
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<TrendData>> {
    try {
      // Check if user is authenticated
      const isAuth = firebaseAuthService.isAuthenticated();
      
      if (isAuth) {
        // For now, use local calculations even when authenticated
        this.logOnce('Using local trend analysis (Firebase Functions coming soon...)', '📈');
        return this.getLocalTrendData(period, groupBy);
      } else {
        // Offline mode - use local calculations
        return this.getLocalTrendData(period, groupBy);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
      // Fallback to local data if API fails
      return this.getLocalTrendData(period, groupBy);
    }
  }

  async getRecommendations(): Promise<ApiResponse<RecommendationsData>> {
    try {
      // Check if user is authenticated
      const isAuth = firebaseAuthService.isAuthenticated();
      
      if (isAuth) {
        // For now, use local calculations even when authenticated
        this.logOnce('Using local recommendations (Firebase Functions coming soon...)', '💡');
        return this.getLocalRecommendations();
      } else {
        // Offline mode - use local calculations or mock data
        return this.getLocalRecommendations();
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback to local data if API fails
      return this.getLocalRecommendations();
    }
  }

  // Local data calculations (fallback when offline)
  private async getLocalSpendingByCategory(period: 'week' | 'month' | 'year'): Promise<ApiResponse<SpendingData>> {
    try {
      const { hybridDataService } = await import('./hybridDataService');
      const transactions = await hybridDataService.getTransactions();
      
      // Calculate period range
      const now = new Date();
      let startDate: Date;
      
      if (period === 'week') {
        startDate = new Date();
        startDate.setDate(now.getDate() - now.getDay());
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      
      // Filter transactions by period
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= now && t.type === 'EXPENSE';
      });

      // Get categories
      const categories = await hybridDataService.getCategories();
      
      // Group by category
      const categoryMap: Record<string, SpendingCategory> = {};
      let totalSpent = 0;
      
      filteredTransactions.forEach(t => {
        totalSpent += t.amount;
        
        const categoryId = t.categoryId || 'uncategorized';
        const category = categories.find(c => c.id === categoryId);
        
        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            id: categoryId,
            name: category?.name || 'Uncategorized',
            icon: category?.icon || '🏷️',
            color: category?.color || '#CCCCCC',
            amount: 0,
            percentage: 0,
            transactions: 0,
          };
        }
        
        categoryMap[categoryId].amount += t.amount;
        categoryMap[categoryId].transactions++;
      });
      
      // Calculate percentages
      const categoriesArray = Object.values(categoryMap).map(category => {
        category.percentage = totalSpent > 0 
          ? Math.round((category.amount / totalSpent) * 100) 
          : 0;
        return category;
      });
      
      // Sort by amount desc
      categoriesArray.sort((a, b) => b.amount - a.amount);
      
      // Statistics
      const dayDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        success: true,
        data: {
          period: {
            type: period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            days: dayDiff,
          },
          totalSpent,
          categories: categoriesArray,
          statistics: {
            transactionCount: filteredTransactions.length,
            averagePerDay: totalSpent / dayDiff,
            highestCategory: categoriesArray.length > 0 ? categoriesArray[0].name : 'N/A',
          }
        }
      };
    } catch (error) {
      console.error('Error calculating local spending data:', error);
      // Return mock data as final fallback
      return {
        success: true,
        data: this.getMockSpendingData(period),
      };
    }
  }
  
  private async getLocalRecommendations(): Promise<ApiResponse<RecommendationsData>> {
    try {
      // Simple local recommendations implementation
      const { hybridDataService } = await import('./hybridDataService');
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Get data for current month
      const currentMonthData = await hybridDataService.getMonthlySpending(currentYear, currentMonth);
      
      // Get data for previous month for comparison
      const previousMonthData = await hybridDataService.getMonthlySpending(
        currentMonth === 0 ? currentYear - 1 : currentYear, 
        currentMonth === 0 ? 11 : currentMonth - 1
      );
      
      // Generate simple recommendations
      const recommendations: Recommendation[] = [];
      
      // Compare spending
      if (currentMonthData.totalExpenses > previousMonthData.totalExpenses * 1.1) {
        const percentIncrease = Math.round(
          ((currentMonthData.totalExpenses - previousMonthData.totalExpenses) / 
           previousMonthData.totalExpenses) * 100
        );
        
        recommendations.push({
          type: 'warning',
          title: 'Higher spending this month',
          description: `Your spending is ${percentIncrease}% higher than last month.`,
          emoji: '⚠️',
          percentageChange: percentIncrease,
        });
      } else if (currentMonthData.totalExpenses < previousMonthData.totalExpenses * 0.9) {
        const percentDecrease = Math.round(
          ((previousMonthData.totalExpenses - currentMonthData.totalExpenses) / 
           previousMonthData.totalExpenses) * 100
        );
        
        recommendations.push({
          type: 'achievement',
          title: 'Great job saving!',
          description: `You've reduced spending by ${percentDecrease}% compared to last month.`,
          emoji: '🎉',
          percentageChange: -percentDecrease,
        });
      }
      
      // Add general tips
      recommendations.push({
        type: 'tip',
        title: 'Try the 50/30/20 rule',
        description: 'Consider allocating 50% of income to needs, 30% to wants, and 20% to savings.',
        emoji: '💰',
      });
      
      recommendations.push({
        type: 'tip',
        title: 'Track your subscriptions',
        description: 'Review your recurring subscriptions and cancel those you don\'t use often.',
        emoji: '📱',
      });
      
      // Return simplified structure 
      return {
        success: true,
        data: {
          recommendations: recommendations.slice(0, 3), // Limit to 3
          monthlySummary: {
            current: { total: { amount: currentMonthData.totalExpenses, transactions: currentMonthData.transactionCount, name: 'Total' } },
            average: { total: { amount: previousMonthData.totalExpenses, transactions: previousMonthData.transactionCount } }
          }
        }
      };
    } catch (error) {
      console.error('Error calculating local recommendations:', error);
      // Return mock recommendations as final fallback
      return {
        success: true,
        data: {
          recommendations: [
            {
              type: 'warning',
              title: 'Consider reducing utility expenses',
              description: 'Your utility spending is 36% of total expenses. Try switching to energy-efficient appliances.',
              emoji: '💡',
            },
            {
              type: 'achievement',
              title: 'Great progress on subscriptions!',
              description: 'You\'ve reduced subscription spending by 15% compared to last month.',
              emoji: '🎉',
              percentageChange: -15,
            },
            {
              type: 'tip',
              title: 'Try the 50/30/20 rule',
              description: 'Consider allocating 50% of income to needs, 30% to wants, and 20% to savings.',
              emoji: '💰',
            }
          ],
          monthlySummary: {
            current: { 
              utilities: { amount: 447.84, transactions: 5, name: 'Utilities' },
              subscriptions: { amount: 99.52, transactions: 3, name: 'Subscriptions' }
            },
            average: { 
              utilities: { amount: 400, transactions: 4 },
              subscriptions: { amount: 120, transactions: 3 }
            }
          }
        }
      };
    }
  }
  
  // Mock data generators (final fallback)
  private getMockSpendingData(period: 'week' | 'month' | 'year'): SpendingData {
    // Generate period dates
    const now = new Date();
    let startDate: Date;
    
    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - now.getDay());
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const dayDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Use mock categories from existing data
    const { mockSpendingCategories } = require('../data/mockData');
    const totalSpent = mockSpendingCategories.reduce((sum: number, cat: any) => sum + cat.amount, 0);
    
    return {
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        days: dayDiff,
      },
      totalSpent,
      categories: mockSpendingCategories.map((cat: any) => ({
        ...cat,
        transactions: Math.floor(Math.random() * 10) + 1,
      })),
      statistics: {
        transactionCount: 127,
        averagePerDay: totalSpent / 30,
        highestCategory: mockSpendingCategories[0].name,
      }
    };
  }

  private async getLocalTrendData(period: 'week' | 'month' | 'year', groupBy: 'day' | 'week' | 'month'): Promise<ApiResponse<TrendData>> {
    try {
      const { hybridDataService } = await import('./hybridDataService');
      const transactions = await hybridDataService.getTransactions();
      
      // Calculate period range
      const now = new Date();
      let startDate: Date;
      
      if (period === 'week') {
        startDate = new Date();
        startDate.setDate(now.getDate() - now.getDay());
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      
      // Filter transactions by period
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= now;
      });

      // Group transactions by date according to groupBy parameter
      const trendMap: Record<string, TrendPoint> = {};

      filteredTransactions.forEach(transaction => {
        const date = new Date(transaction.date);
        let groupKey: string = '';

        if (groupBy === 'day') {
          groupKey = date.toISOString().split('T')[0] || ''; // YYYY-MM-DD
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = weekStart.toISOString().split('T')[0] || ''; // Week starting YYYY-MM-DD
        } else {
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        }

        if (!trendMap[groupKey]) {
          trendMap[groupKey] = {
            date: groupKey,
            income: 0,
            expense: 0,
            net: 0,
          };
        }

        const amount = transaction.amount;
        if (transaction.type === 'INCOME') {
          trendMap[groupKey].income += amount;
        } else if (transaction.type === 'EXPENSE') {
          trendMap[groupKey].expense += amount;
        }
        
        // Calculate net (income - expense)
        trendMap[groupKey].net = trendMap[groupKey].income - trendMap[groupKey].expense;
      });

      // Convert to array and sort by date
      const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

      return {
        success: true,
        data: {
          trend,
          period: {
            type: period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            groupBy,
          },
        },
      };
    } catch (error) {
      console.error('Error calculating local trend data:', error);
      // Return mock data as final fallback
      return {
        success: true,
        data: this.getMockTrendData(period, groupBy),
      };
    }
  }

  // Mock data for trends
  private getMockTrendData(period: 'week' | 'month' | 'year', groupBy: 'day' | 'week' | 'month'): TrendData {
    // Generate period dates
    const now = new Date();
    let startDate: Date;
    
    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - now.getDay());
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    // Generate mock trend data
    const trend: TrendPoint[] = [];
    
    // Number of data points based on period and groupBy
    let dataPoints = 7; // default for week with day grouping
    
    if (period === 'month') {
      dataPoints = groupBy === 'day' ? 30 : 4; // ~30 days or ~4 weeks
    } else if (period === 'year') {
      dataPoints = groupBy === 'month' ? 12 : (groupBy === 'week' ? 52 : 30); // 12 months or ~52 weeks
    }
    
    // Generate random trend points
    for (let i = 0; i < dataPoints; i++) {
      const pointDate = new Date(startDate);
      
      if (groupBy === 'day') {
        pointDate.setDate(startDate.getDate() + i);
      } else if (groupBy === 'week') {
        pointDate.setDate(startDate.getDate() + i * 7);
      } else {
        pointDate.setMonth(startDate.getMonth() + i);
      }
      
      // Don't go beyond today
      if (pointDate > now) break;
      
      // Format date string based on groupBy
      let dateString: string;
      if (groupBy === 'day' || groupBy === 'week') {
        dateString = pointDate.toISOString().split('T')[0];
      } else {
        dateString = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      // Generate random amounts with some variation
      const baseIncome = 1000 + Math.random() * 500;
      const baseExpense = 700 + Math.random() * 400;
      
      trend.push({
        date: dateString,
        income: parseFloat(baseIncome.toFixed(2)),
        expense: parseFloat(baseExpense.toFixed(2)),
        net: parseFloat((baseIncome - baseExpense).toFixed(2)),
      });
    }
    
    return {
      trend,
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        groupBy,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
export type { SpendingCategory, SpendingData, Recommendation, RecommendationsData, TrendData, TrendPoint };