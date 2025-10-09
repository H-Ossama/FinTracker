import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  const [settings, setSettings] = useState<AppLockSettings>({
    isEnabled: false,
    autoLockTime: '5min',
    lockOnBackground: true,
    requireBiometric: biometricEnabled || false,
    hasPinSet: false,
  });

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appLockSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load app lock settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppLockSettings) => {
    try {
      await AsyncStorage.setItem('appLockSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save app lock settings:', error);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const toggleAppLock = (value: boolean) => {
    const newSettings = { ...settings, isEnabled: value };
    saveSettings(newSettings);
    
    if (value && !settings.hasPinSet && !biometricEnabled) {
      Alert.alert(
        'Setup Required',
        'Please set up biometric authentication or a PIN to enable app lock.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleLockOnBackground = (value: boolean) => {
    const newSettings = { ...settings, lockOnBackground: value };
    saveSettings(newSettings);
  };

  const toggleRequireBiometric = (value: boolean) => {
    const newSettings = { ...settings, requireBiometric: value };
    saveSettings(newSettings);
  };

  const handleAutoLockTime = () => {
    const options = [
      { label: 'Immediately', value: 'immediate' },
      { label: '30 seconds', value: '30sec' },
      { label: '1 minute', value: '1min' },
      { label: '5 minutes', value: '5min' },
      { label: '15 minutes', value: '15min' },
      { label: 'Never', value: 'never' },
    ];

    Alert.alert(
      'Auto-Lock Timer',
      'Choose when the app should automatically lock',
      [
        { text: 'Cancel', style: 'cancel' },
        ...options.map(option => ({
          text: option.label,
          onPress: () => {
            const newSettings = { ...settings, autoLockTime: option.value };
            saveSettings(newSettings);
          },
        })),
      ]
    );
  };

  const handleSetupPin = () => {
    Alert.alert(
      'Setup PIN',
      'Set up a 4-digit PIN as backup authentication',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Setup PIN',
          onPress: () => {
            // In a real app, you would navigate to PIN setup screen
            const newSettings = { ...settings, hasPinSet: true };
            saveSettings(newSettings);
            Alert.alert('Success', 'PIN has been set up successfully!');
          },
        },
      ]
    );
  };

  const handleChangePinOrPassword = () => {
    if (!settings.hasPinSet) {
      handleSetupPin();
      return;
    }

    Alert.alert(
      'Change Authentication',
      'Choose what you want to change',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change PIN',
          onPress: () => {
            Alert.alert('Success', 'PIN has been updated successfully!');
          },
        },
        {
          text: 'Remove PIN',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove PIN',
              'Are you sure you want to remove your PIN? You will need biometric authentication to unlock the app.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => {
                    const newSettings = { ...settings, hasPinSet: false };
                    saveSettings(newSettings);
                    Alert.alert('Success', 'PIN has been removed.');
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
      case 'immediate': return 'Immediately';
      case '30sec': return '30 seconds';
      case '1min': return '1 minute';
      case '5min': return '5 minutes';
      case '15min': return '15 minutes';
      case 'never': return 'Never';
      default: return '5 minutes';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>App Lock Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Master Toggle */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.masterToggle}>
                <View style={styles.masterToggleContent}>
                  <Ionicons name="shield-checkmark" size={24} color={settings.isEnabled ? theme.colors.primary : theme.colors.textSecondary} />
                  <View style={styles.masterToggleText}>
                    <Text style={[styles.masterToggleTitle, { color: theme.colors.text }]}>
                      App Lock Protection
                    </Text>
                    <Text style={[styles.masterToggleSubtitle, { color: theme.colors.textSecondary }]}>
                      {settings.isEnabled ? 'Your app is protected' : 'App is not protected'}
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Lock Settings</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleAutoLockTime}
                disabled={!settings.isEnabled}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="time-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    Auto-Lock Timer
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { 
                    color: settings.isEnabled ? theme.colors.textSecondary : theme.colors.textSecondary 
                  }]}>
                    {getAutoLockLabel(settings.autoLockTime)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="apps-outline" size={20} color={settings.isEnabled ? theme.colors.text : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    Lock on Background
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
                    Require Biometric
                  </Text>
                </View>
                <Switch
                  value={settings.requireBiometric && biometricEnabled}
                  onValueChange={toggleRequireBiometric}
                  disabled={!settings.isEnabled || !biometricEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.requireBiometric ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Authentication Methods */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Authentication Methods</Text>
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
                    {settings.hasPinSet ? 'Change PIN' : 'Setup PIN'}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { 
                    color: settings.hasPinSet ? theme.colors.primary : theme.colors.textSecondary 
                  }]}>
                    {settings.hasPinSet ? 'Configured' : 'Not Set'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Ionicons name="finger-print" size={20} color={biometricEnabled ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.settingTitle, { 
                    color: settings.isEnabled ? theme.colors.text : theme.colors.textSecondary 
                  }]}>
                    Biometric Authentication
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { 
                    color: biometricEnabled ? theme.colors.primary : theme.colors.textSecondary 
                  }]}>
                    {biometricEnabled ? 'Available' : 'Not Available'}
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
                App lock helps protect your financial data when your device is unlocked. 
                We recommend enabling biometric authentication for the best balance of security and convenience.
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface + '80',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
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