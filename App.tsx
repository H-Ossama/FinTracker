// Import polyfills first
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer;

// Import console override first to silence production logs
import './src/utils/consoleOverride';

import React, { useEffect, useState, useCallback, Suspense, lazy, useRef, memo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, InteractionManager, Animated, Easing, Image, StyleSheet } from 'react-native';

// Import navigation loading system
import { NavigationLoadingProvider, useNavigationLoading } from './src/contexts/NavigationLoadingContext';
import NavigationLoadingOverlay from './src/components/NavigationLoadingOverlay';
import { ScreenLoadingWrapper } from './src/components/withNavigationLoading';

// Import onboarding tutorial
import { OnboardingTutorial, useOnboardingTutorial } from './src/components/OnboardingTutorial';

// Lazy load components to reduce initial bundle size and improve performance
const SwipeableBottomTabNavigator = lazy(() => import('./src/components/SwipeableBottomTabNavigator'));
const TouchActivityWrapper = lazy(() => import('./src/components/TouchActivityWrapper'));

// Create wrapped lazy components that trigger loading state
const createLazyScreen = (importFn: () => Promise<any>, screenName: string) => {
  const LazyComponent = lazy(importFn);
  return memo((props: any) => (
    <ScreenLoadingWrapper screenName={screenName}>
      <LazyComponent {...props} />
    </ScreenLoadingWrapper>
  ));
};

// Lazy load screens with automatic loading wrappers
const AddIncomeScreen = createLazyScreen(() => import('./src/screens/AddIncomeScreen'), 'AddIncome');
const AddBorrowedMoneyScreen = createLazyScreen(() => import('./src/screens/AddBorrowedMoneyScreen'), 'AddBorrowedMoney');
const BorrowedMoneyHistoryScreen = createLazyScreen(() => import('./src/screens/BorrowedMoneyHistoryScreen'), 'BorrowedMoneyHistory');
const TransactionsHistoryScreen = createLazyScreen(() => import('./src/screens/TransactionsHistoryScreen'), 'TransactionsHistory');
const NotificationCenterScreen = createLazyScreen(() => import('./src/screens/NotificationCenterScreen'), 'NotificationCenter');
const NotificationPreferencesScreen = createLazyScreen(() => import('./src/screens/NotificationPreferencesScreen'), 'NotificationPreferences');
const SignUpScreen = createLazyScreen(() => import('./src/screens/SignUpScreen'), 'SignUp');
const SignInScreen = createLazyScreen(() => import('./src/screens/SignInScreen'), 'SignIn');
import AccessDeniedScreen from './src/screens/AccessDeniedScreen'; // Import directly instead of lazy loading
const UserProfileScreen = createLazyScreen(() => import('./src/screens/UserProfileScreen'), 'UserProfile');
const SavingsGoalsScreen = createLazyScreen(() => import('./src/screens/SavingsGoalsScreen'), 'SavingsGoals');
const QuickSettingsScreen = createLazyScreen(() => import('./src/screens/QuickSettingsScreen'), 'QuickSettings');
const QuickActionsSettingsScreen = createLazyScreen(() => import('./src/screens/QuickActionsSettingsScreen'), 'QuickActionsSettings');
const AppLockSettingsScreen = createLazyScreen(() => import('./src/screens/AppLockSettingsScreen'), 'AppLockSettings');
const PinSetupScreen = createLazyScreen(() => import('./src/screens/PinSetupScreen'), 'PinSetup');
const AppLockScreen = lazy(() => import('./src/screens/AppLockScreen')); // Keep this direct for security
const BillsTrackerScreen = createLazyScreen(() => import('./src/screens/BillsTrackerScreen'), 'BillsReminder');
const BudgetPlannerScreen = createLazyScreen(() => import('./src/screens/BudgetPlannerScreen'), 'BudgetPlanner');
const RemindersScreen = createLazyScreen(() => import('./src/screens/RemindersScreen'), 'Reminders');
const CloudBackupScreen = createLazyScreen(() => import('./src/screens/CloudBackupScreen'), 'CloudBackup');
const MonthlyReportsScreen = createLazyScreen(() => import('./src/screens/MonthlyReportsScreen'), 'MonthlyReports');
const SyncTestScreen = createLazyScreen(() => import('./src/screens/SyncTestScreen'), 'SyncTest');
const DevelopmentToolsScreen = createLazyScreen(() => import('./src/screens/DevelopmentToolsScreen'), 'DevelopmentTools');
const DevPINScreen = createLazyScreen(() => import('./src/screens/DevPINScreen'), 'DevPINEntry');
const PrivacyPolicyScreen = createLazyScreen(() => import('./src/screens/PrivacyPolicyScreen'), 'PrivacyPolicy');
const TermsOfUseScreen = createLazyScreen(() => import('./src/screens/TermsOfUseScreen'), 'TermsOfUse');
const SubscriptionScreen = createLazyScreen(() => import('./src/screens/SubscriptionScreen'), 'Subscription');
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/contexts/LocalizationContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { QuickActionsProvider } from './src/contexts/QuickActionsContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AnalyticsRefreshProvider } from './src/contexts/AnalyticsRefreshContext';
import { AdProvider } from './src/contexts/AdContext';
import { DialogProvider } from './src/contexts/DialogContext';
import ProUpgradeModal from './src/components/ProUpgradeModal';
import AppOpenAd from './src/components/AppOpenAd';
import AdBanner from './src/components/AdBanner';
import { hybridDataService, AppInitResult } from './src/services/hybridDataService';
import AppLockService from './src/services/appLockService';
import BatteryOptimizer from './src/utils/batteryOptimizer';
// import { initializeAppOptimizations } from './src/utils/optimizations';
const SyncReminderBanner = lazy(() => import('./src/components/SyncReminderBanner'));
const SyncProgressModal = lazy(() => import('./src/components/SyncProgressModal'));
import { navigationRef, onNavigationReady } from './src/navigation/navigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAds } from './src/contexts/AdContext';

const Stack = createStackNavigator();

// Elegant Loading Screen with animated dots (matching the new dark theme)
const ScreenLoadingFallback = () => {
  const [dotAnimation] = useState(() => new Animated.Value(0));
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [dotAnimation]);

  return (
    <View style={loadingStyles.container}>
      <View style={loadingStyles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              loadingStyles.dot,
              {
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: index === 0 ? [0.3, 1, 0.3] : index === 1 ? [0.6, 0.3, 0.6] : [1, 0.6, 1],
                }),
                transform: [{
                  scale: dotAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: index === 1 ? [1, 1.3, 1] : [1, 1.1, 1],
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});

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
    return <ScreenLoadingFallback />;
  }
  
  return <>{children}</>;
};

const AppNavigator = React.memo(() => {
  const { isDark, theme } = useTheme();
  const { isAuthenticated, isLoading: authLoading, accessDenied } = useAuth();
  const { startLoading, isScreenVisited } = useNavigationLoading();
  const insets = useSafeAreaInsets();
  const { adsEnabled, shouldShowBanner, bannerHeight } = useAds();
  const [currentRouteName, setCurrentRouteName] = useState<string>('TabNavigator');
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appLockInitialized, setAppLockInitialized] = useState(false);
  const isMounted = useRef(false);
  const appLockService = AppLockService.getInstance();
  const previousRouteName = useRef<string | undefined>(undefined);
  
  // Onboarding tutorial state
  const { shouldShow: shouldShowOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboardingTutorial();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding when authenticated and not completed
  useEffect(() => {
    if (isAuthenticated && shouldShowOnboarding && !onboardingLoading) {
      // Small delay to let the main screen render first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, shouldShowOnboarding, onboardingLoading]);

  const handleOnboardingComplete = useCallback(async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  }, [completeOnboarding]);

  const handleOnboardingSkip = useCallback(async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  }, [completeOnboarding]);

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
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle navigation state changes - trigger loading for new screens
  const handleNavigationStateChange = useCallback(() => {
    if (!navigationRef.isReady() || !isMounted.current) {
      return;
    }

    const currentRouteName = navigationRef.getCurrentRoute()?.name;
    if (currentRouteName) {
      setCurrentRouteName(currentRouteName);
    }
    previousRouteName.current = currentRouteName;
  }, []);

  const bannerVisible = adsEnabled && shouldShowBanner(currentRouteName);
  const bannerOffset = bannerVisible ? (bannerHeight + insets.bottom) : 0;

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

  // Removed screen preloading to improve startup performance
  // Screens will now load only when navigated to (true lazy loading)

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
      <Suspense fallback={<ScreenLoadingFallback />}>
        <AppLockScreen onUnlock={handleUnlock} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ScreenLoadingFallback />}>
      <TouchActivityWrapper>
        <NavigationContainer 
          ref={navigationRef} 
          onReady={() => {
            onNavigationReady();
            const routeName = navigationRef.getCurrentRoute()?.name;
            if (routeName) {
              setCurrentRouteName(routeName);
            }
          }}
          onStateChange={handleNavigationStateChange}
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
          <View style={{ flex: 1, paddingBottom: bannerOffset }}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                animationEnabled: true,
                gestureEnabled: true,
                cardStyle: { backgroundColor: 'transparent' },
                // Faster, smoother slide animation
                transitionSpec: {
                  open: {
                    animation: 'timing',
                    config: {
                      duration: 200,
                    },
                  },
                  close: {
                    animation: 'timing',
                    config: {
                      duration: 200,
                    },
                  },
                },
                cardStyleInterpolator: ({ current, layouts }) => {
                  return {
                    cardStyle: {
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.8, 1],
                      }),
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width * 0.3, 0],
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
                  <Stack.Screen name="AddBorrowedMoney" component={AddBorrowedMoneyScreen} />
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
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="UserProfile" 
                    component={UserProfileScreen}
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="Subscription" 
                    component={SubscriptionScreen}
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                      gestureEnabled: true,
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
                    name="CloudBackup" 
                    component={CloudBackupScreen}
                    options={{ 
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen 
                    name="MonthlyReports" 
                    component={MonthlyReportsScreen}
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
                    name="DevPINEntry" 
                    component={DevPINScreen}
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                      gestureEnabled: false,
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
                  <Stack.Screen 
                    name="PrivacyPolicy" 
                    component={PrivacyPolicyScreen}
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="TermsOfUse" 
                    component={TermsOfUseScreen}
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                      gestureEnabled: false,
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
          </View>

          {bannerVisible && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                paddingBottom: insets.bottom,
                backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
                borderTopWidth: 1,
                borderTopColor: isDark ? '#38383A' : '#E0E0E0',
              }}
            >
              <AdBanner screenName={currentRouteName} />
            </View>
          )}
        </NavigationContainer>
        <NavigationLoadingOverlay />
        {/* Onboarding Tutorial - shown after first login */}
        <OnboardingTutorial
          visible={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </TouchActivityWrapper>
    </Suspense>
  );
});

// Loading screen component with elegant animation
const LoadingScreen = () => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.8));
  const [dotAnimation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Dots animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim, scaleAnim, dotAnimation]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View 
        style={[
          styles.loadingContent,
          { 
            opacity: fadeAnim, 
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={styles.loadingLogoContainer}>
          <View style={styles.loadingLogo}>
            <Image 
              source={require('./assets/icon.png')} 
              style={styles.loadingLogoImage}
              resizeMode="cover"
            />
          </View>
        </View>
        <Text style={styles.loadingTitle}>FINEX</Text>
        <View style={styles.loadingDotsRow}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.loadingDot,
                {
                  opacity: dotAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: index === 0 ? [0.3, 1, 0.3] : index === 1 ? [0.6, 0.3, 0.6] : [1, 0.6, 1],
                  }),
                  transform: [{
                    scale: dotAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: index === 1 ? [1, 1.4, 1] : [1, 1.2, 1],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

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

  // Always mount LocalizationProvider so useLocalization never runs outside it.
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <ThemeProvider>
          <NavigationLoadingProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <AdProvider>
                  <DialogProvider>
                    <AnalyticsRefreshProvider>
                      <NotificationProvider>
                        <QuickActionsProvider>
                          {isLoading ? (
                          <LoadingScreen />
                          ) : !initResult?.success ? (
                            <ErrorScreen 
                              error={initResult?.error || 'Unknown error'} 
                              onRetry={initializeApp}
                            />
                          ) : (
                            <View style={styles.appContainer}>
                              {/* App Open Ad - shown on first launch for free users */}
                              <AppOpenAd onComplete={() => console.log('App open ad completed')} />
                              <AppNavigator />
                              {/* Lazy load sync reminder banner - positioned after navigator to overlay properly */}
                              <Suspense fallback={null}>
                                <SyncReminderBanner onSyncComplete={handleSyncComplete} />
                              </Suspense>
                              <Suspense fallback={null}>
                                <SyncProgressModal />
                              </Suspense>
                              {/* Pro upgrade modal */}
                              <ProUpgradeModal />
                            </View>
                          )}
                        </QuickActionsProvider>
                      </NotificationProvider>
                    </AnalyticsRefreshProvider>
                  </DialogProvider>
                </AdProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </NavigationLoadingProvider>
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
    backgroundColor: '#1C1C1E',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogoContainer: {
    marginBottom: 20,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  loadingLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 32,
  },
  loadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
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
    color: '#8E8E93',
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