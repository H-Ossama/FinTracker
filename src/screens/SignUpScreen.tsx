import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

const signUpSchema = yup.object().shape({
  firstName: yup.string().required('First name required').min(2, 'Min 2 chars'),
  lastName: yup.string().required('Last name required').min(2, 'Min 2 chars'),
  email: yup.string().required('Email required').email('Invalid email').lowercase(),
  password: yup
    .string()
    .required('Password required')
    .min(8, 'Min 8 chars')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '1 upper, 1 lower, 1 number'),
  confirmPassword: yup
    .string()
    .required('Confirm password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
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
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  
  // Logic States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const { signUp, signUpWithGoogle } = useAuth();
  const { alertState, hideAlert, showSuccess, showError } = useCustomAlert();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onSubmit = async (data: SignUpFormData) => {
    if (!acceptTerms) {
      showError('Terms Required', 'Please accept the Terms of Service to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(data.email, data.password, `${data.firstName} ${data.lastName}`);
      if (!result.success) {
        showError('Sign Up Failed', result.error || 'Failed to create account');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signUpWithGoogle();
      if (!result.success) {
        showError('Google Sign Up Failed', result.error || 'Please try again');
      }
    } catch (error) {
      showError('Error', 'Google sign up failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z\d]/.test(pwd)) score++;
    
    if (score <= 2) return { label: 'Weak', color: '#FF3B30', width: '33%' };
    if (score <= 3) return { label: 'Medium', color: '#FF9500', width: '66%' };
    return { label: 'Strong', color: '#34C759', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Design Tokens
  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#8E8E93',
    accent: '#007AFF', // iOS Blue
    inputBg: isDark ? '#1C1C1E' : '#F2F2F7',
    inputBorder: isDark ? '#3A3A3C' : '#E5E5EA',
    error: '#FF3B30',
    divider: isDark ? '#38383A' : '#E5E5EA',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nav Header */}
          <View style={styles.navBar}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Ionicons name="chevron-back" size={28} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Title Section */}
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Join Finex for smart financial tracking
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              
              {/* Name Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>First Name</Text>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.inputBg },
                        focusedField === 'firstName' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                        errors.firstName && { borderColor: colors.error, borderWidth: 1 }
                      ]}>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          placeholder="John"
                          placeholderTextColor={colors.textSecondary}
                          value={value}
                          onChangeText={onChange}
                          onBlur={() => { onBlur(); setFocusedField(null); }}
                          onFocus={() => setFocusedField('firstName')}
                          autoCapitalize="words"
                        />
                      </View>
                    )}
                  />
                  {errors.firstName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.firstName.message}</Text>}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Last Name</Text>
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.inputBg },
                        focusedField === 'lastName' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                        errors.lastName && { borderColor: colors.error, borderWidth: 1 }
                      ]}>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          placeholder="Doe"
                          placeholderTextColor={colors.textSecondary}
                          value={value}
                          onChangeText={onChange}
                          onBlur={() => { onBlur(); setFocusedField(null); }}
                          onFocus={() => setFocusedField('lastName')}
                          autoCapitalize="words"
                        />
                      </View>
                    )}
                  />
                  {errors.lastName && <Text style={[styles.errorText, { color: colors.error }]}>{errors.lastName.message}</Text>}
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg },
                      focusedField === 'email' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                      errors.email && { borderColor: colors.error, borderWidth: 1 }
                    ]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="your@email.com"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onFocus={() => setFocusedField('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  )}
                />
                {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email.message}</Text>}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg },
                      focusedField === 'password' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                      errors.password && { borderColor: colors.error, borderWidth: 1 }
                    ]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Create a strong password"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onFocus={() => setFocusedField('password')}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                
                {/* Strength Meter */}
                {passwordStrength && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthTrack}>
                      <Animated.View 
                        style={[
                          styles.strengthBar, 
                          { width: passwordStrength.width as any, backgroundColor: passwordStrength.color }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
                
                {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password.message}</Text>}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg },
                      focusedField === 'confirmPassword' && { borderColor: colors.accent, borderWidth: 1, backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                      errors.confirmPassword && { borderColor: colors.error, borderWidth: 1 }
                    ]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Repeat password"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onFocus={() => setFocusedField('confirmPassword')}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.confirmPassword && <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword.message}</Text>}
              </View>

              {/* Terms */}
              <TouchableOpacity 
                style={styles.termsContainer} 
                activeOpacity={0.8}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[
                  styles.checkbox, 
                  { borderColor: acceptTerms ? colors.accent : colors.textSecondary },
                  acceptTerms && { backgroundColor: colors.accent }
                ]}>
                  {acceptTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  I agree to the <Text style={{ color: colors.accent, fontWeight: '600' }}>Terms of Service</Text> and <Text style={{ color: colors.accent, fontWeight: '600' }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Buttons */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn, 
                  { backgroundColor: colors.text }, 
                  (!isValid || !acceptTerms || isLoading) && { opacity: 0.5 }
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={!isValid || !acceptTerms || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.background }]}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>Or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
              </View>

              <TouchableOpacity 
                style={[styles.socialBtn, { borderColor: colors.divider, backgroundColor: colors.background }]}
                onPress={handleGoogleSignUp}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={colors.text} />
                    <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={[styles.footerLink, { color: colors.accent }]}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        icon={alertState.icon as any}
        iconColor={alertState.iconColor}
        onDismiss={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  navBar: {
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
    marginLeft: -8, // Align back button visual
  },
  backButton: {
    padding: 8,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  formContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 4,
    gap: 12,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(128,128,128, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  socialBtn: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 5,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SignUpScreen;