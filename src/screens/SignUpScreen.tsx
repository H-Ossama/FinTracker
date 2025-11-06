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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

// Validation schema
const signUpSchema = yup.object().shape({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignUpScreenProps {
  navigation: any;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  
  const { signUp, signInWithGoogle } = useAuth();
  const { theme, isDark } = useTheme();
  const { alertState, hideAlert, showSuccess, showError } = useCustomAlert();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
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

  const onSubmit = async (data: SignUpFormData) => {
    if (!acceptTerms) {
      showError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(
        data.email,
        data.password,
        `${data.firstName} ${data.lastName}`
      );

      if (result.success) {
        showSuccess('Account created successfully! Welcome to FINEX!');
      } else {
        showError(result.error || 'Failed to create account');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        showSuccess('Account created successfully with Google!');
      } else {
        showError(result.error || 'Google sign up failed');
      }
    } catch (error) {
      showError('Google sign up failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z\d]/.test(password)) score++;
    
    if (score <= 2) return { strength: 'Weak', color: '#EF4444', width: '33%' };
    if (score <= 3) return { strength: 'Medium', color: '#F59E0B', width: '66%' };
    return { strength: 'Strong', color: '#10B981', width: '100%' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

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
              {/* Hero Section */}
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
                    Create Account
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                    Start managing your finances today
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
                  {/* Name Fields */}
                  <View style={styles.nameRow}>
                    <View style={[styles.inputGroup, styles.nameInput]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>First Name</Text>
                      <Controller
                        control={control}
                        name="firstName"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View style={[
                            styles.inputWrapper, 
                            { 
                              backgroundColor: theme.colors.background,
                              borderColor: errors.firstName ? '#EF4444' : theme.colors.border,
                              borderWidth: errors.firstName ? 2 : 1,
                            }
                          ]}>
                            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                            <TextInput
                              style={[styles.textInput, { color: theme.colors.text }]}
                              placeholder="John"
                              placeholderTextColor={theme.colors.textSecondary}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              autoCapitalize="words"
                              editable={!isLoading}
                            />
                          </View>
                        )}
                      />
                      {errors.firstName && (
                        <Text style={styles.errorText}>{errors.firstName.message}</Text>
                      )}
                    </View>

                    <View style={[styles.inputGroup, styles.nameInput]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Last Name</Text>
                      <Controller
                        control={control}
                        name="lastName"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View style={[
                            styles.inputWrapper, 
                            { 
                              backgroundColor: theme.colors.background,
                              borderColor: errors.lastName ? '#EF4444' : theme.colors.border,
                              borderWidth: errors.lastName ? 2 : 1,
                            }
                          ]}>
                            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                            <TextInput
                              style={[styles.textInput, { color: theme.colors.text }]}
                              placeholder="Doe"
                              placeholderTextColor={theme.colors.textSecondary}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              autoCapitalize="words"
                              editable={!isLoading}
                            />
                          </View>
                        )}
                      />
                      {errors.lastName && (
                        <Text style={styles.errorText}>{errors.lastName.message}</Text>
                      )}
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email Address</Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[
                          styles.inputWrapper, 
                          { 
                            backgroundColor: theme.colors.background,
                            borderColor: errors.email ? '#EF4444' : theme.colors.border,
                            borderWidth: errors.email ? 2 : 1,
                          }
                        ]}>
                          <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                          <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="john.doe@example.com"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!isLoading}
                          />
                        </View>
                      )}
                    />
                    {errors.email && (
                      <Text style={styles.errorText}>{errors.email.message}</Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[
                          styles.inputWrapper, 
                          { 
                            backgroundColor: theme.colors.background,
                            borderColor: errors.password ? '#EF4444' : theme.colors.border,
                            borderWidth: errors.password ? 2 : 1,
                          }
                        ]}>
                          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                          <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="Create a strong password"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoComplete="password-new"
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
                    
                    {/* Password Strength */}
                    {password && passwordStrength && (
                      <View style={styles.strengthContainer}>
                        <View style={styles.strengthBar}>
                          <View 
                            style={[
                              styles.strengthFill,
                              { 
                                backgroundColor: passwordStrength.color,
                                width: passwordStrength.width === '33%' ? '33%' : passwordStrength.width === '66%' ? '66%' : '100%',
                              }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                          {passwordStrength.strength}
                        </Text>
                      </View>
                    )}

                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password.message}</Text>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Confirm Password</Text>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={[
                          styles.inputWrapper, 
                          { 
                            backgroundColor: theme.colors.background,
                            borderColor: errors.confirmPassword ? '#EF4444' : theme.colors.border,
                            borderWidth: errors.confirmPassword ? 2 : 1,
                          }
                        ]}>
                          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textSecondary} />
                          <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="Confirm your password"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            editable={!isLoading}
                          />
                          <TouchableOpacity 
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons 
                              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                              size={20} 
                              color={theme.colors.textSecondary} 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                    )}
                  </View>

                  {/* Terms & Privacy */}
                  <TouchableOpacity 
                    style={styles.termsContainer} 
                    onPress={() => setAcceptTerms(!acceptTerms)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox, 
                      { borderColor: theme.colors.border },
                      acceptTerms && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}>
                      {acceptTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                    <View style={styles.termsTextContainer}>
                      <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                        I agree to{' '}
                        <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
                          Terms of Service
                        </Text>
                        {' '}and{' '}
                        <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
                          Privacy Policy
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Sign Up Button */}
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={[styles.signUpButton, (!isValid || !acceptTerms || isLoading) && styles.buttonDisabled]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      onPress={handleSubmit(onSubmit)}
                      disabled={!isValid || !acceptTerms || isLoading}
                      style={styles.buttonContent}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.signUpButtonText}>Create Account</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </LinearGradient>

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  </View>

                  {/* Google Sign Up */}
                  <TouchableOpacity
                    style={[styles.googleButton, { 
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border
                    }]}
                    onPress={handleGoogleSignUp}
                    disabled={isGoogleLoading || isLoading}
                    activeOpacity={0.7}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator size="small" color="#EA4335" />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={20} color="#EA4335" />
                        <Text style={[styles.googleButtonText, { color: theme.colors.text }]}>
                          Continue with Google
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Sign In Link */}
              <View style={styles.signInSection}>
                <Text style={[styles.signInPrompt, { color: theme.colors.textSecondary }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
                  <Text style={[styles.signInLink, { color: theme.colors.primary }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
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

  // Name Fields
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    marginBottom: 16,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
    marginLeft: 4,
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

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Buttons
  signUpButton: {
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
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
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

  // Google Button
  googleButton: {
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
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.2,
  },

  // Sign In Section
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  signInPrompt: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  signInLink: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default SignUpScreen;