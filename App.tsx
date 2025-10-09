import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import SwipeableBottomTabNavigator from './src/components/SwipeableBottomTabNavigator';
import AddIncomeScreen from './src/screens/AddIncomeScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import BorrowedMoneyHistoryScreen from './src/screens/BorrowedMoneyHistoryScreen';
import TransactionsHistoryScreen from './src/screens/TransactionsHistoryScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import NotificationPreferencesScreen from './src/screens/NotificationPreferencesScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SignInScreen from './src/screens/SignInScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import QuickSettingsScreen from './src/screens/QuickSettingsScreen';
import AppLockSettingsScreen from './src/screens/AppLockSettingsScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/contexts/LocalizationContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { hybridDataService, AppInitResult } from './src/services/hybridDataService';
import SyncReminderBanner from './src/components/SyncReminderBanner';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated user screens
          <>
            <Stack.Screen name="TabNavigator" component={SwipeableBottomTabNavigator} />
            <Stack.Screen name="AddIncome" component={AddIncomeScreen} />
            <Stack.Screen 
              name="Reminders" 
              component={RemindersScreen}
              options={{ 
                headerShown: true,
                title: 'Reminders',
                headerStyle: { backgroundColor: isDark ? '#374151' : '#FFFFFF' },
                headerTitleStyle: { color: isDark ? '#FFFFFF' : '#1F2937' },
                headerTintColor: isDark ? '#FFFFFF' : '#1F2937',
              }}
            />
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
  );
};

// Loading screen component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Initializing FinTracker...</Text>
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

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Initializing FinTracker...');
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
  };

  useEffect(() => {
    initializeApp();
  }, []);

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
              {/* Sync reminder banner - shows at top level */}
              <SyncReminderBanner onSyncComplete={() => {
                console.log('🔄 Sync completed from reminder');
              }} />
              
              <AppNavigator />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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