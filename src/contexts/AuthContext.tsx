import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { googleAuthService, GoogleUser } from '../services/googleAuthService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { syncProgressService } from '../services/syncProgressService';
import { backendAuthService, BackendUser } from '../services/backendAuthService';
import { simpleCloudBackupService } from '../services/simpleCloudBackupService';
import { localStorageService } from '../services/localStorageService';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
  googleId?: string;
  isGoogleUser?: boolean;
  firstName?: string;
  lastName?: string;
  language?: string;
  currency?: string;
  emailVerified?: boolean;
  isBackendUser?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  rememberMe: boolean;
  isGoogleAuthenticated: boolean;
  cloudSyncEnabled: boolean;
  accessDenied: {
    isDenied: boolean;
    reason: string;
    details?: string;
  };
}

export interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUpWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  enableBiometric: () => Promise<{ success: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  checkBiometricAvailability: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  validateSession: () => Promise<{ valid: boolean; reason?: string }>;
  denyAccess: (reason: string, details?: string) => void;
  clearAccessDenial: () => void;
  syncWithCloud: () => Promise<{ success: boolean; error?: string }>;
  enableCloudSync: () => Promise<{ success: boolean; error?: string }>;
  disableCloudSync: () => Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  HAS_LOGGED_IN_BEFORE: 'has_logged_in_before',
  GOOGLE_USER: 'google_user',
  CLOUD_SYNC_ENABLED: 'cloud_sync_enabled',
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
const mockAuthAPI = {
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
        isBackendUser: false,
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
      // Check for demo account credentials
      if ((email.toLowerCase() === 'demo@fintracker.app' || email.toLowerCase() === 'demo@finex.app') && password === 'Demo123!') {
        // Handle demo account login
        const demoUser = {
          id: 'demo_user',
          email: email.toLowerCase(),
          name: 'Demo User',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isBackendUser: false,
        };
        
        return {
          user: demoUser,
          token: 'demo_token_' + demoUser.id,
        };
      }
      
      // Get registered users
      const existingUsers = await AsyncStorage.getItem('registered_users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      
      // Find user by email
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        throw new Error('No account found with this email address. Please check your email or sign up for a new account.');
      }
      
      // Check password
      if (user.password !== password) {
        throw new Error('Incorrect password. Please check your password and try again.');
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
      const sanitizedUser = {
        ...userWithoutPassword,
        isBackendUser: false,
      };
      
      return {
        user: sanitizedUser,
        token: 'jwt_token_' + sanitizedUser.id,
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
    isGoogleAuthenticated: false,
    cloudSyncEnabled: false,
    accessDenied: {
      isDenied: false,
      reason: '',
      details: '',
    },
  });

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const clearTestUserData = async () => {
    try {
      // Check if stored user data contains test user and clear it
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email === 'test@example.com') {
          console.log('🧹 Clearing test user data...');
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
          await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
        }
      }
    } catch (error) {
      console.log('Could not clear test user data:', error);
    }
  };

  const initializeAuth = async () => {
    try {
      // Clear any test user data that might interfere with real authentication
      await clearTestUserData();
      
      // Check if user chose to be remembered
      const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      const biometricEnabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      const isGoogleUser = await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_USER);
      const cloudSyncEnabled = await AsyncStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      
      if (rememberMe === 'true') {
        // Try to get stored token
        let token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN).catch((e) => {
          console.error('SecureStore read failed:', e);
          return null;
        });
        
        // If SecureStore failed or returned null, try backups
        if (!token) {
          token = await AsyncStorage.getItem('demo_token_backup');
        }
        if (!token) {
          token = await AsyncStorage.getItem('auth_token_backup');
        }

        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        if (token && userData) {
          const user = JSON.parse(userData);
          
          // Validate session
          const sessionValidation = await validateUserSession(user, token);
          
          if (sessionValidation.valid) {
            // Do NOT set cloud sync auth token automatically during init.
            // Cloud sync requires an explicit backend session JWT and must be set via `setAuthToken()`.
            setState(prev => ({
              ...prev,
              user,
              isAuthenticated: true,
              isLoading: false,
              biometricEnabled: biometricEnabled === 'true',
              rememberMe: true,
              isGoogleAuthenticated: isGoogleUser === 'true',
              cloudSyncEnabled: cloudSyncEnabled === 'true',
            }));
            return;
          } else {
            // Session invalid, show access denied
            setState(prev => ({
              ...prev,
              isLoading: false,
              accessDenied: {
                isDenied: true,
                reason: sessionValidation.reason || 'Session expired',
                details: 'Please sign in again to continue using FinTracker.',
              },
            }));
            
            // Clear invalid session data
            await clearStoredSession();
            return;
          }
        }
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        biometricEnabled: biometricEnabled === 'true',
        cloudSyncEnabled: cloudSyncEnabled === 'true',
      }));
    } catch (error) {
      console.error('Error initializing auth:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        accessDenied: {
          isDenied: true,
          reason: 'Authentication Error',
          details: 'Unable to verify your account. Please sign in again.',
        },
      }));
    }
  };

  const splitName = (fullName: string): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts.shift() || '';
    const lastName = parts.length > 0 ? parts.join(' ') : firstName;

    return { firstName, lastName };
  };

  const isDemoEmail = (value: string): boolean => {
    const email = value.trim().toLowerCase();
    return email === 'demo@fintracker.app' || email === 'demo@finex.app';
  };

  const isMockAccountEmail = (value: string): boolean => {
    const email = value.trim().toLowerCase();
    return (
      isDemoEmail(email) ||
      email.endsWith('@example.com') ||
      email.endsWith('@test.com') ||
      email.endsWith('@mock.com')
    );
  };

  const normalizeBackendUser = (backendUser: BackendUser, fallback?: { email: string; name?: string }): User => {
    const fallbackName = fallback?.name;
    const derivedFromFallback = fallbackName ? fallbackName.split(' ') : [];
    const firstName = backendUser.firstName || derivedFromFallback[0] || '';
    const lastName = backendUser.lastName || (derivedFromFallback.slice(1).join(' ') || '');
    const resolvedEmail = (
      backendUser.email ||
      fallback?.email ||
      `user-${backendUser.id || Date.now()}@fintracker.app`
    ).toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName || resolvedEmail;

    return {
      id: backendUser.id,
      email: resolvedEmail,
      name: fullName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      createdAt: backendUser.createdAt || new Date().toISOString(),
      lastLogin: backendUser.lastLogin || new Date().toISOString(),
      language: backendUser.language,
      currency: backendUser.currency,
      emailVerified: backendUser.emailVerified,
      isBackendUser: true,
    };
  };

  const persistAuthSession = async (
    user: User,
    token: string,
    remember: boolean,
    options: { isGoogleUser?: boolean } = {}
  ): Promise<void> => {
    try {
      // For demo account, always use AsyncStorage to avoid SecureStore issues
      if (user.email === 'demo@fintracker.app') {
        await AsyncStorage.setItem('demo_token_backup', token);
      } else {
        try {
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_TOKEN, token);
        } catch (secureStoreError) {
          console.error('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
          // Fallback to AsyncStorage if SecureStore fails
          await AsyncStorage.setItem('auth_token_backup', token);
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, remember.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE, 'true');

      if (options.isGoogleUser) {
        await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_USER, 'true');
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      }

      // Do not automatically set cloud sync auth token here.
      // Cloud sync must be explicitly initialized with a backend session JWT.
    } catch (error) {
      console.error('Error persisting auth session:', error);
      throw error;
    }
  };

  const hasLocalRegisteredUser = async (email: string): Promise<boolean> => {
    try {
      const existingUsers = await AsyncStorage.getItem('registered_users');
      if (!existingUsers) {
        return false;
      }
      const users = JSON.parse(existingUsers);
      return Array.isArray(users)
        ? users.some((u: any) => typeof u?.email === 'string' && u.email.toLowerCase() === email.toLowerCase())
        : false;
    } catch (error) {
      console.log('Error checking local registered users:', error);
      return false;
    }
  };

  const decodeJwtPayload = (token: string): { exp?: number } | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      console.log('Failed to decode JWT payload:', error);
      return null;
    }
  };

  const isJwtToken = (token: string): boolean => token.includes('.') && token.split('.').length === 3;

  const signUp = async (email: string, password: string, name: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const { firstName, lastName } = splitName(trimmedName || normalizedEmail.split('@')[0]);
    const isMockAccount = isMockAccountEmail(normalizedEmail);

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      let user: User | null = null;
      let token: string | null = null;

      if (!isMockAccount) {
        const backendResult = await backendAuthService.register({
          email: normalizedEmail,
          password,
          firstName: firstName || 'Finex',
          lastName: lastName || firstName || 'User',
          language: 'EN',
          currency: 'USD',
        });

        if (backendResult.success) {
          user = normalizeBackendUser(backendResult.user, {
            email: normalizedEmail,
            name: trimmedName,
          });
          if (trimmedName.length > 0) {
            user.name = trimmedName;
          }
          if (firstName) {
            user.firstName = firstName;
          }
          if (lastName) {
            user.lastName = lastName;
          }
          user.lastLogin = new Date().toISOString();
          token = backendResult.token;
        } else if (!backendResult.networkError) {
          throw new Error(backendResult.error || 'Registration failed');
        } else {
          if (__DEV__) {
            console.warn('⚠️ Backend registration unavailable, using local mock registration');
          } else {
            throw new Error('Unable to reach the server. Please try again.');
          }
        }
      }

      if (!user || !token) {
        const fallbackName = trimmedName || `${firstName} ${lastName}`.trim() || normalizedEmail;
        const mockResult = await mockAuthAPI.signUp(normalizedEmail, password, fallbackName);
        const derivedNames = splitName(fallbackName);

        user = {
          ...mockResult.user,
          name: fallbackName,
          firstName: derivedNames.firstName || mockResult.user.firstName || undefined,
          lastName: derivedNames.lastName || mockResult.user.lastName || undefined,
          isBackendUser: false,
        };
        token = mockResult.token;
        if (!isMockAccount) {
          console.warn('⚠️ Falling back to mock registration for non-backend account');
        }
      }

      await AsyncStorage.removeItem('is_demo_account');
      await AsyncStorage.removeItem('seed_demo_data');
      try {
        const { hybridDataService } = await import('../services/hybridDataService');
        await hybridDataService.clearAllData();
      } catch (clearError) {
        console.log('No existing data to clear');
      }

      await persistAuthSession(user, token, true);

      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: true,
        isGoogleAuthenticated: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('Sign up failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const signIn = async (email: string, password: string, remember = false) => {
    const normalizedEmail = email.trim().toLowerCase();
    const usingMockAccount = isMockAccountEmail(normalizedEmail);
    const demoAccountRequested = isDemoEmail(normalizedEmail);

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      let user: User | null = null;
      let token: string | null = null;
      let fallbackToMock = usingMockAccount;

      if (!usingMockAccount) {
        console.log('🔐 Email/password login attempt for:', normalizedEmail);
        const backendResult = await backendAuthService.login({
          email: normalizedEmail,
          password,
        });

        if (backendResult.success) {
          user = normalizeBackendUser(backendResult.user, { email: normalizedEmail });
          user.lastLogin = new Date().toISOString();
          token = backendResult.token;
          console.log('✅ Backend login succeeded');
        } else {
          console.error('❌ Backend login failed:', backendResult.error);
          const localUserExists = await hasLocalRegisteredUser(normalizedEmail);
          console.log('📝 Local user exists:', localUserExists);

          if (backendResult.networkError) {
            if (localUserExists) {
              console.warn('⚠️ Backend unreachable (network error), attempting local mock login');
              fallbackToMock = true;
            } else {
              console.error('❌ No backend and no local user registered');
              throw new Error('Unable to reach the server. Please try again.');
            }
          } else if ((backendResult.status === 401 || backendResult.status === 404) && localUserExists) {
            console.warn('⚠️ Backend credentials rejected (status', backendResult.status, '), using local mock login');
            fallbackToMock = true;
          } else {
            console.error('❌ Backend error - no fallback available');
            throw new Error(backendResult.error || 'Login failed');
          }
        }
      }

      if ((!user || !token) && fallbackToMock) {
        const mockResult = await mockAuthAPI.signIn(normalizedEmail, password);
        user = { ...mockResult.user, isBackendUser: false };
        token = mockResult.token;
      }

      if (!user || !token) {
        throw new Error('Login failed. Please check your credentials and try again.');
      }

      const isDemoAccount = demoAccountRequested || user.email === 'demo@fintracker.app';
      const shouldRemember = isDemoAccount ? true : remember;

      if (isDemoAccount) {
        await AsyncStorage.setItem('is_demo_account', 'true');
        await AsyncStorage.setItem('seed_demo_data', 'true');
        console.log('✅ Demo account login - session will persist (email:', user.email, ')');
      } else {
        await AsyncStorage.removeItem('is_demo_account');
        await AsyncStorage.removeItem('seed_demo_data');
        try {
          const { hybridDataService } = await import('../services/hybridDataService');
          await hybridDataService.clearAllData();
        } catch (clearError) {
          console.log('No demo data to clear');
        }
      }

      if (!user.lastLogin) {
        user.lastLogin = new Date().toISOString();
      }

      await persistAuthSession(user, token, shouldRemember);

      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: shouldRemember,
        isGoogleAuthenticated: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('Sign in failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const signOut = async () => {
    try {
      // Set loading state to show transition animation
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Sign out from Google if user is Google authenticated
      if (state.isGoogleAuthenticated) {
        await googleAuthService.signOut();
      }

      // Sign out from Firebase (best-effort). Google sign-out may already be done above.
      try {
        await firebaseAuthService.signOut();
      } catch (e) {
        console.warn('Firebase sign-out failed (ignored):', e);
      }

      // Clear stored data
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      
      // Small delay to allow animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        biometricEnabled: state.biometricEnabled, // Keep biometric setting
        rememberMe: false,
        isGoogleAuthenticated: false,
        cloudSyncEnabled: false,
        accessDenied: {
          isDenied: false,
          reason: '',
          details: '',
        },
      });
    } catch (error) {
      console.error('Error signing out:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
      if (!token || !state.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const updatedData = await mockAuthAPI.updateProfile(token, updates);
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

      await mockAuthAPI.changePassword(token, currentPassword, newPassword);
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

      // Clear Google tokens (so Google sign-in won't reuse the previous session)
      try {
        await SecureStore.deleteItemAsync('google_id_token');
        await SecureStore.deleteItemAsync('google_access_token');
      } catch {}
      
      // Clear all AsyncStorage data
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE);
      await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      await AsyncStorage.removeItem('google_user_info');

      // Clear Firebase auth session (best-effort)
      try {
        await firebaseAuthService.signOut();
      } catch {}
      
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
      setState(prev => ({ ...prev, isLoading: true }));

      // If this is a Google user, revoke/sign out first so the next sign-in
      // does not immediately reuse the old Google session.
      if (state.isGoogleAuthenticated || state.user?.isGoogleUser) {
        try {
          await googleAuthService.revokeAccess();
        } catch {}
        try {
          await googleAuthService.signOut();
        } catch {}
        try {
          await firebaseAuthService.signOut();
        } catch {}
      }

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Not authenticated' };
      }

      // Delete cloud backup data BEFORE clearing local data
      try {
        console.log('🗑️ Deleting cloud backup data...');
        const deleteResult = await simpleCloudBackupService.deleteBackup();
        if (deleteResult.success) {
          console.log('✅ Cloud backup deleted successfully');
        } else {
          console.warn('⚠️ Could not delete cloud backup:', deleteResult.error);
        }
      } catch (cloudError) {
        console.warn('⚠️ Error deleting cloud backup:', cloudError);
        // Continue with local deletion even if cloud fails
      }

      await mockAuthAPI.deleteAccount(token);
      
      // Clear ALL user data from local storage
      await clearAllUserData();
      
      // Also clear the registered users list entry for this user
      try {
        const storedUsersJson = await AsyncStorage.getItem('registered_users');
        if (storedUsersJson && state.user?.email) {
          const storedUsers = JSON.parse(storedUsersJson);
          const updatedUsers = storedUsers.filter((u: any) => u.email !== state.user?.email);
          await AsyncStorage.setItem('registered_users', JSON.stringify(updatedUsers));
          console.log('✅ Removed user from registered_users list');
        }
      } catch (regError) {
        console.warn('⚠️ Error clearing registered user entry:', regError);
      }

      // Clear onboarding status so new user sees tutorial
      try {
        await AsyncStorage.removeItem('onboarding_tutorial_complete');
      } catch {}
      
      // Sign out user
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        biometricEnabled: false,
        rememberMe: false,
        isGoogleAuthenticated: false,
        cloudSyncEnabled: false,
        accessDenied: {
          isDenied: false,
          reason: '',
          details: '',
        },
      });
      
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
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

  const validateUserSession = async (user: User, token: string): Promise<{ valid: boolean; reason?: string }> => {
    try {
      if (!user || !token) {
        console.error('❌ validateUserSession: Missing user or token');
        return { valid: false, reason: 'Missing user or token' };
      }

      if ((user.email === 'demo@fintracker.app' || user.email === 'demo@finex.app') && token.startsWith('demo_token_')) {
        console.log('✅ Demo account session validated (email:', user.email, ')');
        return { valid: true };
      }

      if (user.email === 'demo@fintracker.app' || user.email === 'demo@finex.app') {
        console.error('❌ Demo account token mismatch:', token);
      }


      if (user.isGoogleUser) {
        console.log('✅ Google user session validated:', user.email);
        return { valid: true };
      }

      const isBackendSession = user.isBackendUser || isJwtToken(token);

      if (isBackendSession) {
        const payload = decodeJwtPayload(token);
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          console.log('❌ Backend session expired based on JWT exp:', user.email);
          return { valid: false, reason: 'Session expired' };
        }

        const validation = await backendAuthService.validateSession(token);
        if (validation.valid) {
          return { valid: true };
        }

        if (validation.networkError) {
          console.warn('⚠️ Backend session validation unavailable, allowing cached session');
          return { valid: true };
        }

        console.log('❌ Backend session invalid:', validation.error || 'Unknown reason');
        return { valid: false, reason: validation.error || 'Invalid session' };
      }

      if (token.startsWith('jwt_token_') || token.startsWith('auth_token_')) {
        const existingUsers = await AsyncStorage.getItem('registered_users');
        const users = existingUsers ? JSON.parse(existingUsers) : [];
        const userExists = users.find((u: any) => u.email?.toLowerCase() === user.email.toLowerCase());

        if (!userExists) {
          console.log('❌ Local user account not found:', user.email);
          return { valid: false, reason: 'Account no longer exists' };
        }

        if (userExists.disabled) {
          console.log('❌ Local user account disabled:', user.email);
          return { valid: false, reason: 'Account has been disabled' };
        }

        const lastLogin = new Date(user.lastLogin);
        if (Number.isNaN(lastLogin.getTime())) {
          return { valid: true };
        }

        const now = new Date();
        const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLogin > 30) {
          console.log('❌ Local session expired after', daysSinceLogin, 'days');
          return { valid: false, reason: 'Session expired due to inactivity' };
        }

        console.log('✅ Local mock session validated:', user.email);
        return { valid: true };
      }

      console.log('❌ Unrecognized session token format:', token.substring(0, 12));
      return { valid: false, reason: 'Invalid session format' };
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return { valid: false, reason: 'Session validation failed' };
    }
  };

  const clearStoredSession = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    } catch (error) {
      console.error('Error clearing stored session:', error);
    }
  };

  const validateSession = async (): Promise<{ valid: boolean; reason?: string }> => {
    if (!state.user || !state.isAuthenticated) {
      return { valid: false, reason: 'Not authenticated' };
    }
    
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TOKEN);
    if (!token) {
      return { valid: false, reason: 'No valid session token' };
    }
    
    return validateUserSession(state.user, token);
  };

  const denyAccess = (reason: string, details?: string) => {
    setState(prev => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      accessDenied: {
        isDenied: true,
        reason,
        details: details || 'Please contact support if you believe this is an error.',
      },
    }));
  };

  const clearAccessDenial = () => {
    setState(prev => ({
      ...prev,
      accessDenied: {
        isDenied: false,
        reason: '',
        details: '',
      },
    }));
  };

  const signInWithGoogle = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Determine whether this device has already completed a login before.
      // We use this to avoid silently overwriting existing local data on subsequent logins.
      const hasLoggedInBefore = (await AsyncStorage.getItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE)) === 'true';
      
      const result = await googleAuthService.signIn();
      
      if (!result.success || !result.user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: result.error || 'Google Sign-In failed' 
        };
      }

      const googleUser = result.user;
      
      // Convert Google user to app user format
      const user: User = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.photo,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        googleId: googleUser.id,
        isGoogleUser: true,
        isBackendUser: false,
      };

      // Persist app session (Google users don't need token validation)
      await persistAuthSession(user, 'google_session', true, { isGoogleUser: true });

      // Cloud backup is Firebase-only now.
      // Enable cloud backup if Firebase auth is active.
      const firebaseAuthed = simpleCloudBackupService.isAuthenticated();
      await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, firebaseAuthed ? 'true' : 'false');

      // Auto-restore on first login on this device (safe mode): only if local data is empty.
      try {
        if (firebaseAuthed && !hasLoggedInBefore) {
          const [wallets, transactions] = await Promise.all([
            localStorageService.getWallets(),
            localStorageService.getTransactions(),
          ]);

          // Categories are seeded by default on first launch; don't treat that as "existing user data".
          const hasLocalData = wallets.length + transactions.length > 0;
          if (!hasLocalData) {
            syncProgressService.clear();
            syncProgressService.setProgress({ operation: 'restore', stage: 'checking', progress: 5, message: 'Checking for cloud backup...' });

            const info = await simpleCloudBackupService.getBackupInfo();
            if (info.exists) {
              await simpleCloudBackupService.restore((p) => {
                try {
                  syncProgressService.setProgress({
                    operation: 'restore',
                    stage: p.stage,
                    progress: p.progress,
                    message: p.message,
                    itemsCount: (p as any).itemsCount,
                    complete: p.stage === 'complete',
                    failed: p.stage === 'error',
                    error: p.error,
                  });
                } catch {}
              });
            }
          } else {
            console.log('ℹ️ Skipping auto-restore: local data already exists');
          }
        }
      } catch (err) {
        console.warn('Cloud restore failed during sign-in:', err);
      }

      // Read cloud sync setting before updating state (avoid await inside updater)
      const cloudSyncEnabledFlag = (await AsyncStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED)) === 'true';

      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: true,
        isGoogleAuthenticated: true,
        cloudSyncEnabled: cloudSyncEnabledFlag,
      }));
      
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Google Sign-In failed' 
      };
    }
  };

  const signUpWithGoogle = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const result = await googleAuthService.signIn();
      
      if (!result.success || !result.user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: result.error || 'Google Sign-Up failed' 
        };
      }

      const googleUser = result.user;
      
      // Convert Google user to app user format
      const user: User = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.photo,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        googleId: googleUser.id,
        isGoogleUser: true,
        isBackendUser: false,
      };

      // Clear any existing demo data for new Google accounts
      await AsyncStorage.removeItem('is_demo_account');
      await AsyncStorage.removeItem('seed_demo_data');

      // Persist app session (Google users don't need token validation)
      await persistAuthSession(user, 'google_session', true, { isGoogleUser: true });

      // Cloud backup is Firebase-only now.
      const firebaseAuthed = simpleCloudBackupService.isAuthenticated();
      await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, firebaseAuthed ? 'true' : 'false');

      // Upload initial backup to cloud (best-effort)
      if (firebaseAuthed) {
        try {
          syncProgressService.clear();
          syncProgressService.setProgress({ operation: 'backup', stage: 'uploading', progress: 5, message: 'Uploading initial backup...' });
          await simpleCloudBackupService.backup((p) => {
            try {
              syncProgressService.setProgress({
                operation: 'backup',
                stage: p.stage,
                progress: p.progress,
                message: p.message,
                itemsCount: (p as any).itemsCount,
                complete: p.stage === 'complete',
                failed: p.stage === 'error',
                error: p.error,
              });
            } catch {}
          });
        } catch (err) {
          console.warn('Initial cloud backup failed during Google sign-up:', err);
        }
      }

      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        rememberMe: true,
        isGoogleAuthenticated: true,
        cloudSyncEnabled: firebaseAuthed,
      }));
      
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Google Sign-Up failed' 
      };
    }
  };

  const syncWithCloud = async () => {
    try {
      if (!state.user || !state.isGoogleAuthenticated) {
        return { success: false, error: 'Google authentication required for cloud backup' };
      }

      if (!simpleCloudBackupService.isAuthenticated()) {
        return { success: false, error: 'Firebase session not available. Please sign in again.' };
      }

      syncProgressService.clear();
      const result = await simpleCloudBackupService.backup((p) => {
        try {
          syncProgressService.setProgress({
            operation: 'backup',
            stage: p.stage,
            progress: p.progress,
            message: p.message,
            itemsCount: (p as any).itemsCount,
            complete: p.stage === 'complete',
            failed: p.stage === 'error',
            error: p.error,
          });
        } catch {}
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cloud sync failed' 
      };
    }
  };

  const enableCloudSync = async () => {
    try {
      if (!state.user || !state.isGoogleAuthenticated) {
        return { success: false, error: 'Google authentication required for cloud backup' };
      }

      if (!simpleCloudBackupService.isAuthenticated()) {
        return { success: false, error: 'Firebase session not available. Please sign in again.' };
      }

      // Upload current data to cloud
      const result = await simpleCloudBackupService.backup((p) => {
        try {
          syncProgressService.setProgress({
            operation: 'backup',
            stage: p.stage,
            progress: p.progress,
            message: p.message,
            itemsCount: (p as any).itemsCount,
            complete: p.stage === 'complete',
            failed: p.stage === 'error',
            error: p.error,
          });
        } catch {}
      });

      if (result.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, 'true');
        setState(prev => ({ ...prev, cloudSyncEnabled: true }));
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to enable cloud backup' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enable cloud sync' 
      };
    }
  };

  const disableCloudSync = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      setState(prev => ({ ...prev, cloudSyncEnabled: false }));
    } catch (error) {
      console.error('Error disabling cloud sync:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signUpWithGoogle,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    checkBiometricAvailability,
    refreshUser,
    validateSession,
    denyAccess,
    clearAccessDenial,
    syncWithCloud,
    enableCloudSync,
    disableCloudSync,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;