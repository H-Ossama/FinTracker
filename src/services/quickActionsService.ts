import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  action: string;
  enabled: boolean;
  order: number;
}

const QUICK_ACTIONS_KEY = '@quick_actions_settings';

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add_expense',
    label: 'Add Expense',
    description: 'Quickly record a new expense',
    icon: 'remove-circle',
    color: '#FF6B6B',
    action: 'addExpense',
    enabled: true,
    order: 0,
  },
  {
    id: 'add_income',
    label: 'Add Income',
    description: 'Record a new income',
    icon: 'add-circle',
    color: '#51CF66',
    action: 'addIncome',
    enabled: true,
    order: 1,
  },
  {
    id: 'transfer',
    label: 'Transfer',
    description: 'Transfer money between wallets',
    icon: 'swap-horizontal',
    color: '#4A90E2',
    action: 'transfer',
    enabled: true,
    order: 2,
  },
  {
    id: 'add_wallet',
    label: 'Add Wallet',
    description: 'Create a new wallet',
    icon: 'wallet',
    color: '#9013FE',
    action: 'addWallet',
    enabled: true,
    order: 3,
  },
  {
    id: 'add_goal',
    label: 'Add Goal',
    description: 'Set a new savings goal',
    icon: 'flag',
    color: '#FFA500',
    action: 'addGoal',
    enabled: false,
    order: 4,
  },
  {
    id: 'add_reminder',
    label: 'Add Reminder',
    description: 'Create a bill reminder',
    icon: 'notifications',
    color: '#20C6F7',
    action: 'addReminder',
    enabled: false,
    order: 5,
  },
];

class QuickActionsService {
  async getQuickActions(): Promise<QuickAction[]> {
    try {
      const storedActions = await AsyncStorage.getItem(QUICK_ACTIONS_KEY);
      if (storedActions) {
        return JSON.parse(storedActions);
      }
      // Initialize with defaults
      await this.saveQuickActions(DEFAULT_QUICK_ACTIONS);
      return DEFAULT_QUICK_ACTIONS;
    } catch (error) {
      console.error('Error getting quick actions:', error);
      return DEFAULT_QUICK_ACTIONS;
    }
  }

  async saveQuickActions(actions: QuickAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving quick actions:', error);
      throw error;
    }
  }

  async toggleQuickAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getQuickActions();
      const updatedActions = actions.map(action =>
        action.id === actionId ? { ...action, enabled: !action.enabled } : action
      );
      await this.saveQuickActions(updatedActions);
    } catch (error) {
      console.error('Error toggling quick action:', error);
      throw error;
    }
  }

  async reorderQuickActions(actions: QuickAction[]): Promise<void> {
    try {
      await this.saveQuickActions(actions);
    } catch (error) {
      console.error('Error reordering quick actions:', error);
      throw error;
    }
  }

  async getEnabledQuickActions(): Promise<QuickAction[]> {
    try {
      const actions = await this.getQuickActions();
      return actions
        .filter(action => action.enabled)
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error getting enabled quick actions:', error);
      return [];
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      await this.saveQuickActions(DEFAULT_QUICK_ACTIONS);
    } catch (error) {
      console.error('Error resetting quick actions:', error);
      throw error;
    }
  }
}

export const quickActionsService = new QuickActionsService();
