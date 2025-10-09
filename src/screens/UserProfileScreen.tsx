import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserProfileScreenProps {
  navigation: any;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const { theme } = useTheme();
  const { t } = useLocalization();
  const { alertState, hideAlert, showSuccess, showError, showDestructive } = useCustomAlert();
  const {
    user,
    updateProfile,
    changePassword,
    deleteAccount,
    signOut,
    enableBiometric,
    disableBiometric,
    checkBiometricAvailability,
    biometricEnabled: currentBiometricEnabled,
  } = useAuth();

  const styles = createStyles(theme);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    setBiometricEnabled(currentBiometricEnabled);
  }, [currentBiometricEnabled]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      
      const result = await updateProfile({
        name: data.name,
        email: data.email,
      });

      if (result.success) {
        setIsEditing(false);
        // Reset form with updated values
        profileForm.reset({
          name: data.name,
          email: data.email,
        });
        showSuccess(t('profile_screen_profile_updated'), t('profile_screen_profile_updated_success'));
      } else {
        showError(t('profile_screen_update_failed'), result.error || t('profile_screen_update_failed'));
      }
    } catch (error) {
      showError(t('error'), t('profile_screen_unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      
      const result = await changePassword(data.currentPassword, data.newPassword);

      if (result.success) {
        setShowChangePassword(false);
        passwordForm.reset();
        Alert.alert(t('success'), t('profile_screen_password_changed'));
      } else {
        Alert.alert(t('profile_screen_password_change_failed'), result.error || t('profile_screen_password_change_failed'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('profile_screen_unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const isAvailable = await checkBiometricAvailability();
        if (!isAvailable) {
          Alert.alert(
            t('profile_screen_biometric_not_available'),
            t('profile_screen_biometric_not_setup')
          );
          return;
        }

        const result = await enableBiometric();
        if (result.success) {
          setBiometricEnabled(true);
          Alert.alert(t('success'), t('profile_screen_biometric_enabled'));
        } else {
          Alert.alert(t('profile_screen_biometric_failed'), result.error || t('profile_screen_biometric_failed'));
        }
      } else {
        await disableBiometric();
        setBiometricEnabled(false);
        Alert.alert(t('success'), t('profile_screen_biometric_disabled'));
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile_screen_delete_account_title'),
      t('profile_screen_delete_account_warning') + '\n\n' + 
      '⚠️ This action will:\n' +
      '• Delete all your financial data\n' + 
      '• Remove all transactions and wallets\n' +
      '• Clear all reminders and goals\n' +
      '• Sign you out permanently\n\n' +
      'This cannot be undone!',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('profile_screen_delete_account'),
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setIsLoading(true);
      
      const result = await deleteAccount();

      if (result.success) {
        Alert.alert(
          '✅ Account Deleted',
          'Your account and all data have been permanently deleted. Thank you for using FinTracker.',
          [
            {
              text: t('ok'),
              style: 'default',
              // Navigation will be handled automatically by auth state change
            },
          ]
        );
      } else {
        Alert.alert(
          'Deletion Failed', 
          result.error || 'Failed to delete account. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        'An unexpected error occurred while deleting your account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    showDestructive(
      t('profile_screen_sign_out'),
      t('profile_screen_sign_out_confirmation'),
      async () => {
        await signOut();
        // Navigation will be handled automatically by auth state change
      },
      undefined,
      t('profile_screen_sign_out')
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile_screen_title')}</Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "create-outline"} 
            size={24} 
            color="#3B82F6" 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Profile Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userDetails}>
              <Text style={[styles.displayName, { color: theme.colors.text }]}>
                {user?.name || 'User'}
              </Text>
              <Text style={[styles.emailAddress, { color: theme.colors.textSecondary }]}>
                {user?.email || ''}
              </Text>
              <View style={styles.verificationBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>{t('profile_screen_verified_account')}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile_screen_joined')}</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {new Date(user?.createdAt || '').toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield" size={20} color="#10B981" />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile_screen_security')}</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {biometricEnabled ? t('profile_screen_enhanced') : t('profile_screen_standard')}
              </Text>
            </View>
          </View>
        </View>

        {/* Modern Menu Sections */}
        <View style={styles.menuSections}>
          {/* Personal Information */}
          <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="person-outline" size={20} color="#3B82F6" />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('profile_screen_personal_info')}</Text>
              </View>
              {isEditing && (
                <TouchableOpacity 
                  style={[styles.saveButton, !profileForm.formState.isValid && styles.buttonDisabled]} 
                  onPress={profileForm.handleSubmit(handleProfileUpdate)}
                  disabled={!profileForm.formState.isValid || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('profile_screen_save')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{t('profile_screen_full_name')}</Text>
                  <Controller
                    control={profileForm.control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                        placeholder={t('profile_screen_enter_full_name')}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{t('profile_screen_email_address')}</Text>
                  <Controller
                    control={profileForm.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                        placeholder={t('profile_screen_enter_email')}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    )}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile_screen_full_name')}</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.name || t('profile_screen_not_set')}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile_screen_email_address')}</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.email || t('profile_screen_not_set')}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Security Settings */}
          <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="shield-outline" size={20} color="#10B981" />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('profile_screen_security_privacy')}</Text>
              </View>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity 
                style={styles.modernSettingItem}
                onPress={() => setShowChangePassword(!showChangePassword)}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="key-outline" size={18} color="#F59E0B" />
                  </View>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('profile_screen_change_password')}</Text>
                </View>
                <Ionicons name={showChangePassword ? "chevron-up" : "chevron-forward"} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.modernSettingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="finger-print-outline" size={18} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('profile_screen_biometric_auth')}</Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      {t('profile_screen_biometric_desc')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={() => {}} // Read-only - managed in profile
                  trackColor={{ false: theme.colors.border, true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Account Actions */}
          <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="settings-outline" size={20} color="#6B7280" />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('profile_screen_account')}</Text>
              </View>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity style={styles.modernSettingItem} onPress={handleSignOut}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('profile_screen_sign_out')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.modernSettingItem} onPress={handleDeleteAccount}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.dangerSettingLabel, { color: '#EF4444' }]}>{t('profile_screen_delete_account')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerAction: {
    padding: 8,
    borderRadius: 8,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Hero Card Styles
  heroCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userDetails: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  emailAddress: {
    fontSize: 16,
    marginBottom: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 6,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  // Buttons
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoDisplay: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  settingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  passwordForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dangerSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dangerSettingText: {
    flex: 1,
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 12,
  },
  // Additional styles for new design
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSections: {
    padding: 16,
    gap: 16,
  },
  menuCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  editForm: {
    gap: 16,
  },
  formField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modernInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsList: {
    gap: 4,
  },
  modernSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  dangerSettingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfileScreen;