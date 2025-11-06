import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  
  const { signIn, signInWithGoogle, authenticateWithBiometric, checkBiometricAvailability, biometricEnabled, user } = useAuth();
  const { theme, isDark } = useTheme();
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
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
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
    <View style={styles.container}>
      <LinearGradient
        colors={isDark 
          ? ['#0D1117', '#1C2128', '#0D1117'] 
          : ['#F5F7FA', '#FFFFFF', '#F0F4F8']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero Section with Branding */}
              <Animated.View 
                style={[
                  styles.heroSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <View style={styles.brandContainer}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.appIcon}
                  />
                  <View style={styles.brandText}>
                    <Text style={[styles.brandName, { color: theme.colors.text }]}>FinTracker</Text>
                    <Text style={[styles.brandTagline, { color: theme.colors.textSecondary }]}>
                      Smart Finance Management
                    </Text>
                  </View>
                </View>
                
                <View style={styles.welcomeBox}>
                  <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                    Welcome Back
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                    Sign in to manage your finances
                  </Text>
                </View>
              </Animated.View>

              {/* Form Card */}
              <Animated.View
                style={[
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <View style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email Address</Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, { 
                          backgroundColor: theme.colors.background, 
                          borderColor: errors.email ? '#EF4444' : theme.colors.border,
                          borderWidth: errors.email ? 2 : 1,
                        }]}>
                          <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                          <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="Enter your email"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isLoading}
                          />
                        </View>
                      )}
                    />
                    {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
                      <TouchableOpacity onPress={handleForgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot?</Text>
                      </TouchableOpacity>
                    </View>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[styles.inputWrapper, { 
                          backgroundColor: theme.colors.background, 
                          borderColor: errors.password ? '#EF4444' : theme.colors.border,
                          borderWidth: errors.password ? 2 : 1,
                        }]}>
                          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                          <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="Enter your password"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            editable={!isLoading}
                          />
                          <TouchableOpacity 
                            onPress={() => setShowPassword(!showPassword)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons
                              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                  </View>

                  {/* Remember Me */}
                  <TouchableOpacity
                    style={styles.rememberContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.rememberText, { color: theme.colors.textSecondary }]}>
                      Remember me
                    </Text>
                  </TouchableOpacity>

                  {/* Sign In Button */}
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={[styles.signInButton, (!isValid || isLoading) && styles.buttonDisabled]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      onPress={handleSubmit(onSubmit)}
                      disabled={!isValid || isLoading}
                      style={styles.buttonContent}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.signInButtonText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </LinearGradient>

                  {/* Biometric Option */}
                  {showBiometricOption && (
                    <TouchableOpacity
                      style={[styles.biometricButton, { borderColor: theme.colors.primary }]}
                      onPress={handleBiometricLogin}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="finger-print" size={22} color={theme.colors.primary} />
                      <Text style={[styles.biometricText, { color: theme.colors.primary }]}>
                        Use Biometric
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  </View>

                  {/* Social Buttons */}
                  <TouchableOpacity 
                    style={[styles.socialButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                    activeOpacity={0.7}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator size="small" color="#EA4335" />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={20} color="#EA4335" />
                        <Text style={[styles.socialText, { color: theme.colors.text }]}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Demo Account */}
                  <TouchableOpacity
                    style={[styles.demoButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={fillDemoCredentials}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-circle-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.demoText, { color: theme.colors.text }]}>Try Demo Account</Text>
                  </TouchableOpacity>

                  {/* Sign Up Link */}
                  <View style={styles.signUpSection}>
                    <Text style={[styles.signUpPrompt, { color: theme.colors.textSecondary }]}>
                      New user?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
                      <Text style={[styles.signUpLink, { color: theme.colors.primary }]}>
                        Create Account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        icon={alertState.icon as any}
        iconColor={alertState.iconColor}
        onDismiss={hideAlert}
      />
      
      {/* Auto Biometric Prompt */}
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
        iconColor={theme.colors.primary}
        onDismiss={() => setShowAutoBiometric(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  brandText: {
    marginLeft: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '500',
  },

  welcomeBox: {
    paddingHorizontal: 4,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Form Card
  formCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    marginRight: 8,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '600',
  },

  // Remember & Forgot
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginLeft: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '700',
  },

  // Buttons
  signInButton: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonContent: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
    letterSpacing: -0.2,
  },

  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.2,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Social & Demo Buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.2,
  },

  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  demoText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.2,
  },

  // Sign Up Section
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 16,
  },
  signUpPrompt: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  signUpLink: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default SignInScreen;