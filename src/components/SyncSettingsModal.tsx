import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hybridDataService } from '../services/hybridDataService';
import { useTheme } from '../contexts/ThemeContext';
import useSafeAreaHelper from '../hooks/useSafeAreaHelper';

interface SyncProgress {
  stage: 'uploading' | 'downloading' | 'processing' | 'complete';
  progress: number;
  message: string;
}

interface SyncSettingsProps {
  visible: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsProps> = ({
  visible,
  onClose,
  onSyncComplete,
}) => {
  const { theme } = useTheme();
  const { headerPadding } = useSafeAreaHelper();
  const [syncStatus, setSyncStatus] = useState({
    enabled: false,
    authenticated: false,
    lastSync: null as Date | null,
    unsyncedItems: 0,
    nextReminderDue: null as Date | null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSyncStatus();
    }
  }, [visible]);

  const loadSyncStatus = async () => {
    try {
      const status = await hybridDataService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isRegisterMode && (!firstName || !lastName)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      if (isRegisterMode) {
        result = await hybridDataService.registerUser({
          email,
          password,
          firstName,
          lastName,
        });
      } else {
        result = await hybridDataService.loginUser(email, password);
      }

      if (result.success) {
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        await loadSyncStatus();
        Alert.alert(
          'Success',
          isRegisterMode ? 'Account created and sync enabled!' : 'Login successful and sync enabled!'
        );
      } else {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will disable cloud sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await hybridDataService.logoutUser();
              await loadSyncStatus();
              Alert.alert('Success', 'Logged out successfully');
            } catch (error) {
              Alert.alert('Error', 'Logout failed');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!syncStatus.authenticated) {
      Alert.alert('Error', 'Please login first to sync your data');
      return;
    }

    setShowProgress(true);
    try {
      const result = await hybridDataService.performManualSync((progress) => {
        setSyncProgress(progress);
      });

      if (result.success) {
        Alert.alert('Success', 'Sync completed successfully!');
        await loadSyncStatus();
        onSyncComplete?.();
      } else {
        Alert.alert('Sync Failed', result.error || 'Unknown sync error');
      }
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setShowProgress(false);
      setSyncProgress(null);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    if (enabled && !syncStatus.authenticated) {
      setShowLoginForm(true);
      return;
    }

    if (!enabled) {
      Alert.alert(
        'Disable Sync',
        'Are you sure you want to disable cloud sync? Your data will remain on this device only.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await hybridDataService.disableCloudSync();
              await loadSyncStatus();
            },
          },
        ]
      );
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderLoginForm = () => (
    <Modal visible={showLoginForm} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: headerPadding.paddingTop }]}>
          <TouchableOpacity onPress={() => setShowLoginForm(false)}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {isRegisterMode ? 'Create Account' : 'Login to Sync'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {isRegisterMode ? 'Create your account to start syncing your data across devices' : 'Login to sync your data across devices'}
          </Text>

          {isRegisterMode && (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="First Name"
                placeholderTextColor={theme.colors.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Last Name"
                placeholderTextColor={theme.colors.textSecondary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegisterMode ? 'Create Account & Enable Sync' : 'Login & Enable Sync'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setIsRegisterMode(!isRegisterMode)}
          >
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>
              {isRegisterMode
                ? 'Already have an account? Login'
                : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>

          <View style={[styles.securityInfo, { backgroundColor: theme.isDark ? 'rgba(76, 175, 80, 0.1)' : '#f0f9f0' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={[styles.securityText, { color: theme.isDark ? '#4CAF50' : '#4CAF50' }]}>
              Your data is encrypted and securely stored. We never access your personal financial information.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderProgressModal = () => (
    <Modal visible={showProgress} transparent animationType="fade">
      <View style={styles.progressOverlay}>
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.progressTitle, { color: theme.colors.text }]}>Syncing...</Text>
          {syncProgress && (
            <>
              <Text style={[styles.progressMessage, { color: theme.colors.textSecondary }]}>{syncProgress.message}</Text>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${syncProgress.progress}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
              <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>{syncProgress.progress}%</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: headerPadding.paddingTop }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sync Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Sync Status Section */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cloud Sync</Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                Sync your data across devices and keep it backed up in the cloud
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Enable Cloud Sync</Text>
                  <Text style={[styles.settingSubLabel, { color: theme.colors.textSecondary }]}>
                    {syncStatus.authenticated
                      ? 'Logged in and ready to sync'
                      : 'Login required to enable sync'}
                  </Text>
                </View>
                <Switch
                  value={syncStatus.enabled}
                  onValueChange={handleToggleSync}
                  disabled={isLoading}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={syncStatus.enabled ? 'white' : theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Authentication Section */}
            {syncStatus.enabled && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
                
                {syncStatus.authenticated ? (
                  <View style={styles.accountInfo}>
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={[styles.statusText, { color: '#4CAF50' }]}>Authenticated</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
                      onPress={handleLogout}
                      disabled={isLoading}
                    >
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowLoginForm(true)}
                  >
                    <Text style={styles.buttonText}>Login / Create Account</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Sync Status Section */}
            {syncStatus.enabled && syncStatus.authenticated && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Sync Status</Text>
                
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Last Sync:</Text>
                  <Text style={[styles.statusValue, { color: theme.colors.text }]}>{formatDate(syncStatus.lastSync)}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Unsynced Items:</Text>
                  <Text style={[
                    styles.statusValue,
                    { color: theme.colors.text },
                    syncStatus.unsyncedItems > 0 && styles.unsyncedText
                  ]}>
                    {syncStatus.unsyncedItems}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleManualSync}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="sync" size={20} color="white" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Info Section */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>How It Works</Text>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Ionicons name="phone-portrait" size={20} color={theme.colors.primary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Your data is always stored locally on your device first
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="cloud" size={20} color={theme.colors.primary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    When sync is enabled, data is backed up to the cloud
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    You'll get reminders to sync every 7 days
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    All data is encrypted and secure
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {renderLoginForm()}
      {renderProgressModal()}
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  accountInfo: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    marginLeft: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  unsyncedText: {
    color: '#FF6B6B',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 44,
  },
  primaryButton: {
    // backgroundColor will be set dynamically
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    // borderColor will be set dynamically
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // color will be set dynamically
  },
  buttonIcon: {
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    // backgroundColor, borderColor, color will be set dynamically
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 16,
    // color will be set dynamically
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    // backgroundColor will be set dynamically
  },
  securityText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
    // color will be set dynamically
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    // color will be set dynamically
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 32,
    minWidth: 200,
    // backgroundColor will be set dynamically
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    // color will be set dynamically
  },
  progressMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    // color will be set dynamically
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    // backgroundColor will be set dynamically
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    // backgroundColor will be set dynamically
  },
  progressPercent: {
    fontSize: 12,
    // color will be set dynamically
  },
});

export default SyncSettingsModal;