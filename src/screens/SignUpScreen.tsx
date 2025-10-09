import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

// Validation schema
const signUpSchema = yup.object().shape({
  name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  agreeToTerms: yup
    .boolean()
    .required('You must agree to the Terms of Service and Privacy Policy')
    .test('agree-terms', 'You must agree to the Terms of Service and Privacy Policy', (value) => value === true),
});

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface SignUpScreenProps {
  navigation: any; // Replace with proper navigation type
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const { alertState, hideAlert, showSuccess, showError } = useCustomAlert();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const password = watch('password');
  const agreeToTerms = watch('agreeToTerms');

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return '#FF6B6B';
    if (strength <= 3) return '#FFB443';
    if (strength <= 4) return '#51CF66';
    return '#40C057';
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsLoading(true);
      
      const result = await signUp(data.email, data.password, data.name);
      
      if (result.success) {
        // Show welcome message with delay to ensure proper rendering
        setTimeout(() => {
          showSuccess(
            '🎉 Welcome to FinTracker!',
            'Your account has been created successfully and you are now signed in.',
          );
        }, 100);
      } else {
        showError('Registration Failed', result.error || 'Please try again');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openTermsOfService = () => {
    Linking.openURL('https://fintracker.app/terms-of-service');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://fintracker.app/privacy-policy');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet" size={28} color="#3B82F6" />
            <Text style={[styles.appName, { color: theme.colors.text }]}>FinTracker</Text>
          </View>
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>Create Account</Text>
        </View>

        {/* Registration Form Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>Create Account</Text>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Full Name</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.modernInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: errors.name ? '#EF4444' : theme.colors.border 
                }]}>
                  <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.modernInput, { color: theme.colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email Address</Text>
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
                    placeholder="Enter your email address"
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
                    placeholder="Create a strong password"
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
            
            {/* Password Strength Indicator */}
            {password && (
              <View style={styles.passwordStrengthContainer}>
                <Text style={[styles.passwordStrengthText, { color: theme.colors.textSecondary }]}>
                  Password Strength:
                </Text>
                <View style={styles.strengthBarContainer}>
                  <View 
                    style={[
                      styles.strengthBar, 
                      { backgroundColor: getPasswordStrengthColor(getPasswordStrength(password)) }
                    ]} 
                  />
                  <Text 
                    style={[
                      styles.strengthLabel, 
                      { color: getPasswordStrengthColor(getPasswordStrength(password)) }
                    ]}
                  >
                    {getPasswordStrengthText(getPasswordStrength(password))}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Confirm Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.modernInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: errors.confirmPassword ? '#EF4444' : theme.colors.border 
                }]}>
                  <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.modernInput, { color: theme.colors.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
          </View>

          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Controller
              control={control}
              name="agreeToTerms"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.termsCheckboxContainer}
                  onPress={() => onChange(!value)}
                >
                  <View style={[styles.modernCheckbox, value && styles.checkboxChecked]}>
                    {value && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                    I agree to the{' '}
                    <Text style={styles.linkText} onPress={openTermsOfService}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.linkText} onPress={openPrivacyPolicy}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
              )}
            />
            {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms.message}</Text>}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.modernSignUpButton, (!isValid || isLoading) && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.signUpButtonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Social Sign Up Options */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={[styles.socialButtonText, { color: theme.colors.text }]}>Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              disabled={isLoading}
            >
              <Ionicons name="logo-apple" size={20} color={theme.colors.text} />
              <Text style={[styles.socialButtonText, { color: theme.colors.text }]}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInSection}>
          <Text style={[styles.signInPrompt, { color: theme.colors.textSecondary }]}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.signInLink}>Sign In</Text>
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

  // Password Strength
  passwordStrengthContainer: {
    marginTop: 12,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBar: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    marginRight: 12,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
  },

  // Terms and Privacy
  termsContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modernCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Buttons
  modernSignUpButton: {
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
  signUpButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
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

  // Social Buttons
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
    paddingVertical: 16,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Sign In Section
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  signInPrompt: {
    fontSize: 16,
    marginRight: 4,
  },
  signInLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
  },
});

export default SignUpScreen;