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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

// Validation Schema
const signInSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email')
    .lowercase(),
  password: yup
    .string()
    .required('Password is required'),
});

interface SignInFormData {
  email: string;
  password: string;
}

interface SignInScreenProps {
  navigation: any;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  
  // Logic States
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Biometric States
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [showAutoBiometric, setShowAutoBiometric] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Hooks
  const { signIn, signInWithGoogle, authenticateWithBiometric, checkBiometricAvailability } = useAuth();
  const { alertState, hideAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  // Initialization
  useEffect(() => {
    checkBiometricSupport();
    
    // Entrance Animation
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

  const checkBiometricSupport = async () => {
    const isAvailable = await checkBiometricAvailability();
    setBiometricAvailable(isAvailable);
    
    try {
      const hasLoginHistory = await AsyncStorage.getItem('has_logged_in_before');
      const userBiometricEnabled = await AsyncStorage.getItem('biometric_enabled');
      const rememberMeValue = await AsyncStorage.getItem('remember_me');
      
      const shouldShowBiometric = isAvailable && 
                                  userBiometricEnabled === 'true' && 
                                  hasLoginHistory === 'true' && 
                                  rememberMeValue === 'true';
      
      setShowBiometricOption(shouldShowBiometric);
      if (shouldShowBiometric) setShowAutoBiometric(true);
    } catch (error) {
      setShowBiometricOption(false);
    }
  };

  // Handlers
  const onSubmit = async (data: SignInFormData) => {
    try {
      setIsLoading(true);
      const result = await signIn(data.email, data.password, rememberMe);
      
      if (result.success) {
        await AsyncStorage.setItem('has_logged_in_before', 'true');
        if (rememberMe) await AsyncStorage.setItem('remember_me', 'true');
      } else {
        showError('Sign In Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      const result = await authenticateWithBiometric();
      if (result.success) {
        await AsyncStorage.setItem('has_logged_in_before', 'true');
      } else {
        showError('Authentication Failed', result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      showError('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await signInWithGoogle();
      if (!result.success) {
        showError('Google Sign In Failed', result.error || 'Please try again');
      }
    } catch (error) {
      showError('Error', 'Google Sign In failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'demo@finex.app', { shouldValidate: true });
    setValue('password', 'Demo123!', { shouldValidate: true });
  };

  // Design Tokens (Professional iOS Palette)
  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#8E8E93', // System Gray
    accent: '#007AFF', // iOS System Blue
    inputBg: isDark ? '#1C1C1E' : '#F2F2F7', // System grouped background
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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Minimal Header */}
            <View style={styles.headerContainer}>
              <View style={[styles.logoPlaceholder, { borderColor: colors.divider }]}>
                 <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to your Finex account
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
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
                        placeholder="name@example.com"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onFocus={() => setFocusedField('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {value.length > 0 && !errors.email && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={styles.validIcon} />
                      )}
                    </View>
                  )}
                />
                {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email.message}</Text>}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                  <TouchableOpacity onPress={() => showConfirm('Reset Password', 'Password reset flow initiated.', () => {})}>
                    <Text style={[styles.forgotLink, { color: colors.accent }]}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                
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
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={() => { onBlur(); setFocusedField(null); }}
                        onFocus={() => setFocusedField('password')}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)} 
                        style={styles.eyeIcon}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      >
                        <Ionicons 
                          name={showPassword ? 'eye-off' : 'eye'} 
                          size={20} 
                          color={colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && <Text style={[styles.errorText, { color: colors.error }]}>{errors.password.message}</Text>}
              </View>

              {/* Controls Row */}
              <View style={styles.controlsRow}>
                <TouchableOpacity 
                  style={styles.rememberMeContainer} 
                  activeOpacity={0.8}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[
                    styles.checkbox, 
                    { borderColor: rememberMe ? colors.accent : colors.textSecondary },
                    rememberMe && { backgroundColor: colors.accent }
                  ]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>Remember me</Text>
                </TouchableOpacity>
              </View>

              {/* Main Actions */}
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn, 
                    { backgroundColor: colors.text }, // Black button on light, White on dark
                    (!isValid || isLoading) && { opacity: 0.5 }
                  ]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={!isValid || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={isDark ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.background }]}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {showBiometricOption && (
                  <TouchableOpacity 
                    style={[styles.biometricBtn, { backgroundColor: colors.inputBg }]}
                    onPress={handleBiometricLogin}
                  >
                    <Ionicons name="finger-print" size={24} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>Or continue with</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
              </View>

              {/* Social Login */}
              <View style={styles.socialContainer}>
                <TouchableOpacity 
                  style={[styles.socialBtn, { borderColor: colors.divider, backgroundColor: colors.background }]}
                  onPress={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={colors.text} />
                      <Text style={[styles.socialBtnText, { color: colors.text }]}>Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialBtn, { borderColor: colors.divider, backgroundColor: colors.background }]}
                  onPress={fillDemoCredentials}
                >
                  <Ionicons name="key-outline" size={20} color={colors.text} />
                  <Text style={[styles.socialBtnText, { color: colors.text }]}>Demo</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  New to Finex?
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={[styles.footerLink, { color: colors.accent }]}>Create an account</Text>
                </TouchableOpacity>
              </View>

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

      <CustomAlert
        visible={showAutoBiometric}
        title="Welcome Back"
        message="Confirm your identity to sign in."
        buttons={[
          { text: 'Cancel', onPress: () => setShowAutoBiometric(false), style: 'cancel' },
          { text: 'Authenticate', onPress: () => { setShowAutoBiometric(false); handleBiometricLogin(); }, style: 'default' },
        ]}
        icon="finger-print"
        iconColor={colors.accent}
        onDismiss={() => setShowAutoBiometric(false)}
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
  headerContainer: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    // Note: No border by default for modern iOS look, acts as a "surface"
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
    paddingRight: 10,
  },
  validIcon: {
    marginLeft: 8,
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 15,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  biometricBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
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
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialBtn: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
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

export default SignInScreen;