import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  rememberMe: boolean;
}

export interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  enableBiometric: () => Promise<{ success: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  checkBiometricAvailability: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  HAS_LOGGED_IN_BEFORE: 'has_logged_in_before',
} as const;

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock API functions with proper user management
const API = {
  signUp: async (email: string, password: string, name: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    // Password validation
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Name validation
    if (name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }
    
    // Check if user already exists
    try {
      const existingUsers = await AsyncStorage.getItem('registered_users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      
      const userExists = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        throw new Error('An account with this email already exists');
      }
      
      // Clear any existing data before creating new account
      try {
        await AsyncStorage.removeItem('app_initialized');
        await AsyncStorage.removeItem('default_data_seeded');
        await AsyncStorage.removeItem('onboarding_completed');
        await AsyncStorage.removeItem('is_demo_account');
        await AsyncStorage.removeItem('seed_demo_data');
        
        // Clear any existing user data to ensure fresh start
        const { hybridDataService } = await import('../services/hybridDataService');
        await hybridDataService.clearAllData();
      } catch (error) {
        console.log('No existing data to clear');
      }
      
      // Create new user
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      
      // Store user in registered users list
      const updatedUsers = [...users, { 
        ...newUser, 
        password: password // In real app, this would be hashed
      }];
      await AsyncStorage.setItem('registered_users', JSON.stringify(updatedUsers));
      
      return {
        user: newUser,
        token: 'jwt_token_' + newUser.id,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed. Please try again.');
    }
  },

  signIn: async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (password.length === 0) {
      throw new Error('Please enter your password');
    }
    
    try {
      // Get registered users
      const existingUsers = await AsyncStorage.getItem('registered_users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      
      // Find user by email
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        throw new Error('No account found with this email address');
      }
      
      // Check password
      if (user.password !== password) {
        throw new Error('Incorrect password');
      }
      
      // Update last login
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString(),
      };
      
      // Update user in storage
      const updatedUsers = users.map((u: any) => 
        u.email.toLowerCase() === email.toLowerCase() ? updatedUser : u
      );
      await AsyncStorage.setItem('registered_users', JSON.stringify(updatedUsers));
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      return {
        user: userWithoutPassword,
        token: 'jwt_token_' + userWithoutPassword.id,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  updateProfile: async (token: string, updates: Partial<User>) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock successful update
    return {
      ...updates,
      lastLogin: new Date().toISOString(),
    };
  },

  changePassword: async (token: string, currentPassword: string, newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (currentPassword === 'wrongpassword') {
      throw new Error('Current password is incorrect');
    }
    
    return { success: true };
  },

  deleteAccount: async (token: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
  },
};

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    biometricEnabled: false,
    rememberMe: false,
  });

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user chose to be remembered
      const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      const biometricEnabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      
      if (rememberMe === 'true') {
        // Try to get stored token
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
            biometricEnabled: biometricEnabled === 'true',
            rememberMe: true,
          }));
          return;
        }
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        biometricEnabled: biometricEnabled === 'true',
      }));
    } catch (error) {
      console.error('Error initializing auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { user, token } = await API.signUp(email, password, name);
      
      // Store token and user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      // Mark that user has logged in before (for biometric checks)
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE, 'true');
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: true,
      }));
      
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  };

  const signIn = async (email: string, password: string, remember = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { user, token } = await API.signIn(email, password);
      
      // Store token and user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, remember.toString());
      // Mark that user has logged in before (for biometric checks)
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE, 'true');
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: remember,
      }));
      
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear stored data
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        biometricEnabled: state.biometricEnabled, // Keep biometric setting
        rememberMe: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
      if (!token || !state.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const updatedData = await API.updateProfile(token, updates);
      const updatedUser = { ...state.user, ...updatedData };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      
      setState(prev => ({
        ...prev,
        user: updatedUser,
      }));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      await API.changePassword(token, currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password change failed' 
      };
    }
  };

  const clearAllUserData = async () => {
    try {
      // Clear all secure storage
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
      
      // Clear all AsyncStorage data
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE);
      
      // Clear app-specific data
      await AsyncStorage.removeItem('app_initialized');
      await AsyncStorage.removeItem('default_data_seeded');
      await AsyncStorage.removeItem('onboarding_completed');
      await AsyncStorage.removeItem('sync_settings');
      await AsyncStorage.removeItem('app_settings');
      await AsyncStorage.removeItem('notification_preferences');
      await AsyncStorage.removeItem('reminders_data');
      await AsyncStorage.removeItem('bills_data');
      await AsyncStorage.removeItem('budget_data');
      await AsyncStorage.removeItem('goals_data');
      
      // Clear demo mode flags
      await AsyncStorage.removeItem('is_demo_account');
      await AsyncStorage.removeItem('seed_demo_data');
      
      // Clear database by calling the service
      const { hybridDataService } = await import('../services/hybridDataService');
      await hybridDataService.clearAllData();
      
      console.log('✅ All user data cleared successfully');
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  };

  const clearUserAccounts = async () => {
    try {
      await AsyncStorage.removeItem('registered_users');
      console.log('All user accounts cleared');
    } catch (error) {
      console.error('Error clearing user accounts:', error);
    }
  };

  const deleteAccount = async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      await API.deleteAccount(token);
      
      // Clear ALL user data from local storage
      await clearAllUserData();
      
      // Sign out user
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        biometricEnabled: false,
        rememberMe: false,
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Account deletion failed' 
      };
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      return false;
    }
  };

  const enableBiometric = async () => {
    try {
      const isAvailable = await checkBiometricAvailability();
      if (!isAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
        setState(prev => ({ ...prev, biometricEnabled: true }));
        return { success: true };
      } else {
        return { success: false, error: 'Biometric authentication failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Biometric setup failed' 
      };
    }
  };

  const disableBiometric = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
    setState(prev => ({ ...prev, biometricEnabled: false }));
  };

  const authenticateWithBiometric = async () => {
    try {
      if (!state.biometricEnabled) {
        return { success: false, error: 'Biometric authentication not enabled' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: 'Biometric authentication failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Biometric authentication failed' 
      };
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        setState(prev => ({ ...prev, user }));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    checkBiometricAvailability,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;