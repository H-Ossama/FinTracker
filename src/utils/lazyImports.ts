/**
 * Lazy imports for code splitting and bundle size optimization
 * This helps reduce the initial bundle size by loading components only when needed
 */

import { lazy } from 'react';

// Screens that are not immediately needed can be loaded lazily
export const LazyAddIncomeScreen = lazy(() => import('../screens/AddIncomeScreen'));
export const LazyBorrowedMoneyHistoryScreen = lazy(() => import('../screens/BorrowedMoneyHistoryScreen'));
export const LazyTransactionsHistoryScreen = lazy(() => import('../screens/TransactionsHistoryScreen'));
export const LazyNotificationCenterScreen = lazy(() => import('../screens/NotificationCenterScreen'));
export const LazyNotificationPreferencesScreen = lazy(() => import('../screens/NotificationPreferencesScreen'));
export const LazyUserProfileScreen = lazy(() => import('../screens/UserProfileScreen'));
export const LazySavingsGoalsScreen = lazy(() => import('../screens/SavingsGoalsScreen'));
export const LazyQuickSettingsScreen = lazy(() => import('../screens/QuickSettingsScreen'));
export const LazyAppLockSettingsScreen = lazy(() => import('../screens/AppLockSettingsScreen'));
export const LazyPinSetupScreen = lazy(() => import('../screens/PinSetupScreen'));
export const LazyBillsTrackerScreen = lazy(() => import('../screens/BillsTrackerScreen'));
export const LazyBudgetPlannerScreen = lazy(() => import('../screens/BudgetPlannerScreen'));

// Modal components that can be loaded lazily
export const LazyAddExpenseModal = lazy(() => import('../components/AddExpenseModal'));
export const LazyAddIncomeModal = lazy(() => import('../components/AddIncomeModal'));
export const LazyAddWalletModal = lazy(() => import('../components/AddWalletModal'));
export const LazyAddGoalModal = lazy(() => import('../components/AddGoalModal'));
export const LazyAddBillModal = lazy(() => import('../components/AddBillModal'));
export const LazyAddBudgetModal = lazy(() => import('../components/AddBudgetModal'));
export const LazyAddBorrowedMoneyModal = lazy(() => import('../components/AddBorrowedMoneyModal'));
export const LazyAddReminderModal = lazy(() => import('../components/AddReminderModal'));
export const LazyTransferModal = lazy(() => import('../components/TransferModal'));
export const LazySyncSettingsModal = lazy(() => import('../components/SyncSettingsModal'));
export const LazyBorrowedMoneyDetailsModal = lazy(() => import('../components/BorrowedMoneyDetailsModal'));

// Example screen that's rarely accessed (commented out as files are empty)
// export const LazyTranslationExampleScreen = lazy(() => import('../screens/TranslationExampleScreen'));
// export const LazyTranslationManagementScreen = lazy(() => import('../screens/TranslationManagementScreen'));