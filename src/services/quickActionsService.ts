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
  category: 'financial' | 'navigation' | 'tools' | 'settings';
  isModal?: boolean; // Indicates if this action opens a modal vs navigates to a screen
}

const QUICK_ACTIONS_KEY = '@quick_actions_settings';

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  // Financial Actions (Modal-based)
  {
    id: 'add_expense',
    label: 'Add Expense',
    description: 'Quickly record a new expense',
    icon: 'remove-circle',
    color: '#FF6B6B',
    action: 'addExpense',
    enabled: true,
    order: 0,
    category: 'financial',
    isModal: true,
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
    category: 'financial',
    isModal: false, // Has its own screen
  },
  {
    id: 'transfer',
    label: 'Transfer Money',
    description: 'Transfer money between wallets',
    icon: 'swap-horizontal',
    color: '#4A90E2',
    action: 'transfer',
    enabled: true,
    order: 2,
    category: 'financial',
    isModal: true,
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
    category: 'financial',
    isModal: true,
  },
  {
    id: 'add_money',
    label: 'Add Money',
    description: 'Add money to a wallet',
    icon: 'cash',
    color: '#7ED321',
    action: 'addMoney',
    enabled: false,
    order: 4,
    category: 'financial',
    isModal: true,
  },

  // Navigation Actions (Screen-based)
  {
    id: 'home',
    label: 'Home',
    description: 'Go to home dashboard',
    icon: 'home',
    color: '#007AFF',
    action: 'home',
    enabled: false,
    order: 10,
    category: 'navigation',
    isModal: false,
  },
  {
    id: 'insights',
    label: 'Insights',
    description: 'View spending analytics',
    icon: 'bar-chart',
    color: '#5856D6',
    action: 'insights',
    enabled: false,
    order: 11,
    category: 'navigation',
    isModal: false,
  },
  {
    id: 'wallet',
    label: 'Wallet',
    description: 'Manage your wallets',
    icon: 'wallet-outline',
    color: '#34C759',
    action: 'wallet',
    enabled: false,
    order: 12,
    category: 'navigation',
    isModal: false,
  },
  {
    id: 'more',
    label: 'More',
    description: 'More options and settings',
    icon: 'menu',
    color: '#8E8E93',
    action: 'more',
    enabled: false,
    order: 13,
    category: 'navigation',
    isModal: false,
  },

  // Tools & Features
  {
    id: 'budget_planner',
    label: 'Budget Planner',
    description: 'Plan and manage your budget',
    icon: 'pie-chart',
    color: '#FF9500',
    action: 'budget',
    enabled: false,
    order: 20,
    category: 'tools',
    isModal: false,
  },
  {
    id: 'bills_reminder',
    label: 'Bills & Reminders',
    description: 'Track bills and reminders',
    icon: 'receipt',
    color: '#FF2D55',
    action: 'bills',
    enabled: false,
    order: 21,
    category: 'tools',
    isModal: false,
  },
  {
    id: 'savings_goals',
    label: 'Savings Goals',
    description: 'Set and track savings goals',
    icon: 'flag',
    color: '#FFD60A',
    action: 'goals',
    enabled: false,
    order: 22,
    category: 'tools',
    isModal: false,
  },
  {
    id: 'borrowed_money',
    label: 'Borrowed Money',
    description: 'Track borrowed and lent money',
    icon: 'people',
    color: '#30D158',
    action: 'borrowedMoney',
    enabled: false,
    order: 23,
    category: 'tools',
    isModal: false,
  },
  {
    id: 'transactions_history',
    label: 'Transaction History',
    description: 'View all transactions',
    icon: 'list',
    color: '#5AC8FA',
    action: 'transactionsHistory',
    enabled: false,
    order: 24,
    category: 'tools',
    isModal: false,
  },

  // Settings & Preferences
  {
    id: 'notification_center',
    label: 'Notifications',
    description: 'View notifications',
    icon: 'notifications',
    color: '#FF3B30',
    action: 'notificationCenter',
    enabled: false,
    order: 30,
    category: 'settings',
    isModal: true,
  },
  {
    id: 'notification_preferences',
    label: 'Notification Settings',
    description: 'Configure notification preferences',
    icon: 'notifications-outline',
    color: '#20C6F7',
    action: 'notificationPreferences',
    enabled: false,
    order: 31,
    category: 'settings',
    isModal: true,
  },
  {
    id: 'user_profile',
    label: 'User Profile',
    description: 'Manage your profile',
    icon: 'person',
    color: '#AF52DE',
    action: 'userProfile',
    enabled: false,
    order: 32,
    category: 'settings',
    isModal: true,
  },
  {
    id: 'app_settings',
    label: 'App Settings',
    description: 'Configure app preferences',
    icon: 'settings',
    color: '#8E8E93',
    action: 'quickSettings',
    enabled: false,
    order: 33,
    category: 'settings',
    isModal: true,
  },
  {
    id: 'app_lock',
    label: 'App Lock Settings',
    description: 'Configure app security',
    icon: 'lock-closed',
    color: '#FF6B6B',
    action: 'appLockSettings',
    enabled: false,
    order: 34,
    category: 'settings',
    isModal: true,
  },

  // Quick Actions (always enabled but at bottom)
  {
    id: 'quick_actions_settings',
    label: 'Quick Actions Settings',
    description: 'Customize quick action shortcuts',
    icon: 'flash',
    color: '#FFD60A',
    action: 'quickActionsSettings',
    enabled: false,
    order: 40,
    category: 'settings',
    isModal: true,
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

  async getQuickActionsByCategory(category: string): Promise<QuickAction[]> {
    try {
      const actions = await this.getQuickActions();
      return actions
        .filter(action => action.category === category)
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error getting quick actions by category:', error);
      return [];
    }
  }

  async getQuickActionCategories(): Promise<{ category: string; label: string; icon: string; count: number }[]> {
    try {
      const actions = await this.getQuickActions();
      const categories = [
        { category: 'financial', label: 'Financial Actions', icon: 'card' },
        { category: 'navigation', label: 'Navigation', icon: 'compass' },
        { category: 'tools', label: 'Tools & Features', icon: 'construct' },
        { category: 'settings', label: 'Settings', icon: 'settings' },
      ];
      
      return categories.map(cat => ({
        ...cat,
        count: actions.filter(action => action.category === cat.category).length,
      }));
    } catch (error) {
      console.error('Error getting quick action categories:', error);
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

  // Get all available actions (for settings screen)
  getAllAvailableActions(): QuickAction[] {
    return [...DEFAULT_QUICK_ACTIONS];
  }

  // Merge user settings with all available actions
  async getAllActionsWithUserSettings(): Promise<QuickAction[]> {
    try {
      const userActions = await this.getQuickActions();
      const userEnabledIds = new Set(userActions.filter(a => a.enabled).map(a => a.id));
      
      return DEFAULT_QUICK_ACTIONS.map(action => ({
        ...action,
        enabled: userEnabledIds.has(action.id),
      }));
    } catch (error) {
      console.error('Error getting actions with user settings:', error);
      return DEFAULT_QUICK_ACTIONS;
    }
  }
}

export const quickActionsService = new QuickActionsService();
