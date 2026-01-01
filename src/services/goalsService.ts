import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../types';

const GOALS_STORAGE_KEY = '@fintracker_goals';

export class GoalsService {
  // Get all goals
  static async getAllGoals(): Promise<Goal[]> {
    try {
      const goalsJson = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (goalsJson) {
        return JSON.parse(goalsJson);
      }
      
      // Return empty array for new users - they should start with no goals
      return [];
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  // Seed demo goals - only called when user explicitly requests demo data
  static async seedDemoGoals(): Promise<Goal[]> {
    try {
      const demoGoals: Goal[] = [
        {
          id: Date.now().toString(),
          title: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 3500,
          targetDate: '2024-12-31',
          category: 'Savings'
        },
        {
          id: (Date.now() + 1).toString(),
          title: 'Vacation Trip',
          targetAmount: 5000,
          currentAmount: 1200,
          targetDate: '2024-08-15',
          category: 'Travel'
        },
        {
          id: (Date.now() + 2).toString(),
          title: 'New Car Down Payment',
          targetAmount: 15000,
          currentAmount: 8500,
          targetDate: '2025-06-01',
          category: 'Transportation'
        }
      ];
      
      await this.saveGoals(demoGoals);
      return demoGoals;
    } catch (error) {
      console.error('Error seeding demo goals:', error);
      return [];
    }
  }

  // Clear all goals
  static async clearAllGoals(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GOALS_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing goals:', error);
      throw error;
    }
  }

  // Save goals to storage
  private static async saveGoals(goals: Goal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals:', error);
      throw error;
    }
  }

  // Add a new goal
  static async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal> {
    try {
      const goals = await this.getAllGoals();
      const newGoal: Goal = {
        ...goal,
        id: Date.now().toString()
      };
      
      goals.push(newGoal);
      await this.saveGoals(goals);
      return newGoal;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  }

  // Update an existing goal
  static async updateGoal(goalId: string, updates: Partial<Omit<Goal, 'id'>>): Promise<Goal | null> {
    try {
      const goals = await this.getAllGoals();
      const goalIndex = goals.findIndex(g => g.id === goalId);
      
      if (goalIndex === -1) {
        throw new Error('Goal not found');
      }
      
      goals[goalIndex] = { ...goals[goalIndex], ...updates };
      await this.saveGoals(goals);
      return goals[goalIndex];
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  // Delete a goal
  static async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const goals = await this.getAllGoals();
      const filteredGoals = goals.filter(g => g.id !== goalId);
      
      if (filteredGoals.length === goals.length) {
        throw new Error('Goal not found');
      }
      
      await this.saveGoals(filteredGoals);
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  // Get a specific goal by ID
  static async getGoalById(goalId: string): Promise<Goal | null> {
    try {
      const goals = await this.getAllGoals();
      return goals.find(g => g.id === goalId) || null;
    } catch (error) {
      console.error('Error getting goal by ID:', error);
      return null;
    }
  }

  // Add money to a goal (update currentAmount)
  static async addMoneyToGoal(goalId: string, amount: number): Promise<Goal | null> {
    try {
      const goal = await this.getGoalById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
      return await this.updateGoal(goalId, { currentAmount: newAmount });
    } catch (error) {
      console.error('Error adding money to goal:', error);
      throw error;
    }
  }

  // Withdraw money from a goal
  static async withdrawFromGoal(goalId: string, amount: number): Promise<Goal | null> {
    try {
      const goal = await this.getGoalById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      const newAmount = Math.max(goal.currentAmount - amount, 0);
      return await this.updateGoal(goalId, { currentAmount: newAmount });
    } catch (error) {
      console.error('Error withdrawing from goal:', error);
      throw error;
    }
  }

  // Get goals summary
  static async getGoalsSummary(): Promise<{
    totalGoals: number;
    completedGoals: number;
    totalSaved: number;
    totalTarget: number;
  }> {
    try {
      const goals = await this.getAllGoals();
      const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount);
      const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
      const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
      
      return {
        totalGoals: goals.length,
        completedGoals: completedGoals.length,
        totalSaved,
        totalTarget
      };
    } catch (error) {
      console.error('Error getting goals summary:', error);
      return {
        totalGoals: 0,
        completedGoals: 0,
        totalSaved: 0,
        totalTarget: 0
      };
    }
  }

  // Clear all goals (for testing/reset purposes)
}

export default GoalsService;