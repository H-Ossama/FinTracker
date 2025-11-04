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
  navigateTo?: string;
  isCustom?: boolean;
  navigateParams?: any;
}

export interface QuickActionScreenOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  routeName: string;
  params?: any;
  category: QuickAction['category'];
}

const QUICK_ACTIONS_KEY = '@quick_actions_settings';
const MAX_ENABLED_ACTIONS = 5;

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
    isModal: false,
    navigateTo: 'AddIncome',
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
    navigateTo: 'TabNavigator',
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
    navigateTo: 'TabNavigator',
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
    navigateTo: 'TabNavigator',
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
    navigateTo: 'TabNavigator',
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
    navigateTo: 'BudgetPlanner',
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
    navigateTo: 'BillsReminder',
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
    navigateTo: 'SavingsGoals',
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
    navigateTo: 'BorrowedMoneyHistory',
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
    navigateTo: 'TransactionsHistory',
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
    navigateTo: 'NotificationCenter',
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
    navigateTo: 'NotificationPreferences',
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
    navigateTo: 'UserProfile',
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
    navigateTo: 'QuickSettings',
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
    navigateTo: 'AppLockSettings',
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
    navigateTo: 'QuickActionsSettings',
  },
];

const SCREEN_OPTIONS: QuickActionScreenOption[] = [
  // Tabs (navigate to TabNavigator with params to select tab)
  {
    id: 'screen_tab_home',
    label: 'Home',
    description: 'Open the Home tab',
    icon: 'home',
    color: '#007AFF',
    routeName: 'TabNavigator',
    params: { screen: 'home' },
    category: 'navigation',
  },
  {
    id: 'screen_tab_insights',
    label: 'Insights',
    description: 'Open the Insights tab',
    icon: 'bar-chart',
    color: '#5856D6',
    routeName: 'TabNavigator',
    params: { screen: 'insights' },
    category: 'navigation',
  },
  {
    id: 'screen_tab_wallet',
    label: 'Wallet',
    description: 'Open the Wallet tab',
    icon: 'wallet-outline',
    color: '#34C759',
    routeName: 'TabNavigator',
    params: { screen: 'wallet' },
    category: 'navigation',
  },
  {
    id: 'screen_tab_more',
    label: 'More',
    description: 'Open the More tab',
    icon: 'menu',
    color: '#8E8E93',
    routeName: 'TabNavigator',
    params: { screen: 'more' },
    category: 'navigation',
  },
  {
    id: 'screen_add_income',
    label: 'Add Income',
    description: 'Open the Add Income screen',
    icon: 'add-circle',
    color: '#51CF66',
    routeName: 'AddIncome',
    category: 'financial',
  },
  {
    id: 'screen_borrowed_history',
    label: 'Borrowed Money History',
    description: 'Review borrowed and lent money entries',
    icon: 'people',
    color: '#30D158',
    routeName: 'BorrowedMoneyHistory',
    category: 'tools',
  },
  {
    id: 'screen_transactions_history',
    label: 'Transactions History',
    description: 'Browse your complete transaction log',
    icon: 'list',
    color: '#5AC8FA',
    routeName: 'TransactionsHistory',
    category: 'tools',
  },
  {
    id: 'screen_budget_planner',
    label: 'Budget Planner',
    description: 'Jump directly to the budget planner',
    icon: 'pie-chart',
    color: '#FF9500',
    routeName: 'BudgetPlanner',
    category: 'tools',
  },
  {
    id: 'screen_bills_tracker',
    label: 'Bills & Reminders',
    description: 'Manage bills and reminders',
    icon: 'receipt',
    color: '#FF2D55',
    routeName: 'BillsReminder',
    category: 'tools',
  },
  {
    id: 'screen_savings_goals',
    label: 'Savings Goals',
    description: 'Track progress towards your savings goals',
    icon: 'flag',
    color: '#FFD60A',
    routeName: 'SavingsGoals',
    category: 'tools',
  },
  {
    id: 'screen_reminders',
    label: 'Reminder Center',
    description: 'Review scheduled reminders and tasks',
    icon: 'alarm',
    color: '#34C759',
    routeName: 'Reminders',
    category: 'tools',
  },
  {
    id: 'screen_notification_center',
    label: 'Notification Center',
    description: 'Open the notification center modal',
    icon: 'notifications',
    color: '#FF3B30',
    routeName: 'NotificationCenter',
    category: 'settings',
  },
  {
    id: 'screen_notification_preferences',
    label: 'Notification Preferences',
    description: 'Adjust notification preferences',
    icon: 'notifications-outline',
    color: '#20C6F7',
    routeName: 'NotificationPreferences',
    category: 'settings',
  },
  {
    id: 'screen_user_profile',
    label: 'User Profile',
    description: 'Go to your profile settings',
    icon: 'person',
    color: '#AF52DE',
    routeName: 'UserProfile',
    category: 'settings',
  },
  {
    id: 'screen_quick_settings',
    label: 'Quick Settings',
    description: 'Manage app preferences quickly',
    icon: 'settings',
    color: '#8E8E93',
    routeName: 'QuickSettings',
    category: 'settings',
  },
  {
    id: 'screen_quick_actions_settings',
    label: 'Quick Actions Settings',
    description: 'Jump to quick action customization',
    icon: 'flash',
    color: '#FFD60A',
    routeName: 'QuickActionsSettings',
    category: 'settings',
  },
  {
    id: 'screen_app_lock_settings',
    label: 'App Lock Settings',
    description: 'Configure app lock and security',
    icon: 'lock-closed',
    color: '#FF6B6B',
    routeName: 'AppLockSettings',
    category: 'settings',
  },
  {
    id: 'screen_pin_setup',
    label: 'PIN Setup',
    description: 'Configure or update your security PIN',
    icon: 'key',
    color: '#5856D6',
    routeName: 'PinSetup',
    category: 'settings',
  },
];

class QuickActionsService {
  private sortActions(actions: QuickAction[]): QuickAction[] {
    return [...actions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private normalizeActions(actions: QuickAction[]): QuickAction[] {
    return actions.map((action, index) => ({
      ...action,
      enabled: Boolean(action.enabled),
      order: typeof action.order === 'number' ? action.order : index,
    }));
  }

  private async loadStoredActions(): Promise<QuickAction[] | null> {
    try {
      const storedActions = await AsyncStorage.getItem(QUICK_ACTIONS_KEY);
      if (!storedActions) {
        return null;
      }

      const parsed = JSON.parse(storedActions);
      if (!Array.isArray(parsed)) {
        return null;
      }

      return this.normalizeActions(parsed as QuickAction[]);
    } catch (error) {
      console.error('Error parsing stored quick actions:', error);
      return null;
    }
  }

  private mergeWithDefaults(actions: QuickAction[]): QuickAction[] {
    const storedMap = new Map(actions.map(action => [action.id, action]));
    const merged: QuickAction[] = [];

    DEFAULT_QUICK_ACTIONS.forEach(defaultAction => {
      const stored = storedMap.get(defaultAction.id);
      if (stored) {
        merged.push({
          ...defaultAction,
          ...stored,
          order: typeof stored.order === 'number' ? stored.order : defaultAction.order,
          enabled: stored.enabled ?? defaultAction.enabled,
          navigateTo: stored.navigateTo ?? defaultAction.navigateTo,
          isModal: stored.isModal ?? defaultAction.isModal,
        });
        storedMap.delete(defaultAction.id);
      } else {
        merged.push({ ...defaultAction });
      }
    });

    storedMap.forEach(action => {
      merged.push({ ...action });
    });

    return this.sortActions(merged);
  }

  private async getActionState(): Promise<QuickAction[]> {
    const stored = await this.loadStoredActions();
    if (!stored || stored.length === 0) {
      await this.saveQuickActions([...DEFAULT_QUICK_ACTIONS]);
      return [...DEFAULT_QUICK_ACTIONS];
    }

    return this.mergeWithDefaults(stored);
  }

  private getNextOrder(actions: QuickAction[]): number {
    if (actions.length === 0) {
      return 0;
    }
    return actions.reduce((max, action) => Math.max(max, action.order ?? 0), 0) + 1;
  }

  async getQuickActions(): Promise<QuickAction[]> {
    try {
      return this.sortActions(await this.getActionState());
    } catch (error) {
      console.error('Error getting quick actions:', error);
      return [...DEFAULT_QUICK_ACTIONS];
    }
  }

  async saveQuickActions(actions: QuickAction[]): Promise<void> {
    try {
      const normalized = this.normalizeActions(this.sortActions(actions)).map((action, index) => ({
        ...action,
        order: index,
      }));
      await AsyncStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error('Error saving quick actions:', error);
      throw error;
    }
  }

  async toggleQuickAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getQuickActions();
      const updated = actions.map(action =>
        action.id === actionId ? { ...action, enabled: !action.enabled } : action
      );
      await this.saveQuickActions(updated);
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
      const enabledActions = actions.filter(action => action.enabled);
      // Enforce the limit by taking only the first MAX_ENABLED_ACTIONS actions
      return this.sortActions(enabledActions.slice(0, MAX_ENABLED_ACTIONS));
    } catch (error) {
      console.error('Error getting enabled quick actions:', error);
      return [];
    }
  }

  getMaxEnabledActions(): number {
    return MAX_ENABLED_ACTIONS;
  }

  async getEnabledActionsCount(): Promise<number> {
    try {
      const actions = await this.getQuickActions();
      return actions.filter(action => action.enabled).length;
    } catch (error) {
      console.error('Error getting enabled actions count:', error);
      return 0;
    }
  }

  async canEnableMoreActions(): Promise<boolean> {
    const count = await this.getEnabledActionsCount();
    return count < MAX_ENABLED_ACTIONS;
  }

  async getQuickActionsByCategory(category: string): Promise<QuickAction[]> {
    try {
      const actions = await this.getQuickActions();
      return this.sortActions(actions.filter(action => action.category === category));
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
      await this.saveQuickActions([...DEFAULT_QUICK_ACTIONS]);
    } catch (error) {
      console.error('Error resetting quick actions:', error);
      throw error;
    }
  }

  getAllAvailableActions(): QuickAction[] {
    return [...DEFAULT_QUICK_ACTIONS];
  }

  async getAllActionsWithUserSettings(): Promise<QuickAction[]> {
    return this.getQuickActions();
  }

  getScreenOptions(): QuickActionScreenOption[] {
    return [...SCREEN_OPTIONS];
  }

  getAvailableScreenOptions(currentActions: QuickAction[]): QuickActionScreenOption[] {
    const takenKeys = new Set(
      currentActions
        .filter(action => action.navigateTo) // Only consider actions that actually navigate to screens
        .map(action => `${action.navigateTo}::${JSON.stringify(action.navigateParams ?? {})}`)
    );

    return SCREEN_OPTIONS.filter(option => {
      const key = `${option.routeName}::${JSON.stringify(option.params ?? {})}`;
      return !takenKeys.has(key);
    });
  }

  async addScreenAction(optionId: string): Promise<QuickAction[]> {
    const option = SCREEN_OPTIONS.find(o => o.id === optionId);
    if (!option) {
      throw new Error(`Unknown screen option: ${optionId}`);
    }

    const actions = await this.getQuickActions();
    if (
      actions.some(action =>
        action.navigateTo === option.routeName &&
        JSON.stringify(action.navigateParams ?? {}) === JSON.stringify(option.params ?? {})
      )
    ) {
      return actions;
    }

    // Check if we can enable more actions (considering the new action will be enabled by default)
    const enabledCount = actions.filter(action => action.enabled).length;
    if (enabledCount >= MAX_ENABLED_ACTIONS) {
      throw new Error(`Cannot add more than ${MAX_ENABLED_ACTIONS} enabled quick actions. Please disable some actions first.`);
    }

    const nextOrder = this.getNextOrder(actions);
    const newAction: QuickAction = {
      id: option.id,
      label: option.label,
      description: option.description,
      icon: option.icon,
      color: option.color,
      action: `navigate:${option.routeName}`,
      enabled: true,
      order: nextOrder,
      category: option.category,
      isModal: false,
      navigateTo: option.routeName,
      isCustom: true,
      navigateParams: option.params ?? undefined,
    };

    const updated = [...actions, newAction];
    await this.saveQuickActions(updated);
    return this.getQuickActions();
  }

  async removeScreenAction(actionId: string): Promise<QuickAction[]> {
    const actions = await this.getQuickActions();
    const actionToRemove = actions.find(action => action.id === actionId);
    
    // Only allow removal of custom actions (not default ones)
    if (!actionToRemove || !actionToRemove.isCustom) {
      throw new Error('Cannot remove this action');
    }

    const updated = actions.filter(action => action.id !== actionId);
    await this.saveQuickActions(updated);
    return this.getQuickActions();
  }
}

export const quickActionsService = new QuickActionsService();
