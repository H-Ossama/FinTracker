import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

// Validation schema
const signInSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

interface SignInFormData {
  email: string;
  password: string;
}

interface SignInScreenProps {
  navigation: any; // Replace with proper navigation type
}

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [showAutoBiometric, setShowAutoBiometric] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { signIn, signInWithGoogle, authenticateWithBiometric, checkBiometricAvailability, biometricEnabled, user } = useAuth();
  const { theme } = useTheme();
  const { alertState, hideAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const isAvailable = await checkBiometricAvailability();
    setBiometricAvailable(isAvailable);
    
    // Only show biometric option if:
    // 1. Biometric is available on device
    // 2. User has biometric enabled in settings
    // 3. User has signed in before (has stored credentials or login history)
    try {
      const hasLoginHistory = await AsyncStorage.getItem('has_logged_in_before');
      const userBiometricEnabled = await AsyncStorage.getItem('biometric_enabled');
      const rememberMeValue = await AsyncStorage.getItem('remember_me');
      
      const shouldShowBiometric = isAvailable && 
                                  userBiometricEnabled === 'true' && 
                                  hasLoginHistory === 'true' && 
                                  rememberMeValue === 'true';
      
      setShowBiometricOption(shouldShowBiometric);
      
      // Auto-show biometric prompt for returning users
      if (shouldShowBiometric) {
        setShowAutoBiometric(true);
      }
    } catch (error) {
      console.log('Error checking biometric support:', error);
      setShowBiometricOption(false);
    }
  };

  const onSubmit = async (data: SignInFormData) => {
    try {
      setIsLoading(true);
      
      const result = await signIn(data.email, data.password, rememberMe);
      
      if (result.success) {
        // Store login history for future biometric checks
        try {
          await AsyncStorage.setItem('has_logged_in_before', 'true');
          if (rememberMe) {
            await AsyncStorage.setItem('remember_me', 'true');
          }
        } catch (error) {
          console.log('Error storing login history:', error);
        }
        
        // Show welcome message with a slight delay to ensure proper rendering
        setTimeout(() => {
          showSuccess(
            '🎉 Welcome Back!',
            'You have successfully signed in.',
          );
        }, 100);
      } else {
        showError('Sign In Failed', result.error || 'Please check your credentials and try again');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoBiometricLogin = async () => {
    setShowAutoBiometric(false);
    await handleBiometricLogin();
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      
      const result = await authenticateWithBiometric();
      
      if (result.success) {
        // Store login history for future biometric checks
        try {
          await AsyncStorage.setItem('has_logged_in_before', 'true');
        } catch (error) {
          console.log('Error storing biometric login history:', error);
        }
        
        // Show welcome message with delay
        setTimeout(() => {
          showSuccess(
            '🎉 Welcome Back!',
            'You have successfully signed in with biometric authentication.',
          );
        }, 100);
      } else {
        showError('Authentication Failed', result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred during biometric authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showConfirm(
      'Reset Password',
      'Password reset functionality will be implemented in the next update. For now, please contact support if you need help.',
      () => {}, // Contact Support action
      undefined // Cancel action
    );
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      
      const result = await signInWithGoogle();
      
      if (result.success) {
        setTimeout(() => {
          showSuccess(
            '🎉 Welcome Back!',
            'You have successfully signed in with Google.',
          );
        }, 100);
      } else {
        showError('Google Sign In Failed', result.error || 'Please try again');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred during Google Sign In.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'demo@fintracker.app', { shouldValidate: true });
    setValue('password', 'Demo123!', { shouldValidate: true });
    // Use a slight delay to ensure the form updates before showing alert
    setTimeout(() => {
      showSuccess('Demo Credentials', 'Demo credentials have been filled in. You can now sign in to explore the app.');
    }, 100);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet" size={28} color="#3B82F6" />
            <Text style={[styles.appName, { color: theme.colors.text }]}>FINEX</Text>
          </View>
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>Welcome Back</Text>
        </View>

        {/* Login Form Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>Sign In</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.modernInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: errors.email ? '#EF4444' : theme.colors.border 
                }]}>
                  <Ionicons name="mail" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.modernInput, { color: theme.colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.modernInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: errors.password ? '#EF4444' : theme.colors.border 
                }]}>
                  <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.modernInput, { color: theme.colors.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          {/* Options Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.modernCheckbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={[styles.rememberMeText, { color: theme.colors.textSecondary }]}>
                Remember me
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.modernSignInButton, (!isValid || isLoading) && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.signInButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Biometric Login - Only show for returning users */}
          {showBiometricOption && (
            <TouchableOpacity
              style={[styles.biometricButton, { borderColor: theme.colors.border }]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Ionicons name="finger-print" size={24} color="#3B82F6" />
              <Text style={[styles.biometricButtonText, { color: theme.colors.text }]}>
                Use Biometric
              </Text>
            </TouchableOpacity>
          )}

          {/* Demo Account */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.demoButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            onPress={fillDemoCredentials}
            disabled={isLoading}
          >
            <Ionicons name="play-circle" size={20} color="#6B7280" />
            <Text style={[styles.demoButtonText, { color: theme.colors.textSecondary }]}>
              Try Demo Account
            </Text>
          </TouchableOpacity>

          {/* Social Sign In */}
          <Text style={[styles.socialTitle, { color: theme.colors.text }]}>Or continue with</Text>
          
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#EA4335" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={[styles.socialButtonText, { color: theme.colors.text }]}>Google</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              disabled={isLoading || isGoogleLoading}
            >
              <Ionicons name="logo-apple" size={20} color={theme.colors.text} />
              <Text style={[styles.socialButtonText, { color: theme.colors.text }]}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpSection}>
          <Text style={[styles.signUpPrompt, { color: theme.colors.textSecondary }]}>
            New to FINEX?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        icon={alertState.icon as any}
        iconColor={alertState.iconColor}
        onDismiss={hideAlert}
      />
      
      {/* Auto Biometric Prompt for Returning Users */}
      <CustomAlert
        visible={showAutoBiometric}
        title="Welcome Back!"
        message="Use your biometric authentication to sign in quickly."
        buttons={[
          { 
            text: 'Use Password', 
            onPress: () => setShowAutoBiometric(false), 
            style: 'cancel' 
          },
          { 
            text: 'Use Biometric', 
            onPress: handleAutoBiometricLogin, 
            style: 'default' 
          },
        ]}
        icon="finger-print"
        iconColor="#3B82F6"
        onDismiss={() => setShowAutoBiometric(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  
  // Compact Header Styles
  compactHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8,
  },

  // Form Card Styles
  formCard: {
    margin: 24,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },

  // Options Row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Buttons
  modernSignInButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },

  // Demo Button
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },

  // Social Sign In
  socialTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Sign Up Section
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  signUpPrompt: {
    fontSize: 16,
    marginRight: 4,
  },
  signUpLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
  },
});

export default SignInScreen;