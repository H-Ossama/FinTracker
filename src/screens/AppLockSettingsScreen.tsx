import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '../contexts/LocalizationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLockService from '../services/appLockService';
import AutoLockDropdown from '../components/AutoLockDropdown';
import * as LocalAuthentication from 'expo-local-authentication';

interface AppLockSettings {
  isEnabled: boolean;
  autoLockTime: string;
  lockOnBackground: boolean;
  requireBiometric: boolean;
  hasPinSet: boolean;
}

const AppLockSettingsScreen = () => {
  const { theme } = useTheme();
  const { biometricEnabled } = useAuth();
  const navigation = useNavigation();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  
  const [settings, setSettings] = useState<AppLockSettings>({
    isEnabled: false,
    autoLockTime: '5min',
    lockOnBackground: true,
    requireBiometric: biometricEnabled || false,
    hasPinSet: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [localBiometricEnabled, setLocalBiometricEnabled] = useState(false);
  const appLockService = AppLockService.getInstance();

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
    initializeAppLockService();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh settings when returning to this screen
      loadSettings();
    });

    return unsubscribe;
  }, [navigation]);

  const initializeAppLockService = async () => {
    await appLockService.initialize();
    const serviceSettings = appLockService.getSettings();
    if (serviceSettings) {
      setSettings(serviceSettings);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appLockSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
      
      // Check if biometric is available
      const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
      const biometricEnrolled = await LocalAuthentication.isEnrolledAsync();
      setLocalBiometricEnabled(biometricAvailable && biometricEnrolled);
    } catch (error) {
      console.error('Failed to load app lock settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppLockSettings) => {
    try {
      await AsyncStorage.setItem('appLockSettings', JSON.stringify(newSettings));
      await appLockService.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save app lock settings:', error);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const toggleAppLock = async (value: boolean) => {
    if (value && !settings.hasPinSet && !localBiometricEnabled) {
      Alert.alert(
        t('appLock.setupRequired'),
        t('appLock.setupRequiredDesc'),
        [
          { text: t('cancel'), style: 'cancel' },
          { 
            text: t('appLock.setupPin'), 
            onPress: () => {
              (navigation as any).navigate('PinSetup', { mode: 'setup' });
            }
          }
        ]
      );
      return;
    }
    
    const newSettings = { ...settings, isEnabled: value };
    await saveSettings(newSettings);
  };

  const toggleLockOnBackground = async (value: boolean) => {
    const newSettings = { ...settings, lockOnBackground: value };
    await saveSettings(newSettings);
  };

  const toggleRequireBiometric = async (value: boolean) => {
    if (value && !localBiometricEnabled) {
      Alert.alert(
        t('appLock.biometricNotAvailable'),
        t('notificationPrefs.enableInSettings'),
        [{ text: t('ok') }]
      );
      return;
    }
    
    const newSettings = { ...settings, requireBiometric: value };
    await saveSettings(newSettings);
  };

  const handleAutoLockTimeChange = async (value: string) => {
    const newSettings = { ...settings, autoLockTime: value };
    await saveSettings(newSettings);
  };

  const handleSetupPin = () => {
    (navigation as any).navigate('PinSetup', { mode: 'setup' });
  };

  const handleChangePinOrPassword = () => {
    if (!settings.hasPinSet) {
      handleSetupPin();
      return;
    }

    Alert.alert(
      t('appLock.changeAuthTitle'),
      t('appLock.changeAuthDesc'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('appLock.changePin'),
          onPress: () => {
            (navigation as any).navigate('PinSetup', { mode: 'change' });
          },
        },
        {
          text: t('appLock.removePin'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('appLock.removePinTitle'),
              t('appLock.removePinDesc'),
              [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('appLock.remove'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.removeItem('app_pin_hash');
                      const newSettings = { ...settings, hasPinSet: false };
                      await saveSettings(newSettings);
                      Alert.alert(t('success'), t('appLock.pinRemoved'));
                    } catch (error) {
                      Alert.alert(t('error'), t('appLock.pinRemoved'));
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getAutoLockLabel = (value: string) => {
    switch (value) {
      case 'immediate': return t('appLock.immediately');
      case '10sec': return t('appLock.tenSeconds');
      case '30sec': return t('appLock.thirtySeconds');
      case '1min': return t('appLock.oneMinute');
      case '2min': return t('appLock.twoMinutes');
      case '5min': return t('appLock.fiveMinutes');
      case '10min': return t('appLock.tenMinutes');
      case '15min': return t('appLock.fifteenMinutes');
      case '30min': return t('appLock.thirtyMinutes');
      case '1hour': return t('appLock.oneHour');
      case 'never': return t('appLock.never');
      default: return t('appLock.fiveMinutes');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      
      {/* Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButtonHeader}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('appLock.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      {/* Content Container */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Master Toggle */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.masterToggle}>
                <View style={styles.masterToggleContent}>
                  <Ionicons name="shield-checkmark" size={24} color={settings.isEnabled ? theme.colors.primary : theme.colors.textSecondary} />
                  <View style={styles.masterToggleText}>
                    <Text style={[styles.masterToggleTitle, { color: theme.colors.text }]}>
                      {t('appLock.protection')}
                    </Text>
                    <Text style={[styles.masterToggleSubtitle, { color: theme.colors.textSecondary }]}>
                      {settings.isEnabled ? t('appLock.protectedStatus') : t('appLock.unprotectedStatus')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.isEnabled}
                  onValueChange={toggleAppLock}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.isEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Lock Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('appLock.lockSettings')}</Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="time-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {t('appLock.autoLockTimer')}
                  </Text>
                </View>
                <AutoLockDropdown
                  value={settings.autoLockTime}
                  onValueChange={handleAutoLockTimeChange}
                  disabled={!settings.isEnabled}
                />
              </View>

              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="apps-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {t('appLock.lockOnBackground')}
                  </Text>
                </View>
                <Switch
                  value={settings.lockOnBackground}
                  onValueChange={toggleLockOnBackground}
                  disabled={!settings.isEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.lockOnBackground ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Ionicons name="finger-print-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {t('appLock.requireBiometric')}
                  </Text>
                </View>
                <Switch
                  value={settings.requireBiometric && localBiometricEnabled}
                  onValueChange={toggleRequireBiometric}
                  disabled={!settings.isEnabled || !localBiometricEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.requireBiometric ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Authentication Methods */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('appLock.authMethods')}</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleChangePinOrPassword}
                disabled={!settings.isEnabled}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="keypad-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {settings.hasPinSet ? t('appLock.changePin') : t('appLock.setupPin')}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { 
                    color: settings.hasPinSet ? theme.colors.primary : theme.colors.textSecondary 
                  }]}>
                    {settings.hasPinSet ? t('appLock.pinConfigured') : t('appLock.pinNotSet')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Ionicons name="finger-print" size={20} color={localBiometricEnabled ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    {t('appLock.biometricAuth')}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { 
                    color: localBiometricEnabled ? theme.colors.primary : theme.colors.textSecondary 
                  }]}>
                    {localBiometricEnabled ? t('appLock.biometricAvailable') : t('appLock.biometricNotAvailable')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Security Information */}
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {t('appLock.infoText')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    darkHeader: {
      backgroundColor: '#1C1C1E',
      paddingBottom: 16,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 44,
    },
    backButtonHeader: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    contentContainer: {
      flex: 1,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    masterToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    masterToggleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    masterToggleText: {
      marginLeft: 16,
      flex: 1,
    },
    masterToggleTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    masterToggleSubtitle: {
      fontSize: 14,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    settingItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 12,
    },
    settingRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingValue: {
      fontSize: 14,
      marginRight: 8,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 12,
      flex: 1,
    },
  });

export default AppLockSettingsScreen;