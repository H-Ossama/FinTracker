// Import polyfills first
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Import console override first to silence production logs
import './src/utils/consoleOverride';

import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';

// Lazy load components to reduce initial bundle size and improve performance
const SwipeableBottomTabNavigator = lazy(() => import('./src/components/SwipeableBottomTabNavigator'));
const TouchActivityWrapper = lazy(() => import('./src/components/TouchActivityWrapper'));
const AddIncomeScreen = lazy(() => import('./src/screens/AddIncomeScreen'));
const BorrowedMoneyHistoryScreen = lazy(() => import('./src/screens/BorrowedMoneyHistoryScreen'));
const TransactionsHistoryScreen = lazy(() => import('./src/screens/TransactionsHistoryScreen'));
const NotificationCenterScreen = lazy(() => import('./src/screens/NotificationCenterScreen'));
const NotificationPreferencesScreen = lazy(() => import('./src/screens/NotificationPreferencesScreen'));
const SignUpScreen = lazy(() => import('./src/screens/SignUpScreen'));
const SignInScreen = lazy(() => import('./src/screens/SignInScreen'));
import AccessDeniedScreen from './src/screens/AccessDeniedScreen'; // Import directly instead of lazy loading
const UserProfileScreen = lazy(() => import('./src/screens/UserProfileScreen'));
const SavingsGoalsScreen = lazy(() => import('./src/screens/SavingsGoalsScreen'));
const QuickSettingsScreen = lazy(() => import('./src/screens/QuickSettingsScreen'));
const QuickActionsSettingsScreen = lazy(() => import('./src/screens/QuickActionsSettingsScreen'));
const AppLockSettingsScreen = lazy(() => import('./src/screens/AppLockSettingsScreen'));
const PinSetupScreen = lazy(() => import('./src/screens/PinSetupScreen'));
const AppLockScreen = lazy(() => import('./src/screens/AppLockScreen'));
const BillsTrackerScreen = lazy(() => import('./src/screens/BillsTrackerScreen'));
const BudgetPlannerScreen = lazy(() => import('./src/screens/BudgetPlannerScreen'));
const RemindersScreen = lazy(() => import('./src/screens/RemindersScreen'));
const SyncTestScreen = lazy(() => import('./src/screens/SyncTestScreen'));
const DevelopmentToolsScreen = lazy(() => import('./src/screens/DevelopmentToolsScreen'));
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/contexts/LocalizationContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { QuickActionsProvider } from './src/contexts/QuickActionsContext';
import { hybridDataService, AppInitResult } from './src/services/hybridDataService';
import AppLockService from './src/services/appLockService';
import BatteryOptimizer from './src/utils/batteryOptimizer';
// import { initializeAppOptimizations } from './src/utils/optimizations';
const SyncReminderBanner = lazy(() => import('./src/components/SyncReminderBanner'));
import { navigationRef, onNavigationReady } from './src/navigation/navigationService';

const Stack = createStackNavigator();

// Suspense fallback component for lazy loading
const LazyLoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color="#007AFF" />
  </View>
);

// Optimized screen wrapper for better performance
const ScreenWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    
    return () => task.cancel();
  }, []);
  
  if (!isReady) {
    return <LazyLoadingFallback />;
  }
  
  return <>{children}</>;
};

const AppNavigator = React.memo(() => {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading: authLoading, accessDenied } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appLockInitialized, setAppLockInitialized] = useState(false);
  const appLockService = AppLockService.getInstance();

  // ALL HOOKS MUST BE DEFINED BEFORE ANY CONDITIONAL RETURNS
  const initializeAppLock = useCallback(async () => {
    try {
      await appLockService.initialize();
      const settings = appLockService.getSettings();
      
      // Set up lock state change listener
      appLockService.setLockStateChangeListener((locked: boolean) => {
        setIsAppLocked(locked);
      });
      
      // Check if app should be locked on startup
      if (settings?.isEnabled && (settings.hasPinSet || settings.requireBiometric)) {
        appLockService.lock(); // Lock immediately on app start
      }
      
      setAppLockInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app lock:', error);
      setAppLockInitialized(true);
    }
  }, [appLockService]);

  const handleUnlock = useCallback(() => {
    appLockService.unlock();
  }, [appLockService]);

  useEffect(() => {
    if (isAuthenticated) {
      initializeAppLock();
    }
    
    // Cleanup function - optimize cleanup to reduce background processing
    return () => {
      if (isAuthenticated) {
        appLockService.cleanup();
      }
    };
  }, [isAuthenticated, initializeAppLock, appLockService]);

  if (authLoading || (isAuthenticated && !appLockInitialized)) {
    return <LoadingScreen />;
  }

  // Show access denied screen if access is denied
  if (accessDenied.isDenied) {
    return (
      <AccessDeniedScreen 
        onReturnToLogin={() => {
          // Navigation will automatically show sign in screen when access is cleared
        }} 
      />
    );
  }

  // Show lock screen if app is locked and user is authenticated
  if (isAuthenticated && isAppLocked) {
    return (
      <Suspense fallback={<LazyLoadingFallback />}>
        <AppLockScreen onUnlock={handleUnlock} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LazyLoadingFallback />}>
      <TouchActivityWrapper>
        <NavigationContainer 
          ref={navigationRef} 
          onReady={onNavigationReady}
          theme={{
            dark: isDark,
            colors: {
              primary: '#007AFF',
              background: isDark ? '#000000' : '#FFFFFF',
              card: isDark ? '#1C1C1E' : '#FFFFFF',
              text: isDark ? '#FFFFFF' : '#000000',
              border: isDark ? '#38383A' : '#C6C6C8',
              notification: '#FF3B30',
            },
          }}
        >
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animationEnabled: true,
              gestureEnabled: true,
              cardStyle: { backgroundColor: 'transparent' },
              cardStyleInterpolator: ({ current, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                };
              },
            }}
          >
            {isAuthenticated ? (
              // Authenticated user screens
              <>
                <Stack.Screen name="TabNavigator" component={SwipeableBottomTabNavigator} />
                <Stack.Screen name="AddIncome" component={AddIncomeScreen} />
                <Stack.Screen 
                  name="BorrowedMoneyHistory" 
                  component={BorrowedMoneyHistoryScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="TransactionsHistory" 
                  component={TransactionsHistoryScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="NotificationCenter" 
                  component={NotificationCenterScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen 
                  name="NotificationPreferences" 
                  component={NotificationPreferencesScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen 
                  name="UserProfile" 
                  component={UserProfileScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen 
                  name="SavingsGoals" 
                  component={SavingsGoalsScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="QuickSettings" 
                  component={QuickSettingsScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen 
                  name="QuickActionsSettings" 
                  component={QuickActionsSettingsScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen 
                  name="AppLockSettings" 
                  component={AppLockSettingsScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen 
                  name="PinSetup" 
                  component={PinSetupScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen 
                  name="BillsReminder" 
                  component={BillsTrackerScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="BudgetPlanner" 
                  component={BudgetPlannerScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="Reminders" 
                  component={RemindersScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="SyncTest" 
                  component={SyncTestScreen}
                  options={{ 
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="DevelopmentTools" 
                  component={DevelopmentToolsScreen}
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
              </>
            ) : (
              // Unauthenticated user screens
              <>
                <Stack.Screen 
                  name="SignIn" 
                  component={SignInScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="SignUp" 
                  component={SignUpScreen}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </TouchActivityWrapper>
    </Suspense>
  );
});

// Loading screen component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Initializing FINEX...</Text>
  </View>
);

// Error screen component
const ErrorScreen = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Initialization Failed</Text>
    <Text style={styles.errorText}>{error}</Text>
    <Text style={styles.retryText} onPress={onRetry}>
      Tap to retry
    </Text>
  </View>
);

export default function App() {
  const [initResult, setInitResult] = useState<AppInitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ALL HOOKS MUST BE AT THE TOP BEFORE ANY CONDITIONAL RETURNS
  
  // Initialize battery optimizer and general optimizations
  useEffect(() => {
    const batteryOptimizer = BatteryOptimizer.getInstance();
    
    return () => {
      // Cleanup battery optimizer and all optimizations on app unmount
      batteryOptimizer.cleanup();
      cleanupOptimizations();
    };
  }, []);

  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Initializing FINEX...');
      
      // Initialize all performance optimizations first
      // await initializeAppOptimizations({
      //   enableStorageOptimization: true,
      //   enableMemoryManagement: true,
      //   enableNetworkOptimization: true,
      //   enableCodeSplitting: true,
      //   enablePerformanceMonitoring: __DEV__, // Only in development
      // });
      
      const result = await hybridDataService.initializeApp();
      setInitResult(result);
      
      if (result.success) {
        console.log('✅ App initialized successfully');
        console.log('📊 Sync Status:', result.syncStatus);
      } else {
        console.error('❌ App initialization failed:', result.error);
      }
    } catch (error) {
      console.error('💥 App initialization crashed:', error);
      setInitResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        syncStatus: {
          enabled: false,
          authenticated: false,
          pendingItems: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleSyncComplete = useCallback(() => {
    console.log('🔄 Sync completed from reminder');
  }, []);

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  
  // Show loading screen while initializing
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  // Show error screen if initialization failed
  if (!initResult?.success) {
    return (
      <SafeAreaProvider>
        <ErrorScreen 
          error={initResult?.error || 'Unknown error'} 
          onRetry={initializeApp}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <QuickActionsProvider>
                <View style={styles.appContainer}>
                  <AppNavigator />
                  {/* Lazy load sync reminder banner - positioned after navigator to overlay properly */}
                  <Suspense fallback={null}>
                    <SyncReminderBanner onSyncComplete={handleSyncComplete} />
                  </Suspense>
                </View>
              </QuickActionsProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});