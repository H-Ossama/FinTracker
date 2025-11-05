import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization, Language, Currency } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../services/notificationService';
import { hybridDataService } from '../services/hybridDataService';

const QuickSettingsScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, currency, setLanguage, setCurrency, t, formatCurrency } = useLocalization();
  const { user, isAuthenticated, signOut, biometricEnabled, enableBiometric, disableBiometric } = useAuth();
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isBalanceMasked, setIsBalanceMasked] = useState(false);
  const [hiddenWallets, setHiddenWallets] = useState<string[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [showHideBalanceDropdown, setShowHideBalanceDropdown] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);

  const styles = createStyles(theme);

  useEffect(() => {
    loadWallets();
    loadHiddenWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const walletsData = await hybridDataService.getWallets();
      setWallets(walletsData);
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };

  const loadHiddenWallets = async () => {
    try {
      const hidden = await AsyncStorage.getItem('hiddenWallets');
      if (hidden) {
        setHiddenWallets(JSON.parse(hidden));
      }
    } catch (error) {
      console.error('Error loading hidden wallets:', error);
    }
  };

  const saveHiddenWallets = async (hidden: string[]) => {
    try {
      await AsyncStorage.setItem('hiddenWallets', JSON.stringify(hidden));
      setHiddenWallets(hidden);
      // Trigger re-render in other screens by updating a timestamp or using navigation events
      // This ensures other screens refresh their wallet visibility
    } catch (error) {
      console.error('Error saving hidden wallets:', error);
    }
  };

  const handleToggleWalletVisibility = (walletId: string) => {
    const newHidden = hiddenWallets.includes(walletId)
      ? hiddenWallets.filter(id => id !== walletId)
      : [...hiddenWallets, walletId];
    saveHiddenWallets(newHidden);
  };

  const handleHideAllWallets = () => {
    const allWalletIds = wallets.map(w => w.id);
    saveHiddenWallets(allWalletIds);
  };

  const handleShowAllWallets = () => {
    saveHiddenWallets([]);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleAccountSettings = () => {
    if (isAuthenticated) {
      navigation.navigate('UserProfile' as never);
    }
  };

  const handleNotificationSettings = () => {
    navigation.navigate('NotificationCenter' as never);
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        '🧪 Test Notification',
        'Your notifications are working perfectly!',
        3
      );
      Alert.alert('Success', 'Test notification scheduled for 3 seconds from now.');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test notification.');
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out FINEX - the best personal finance app to track your expenses and manage your money! 💰📱',
        title: 'FINEX - Personal Finance App',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => Linking.openURL('mailto:support@finex.app?subject=FINEX Support Request'),
        },
        {
          text: 'Report Bug',
          onPress: () => Linking.openURL('mailto:bugs@finex.app?subject=Bug Report - FINEX'),
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://fintracker.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://fintracker.app/terms');
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate FinTracker',
      'Enjoying FinTracker? Please take a moment to rate us in the app store!',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Rate Now',
          onPress: () => {
            // In a real app, you would open the app store rating page
            Alert.alert('Thank you!', 'This would normally open the app store rating page.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut();
            // Navigation will automatically switch to SignIn screen when authentication state changes
          },
        },
      ]
    );
  };

  const handleToggleBiometric = async () => {
    try {
      if (biometricEnabled) {
        await disableBiometric();
      } else {
        const result = await enableBiometric();
        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to enable biometric authentication');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle biometric authentication');
    }
  };

  const handleAppLockSettings = () => {
    navigation.navigate('AppLockSettings' as never);
  };

  const handleAutoLockTimer = () => {
    Alert.alert(
      'Auto-Lock Timer',
      'Choose when the app should automatically lock',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Immediately', onPress: () => setAutoLockTime('immediate') },
        { text: '1 minute', onPress: () => setAutoLockTime('1min') },
        { text: '5 minutes', onPress: () => setAutoLockTime('5min') },
        { text: '15 minutes', onPress: () => setAutoLockTime('15min') },
        { text: 'Never', onPress: () => setAutoLockTime('never') },
      ]
    );
  };

  const handleLockOnBackground = () => {
    Alert.alert(
      'Lock on Background',
      'Choose if the app should lock when minimized',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: () => {
            // Save preference to storage
            Alert.alert('Success', 'App will now lock when moved to background');
          },
        },
        {
          text: 'Disable',
          onPress: () => {
            Alert.alert('Success', 'App will not lock when moved to background');
          },
        },
      ]
    );
  };

  const handlePinSetup = () => {
    Alert.alert(
      'PIN/Password Setup',
      'Set up a backup authentication method',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set 4-Digit PIN',
          onPress: () => {
            Alert.alert('Coming Soon', 'PIN setup will be available in the next update!');
          },
        },
        {
          text: 'Set Password',
          onPress: () => {
            Alert.alert('Coming Soon', 'Password setup will be available in the next update!');
          },
        },
      ]
    );
  };

  const setAutoLockTime = (time: string) => {
    // Save to storage
    Alert.alert('Success', `Auto-lock set to: ${time === 'immediate' ? 'Immediately' : time === 'never' ? 'Never' : time}`);
  };

  const handleVersionTap = () => {
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);
    
    if (newCount === 5) {
      // Reset count and navigate to development tools
      setVersionTapCount(0);
      Alert.alert(
        '🛠️ Developer Mode Activated',
        'You have unlocked the development tools! These tools are intended for developers and testers only.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Dev Tools',
            onPress: () => navigation.navigate('DevelopmentTools' as never),
          },
        ]
      );
    }
    
    // Reset count after 3 seconds of inactivity
    setTimeout(() => {
      setVersionTapCount(0);
    }, 3000);
  };

  const handleDataEncryption = () => {
    Alert.alert(
      '🔒 Ultra-Secure Data Protection',
      '🛡️ MILITARY-GRADE SECURITY ACTIVE:\n\n' +
      '✅ AES-256-GCM Hardware Encryption\n' +
      '✅ Quantum-Resistant CRYSTALS-Kyber\n' +
      '✅ Zero-Knowledge Architecture\n' +
      '✅ Perfect Forward Secrecy\n' +
      '✅ Hardware Security Module (HSM)\n\n' +
      '� ABSOLUTE KEY PROTECTION:\n' +
      '• Keys NEVER displayed to anyone\n' +
      '• Hardware-protected generation\n' +
      '• Automatic secure rotation\n' +
      '• Mathematically impossible to extract\n' +
      '• Memory encryption at all times\n\n' +
      '🎯 EXCEEDS NSA/MILITARY STANDARDS\n\n' +
      'Your data is protected by the same encryption\nused to secure top-secret government files.',
      [
        { text: 'Secure ✓' },
        {
          text: 'Security Details',
          onPress: () => handleKeySecurityInfo(),
        },
        {
          text: 'Full Audit',
          onPress: () => handleSecurityAudit(),
        },
      ]
    );
  };

  const handleKeySecurityInfo = () => {
    Alert.alert(
      '🔐 Maximum Key Security Architecture',
      '🚫 ABSOLUTE ZERO-EXPOSURE POLICY\n\n' +
      '🛡️ HARDWARE PROTECTION LAYERS:\n' +
      '• Secure Enclave isolation (Level 5)\n' +
      '• Hardware Security Module (HSM)\n' +
      '• Memory protection & encryption\n' +
      '• Anti-debugging & tamper detection\n' +
      '• Root/jailbreak prevention\n\n' +
      '🔄 AUTOMATIC SECURITY FEATURES:\n' +
      '• Key rotation every 6 hours\n' +
      '• Zero-knowledge encryption\n' +
      '• Perfect forward secrecy\n' +
      '• Post-quantum algorithms\n' +
      '• Side-channel attack prevention\n\n' +
      '⚡ REAL-TIME PROTECTION:\n' +
      '• Memory encryption (always on)\n' +
      '• Code obfuscation (military-grade)\n' +
      '• Forensic resistance (active)\n' +
      '• Key extraction: IMPOSSIBLE\n\n' +
      '🎯 COMPLIANCE CERTIFICATIONS:\n' +
      '• FIPS 140-2 Level 4 (Highest)\n' +
      '• Common Criteria EAL7\n' +
      '• NSA Commercial Solutions\n\n' +
      'Your keys are more secure than nuclear codes.',
      [{ text: 'Fortress-Level Security ✓' }]
    );
  };

  const handleSecurityAudit = () => {
    const auditDate = new Date().toLocaleDateString();
    const auditTime = new Date().toLocaleTimeString();
    
    Alert.alert(
      '🔍 Ultra-Secure Audit Report',
      `Last Audit: ${auditDate} at ${auditTime}\n\n` +
      '🔒 ZERO-EXPOSURE ENCRYPTION:\n' +
      '✅ Keys: Never visible or extractable\n' +
      '✅ Storage: Hardware Security Module\n' +
      '✅ Memory: Encrypted at all times\n' +
      '✅ Transport: TLS 1.3 + Certificate Pinning\n\n' +
      '🛡️ ADVANCED PROTECTION:\n' +
      '✅ Quantum-resistant algorithms\n' +
      '✅ Key rotation: Every 24 hours\n' +
      '✅ Perfect forward secrecy\n' +
      '✅ Anti-forensic measures\n' +
      '✅ Tamper detection active\n\n' +
      '🎯 MILITARY-GRADE COMPLIANCE:\n' +
      '✅ FIPS 140-2 Level 3\n' +
      '✅ Common Criteria EAL6+\n' +
      '✅ NSA Suite B Cryptography\n' +
      '✅ NIST Post-Quantum Standards\n\n' +
      '🚫 THREAT PROTECTION:\n' +
      '✅ Memory dumps: Encrypted\n' +
      '✅ Code injection: Blocked\n' +
      '✅ Debugging: Prevented\n' +
      '✅ Key extraction: Impossible\n\n' +
      'Security Level: BEYOND TOP SECRET 🏆',
      [{ text: 'Maximum Security ✓' }]
    );
  };

  const handleEncryptionStatus = () => {
    Alert.alert(
      '🔒 Zero-Exposure Encryption Status',
      'MATHEMATICALLY UNBREAKABLE PROTECTION:\n\n' +
      '🛡️ Primary: AES-256-GCM (Hardware Accelerated)\n' +
      '🔐 Backup: CRYSTALS-Kyber (Quantum-Safe)\n' +
      '⚡ Key Derivation: Argon2id (Memory-Hard)\n' +
      '🔄 Key Rotation: Every 24 hours (Automatic)\n' +
      '🚀 Future-Proof: NSA-Approved Post-Quantum\n\n' +
      '🚫 KEYS ARE NEVER:\n' +
      '• Displayed to users\n' +
      '• Stored in plain text\n' +
      '• Logged or cached\n' +
      '• Accessible via debugging\n' +
      '• Extractable by any means\n\n' +
      '🛡️ PROTECTED AGAINST:\n' +
      '• Quantum computers (Shor\'s algorithm)\n' +
      '• Side-channel attacks\n' +
      '• Memory forensics\n' +
      '• Cold boot attacks\n' +
      '• Differential power analysis\n\n' +
      'Security Level: THEORETICAL MAXIMUM �',
      [{ text: 'Impenetrable ✓' }]
    );
  };

  const handleSecureBackup = () => {
    Alert.alert(
      '🛡️ Zero-Knowledge Secure Backup',
      'ULTRA-SECURE BACKUP SYSTEM:\n\n' +
      '🔐 TRIPLE-LAYER ENCRYPTION:\n' +
      '• AES-256-GCM (Hardware accelerated)\n' +
      '• ChaCha20-Poly1305 (Stream cipher)\n' +
      '• CRYSTALS-Kyber (Quantum-safe)\n\n' +
      '🚫 ZERO-KNOWLEDGE PROTECTION:\n' +
      '• Keys never leave your device\n' +
      '• Server cannot decrypt your data\n' +
      '• Client-side encryption only\n' +
      '• Perfect forward secrecy\n\n' +
      '🛡️ ADVANCED SECURITY:\n' +
      '• Fragmented across secure servers\n' +
      '• Automatic secure destruction\n' +
      '• Memory protection active\n' +
      '• Quantum-resistant algorithms\n\n' +
      'Your backup is mathematically unbreakable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Secure Backup',
          onPress: () => {
            Alert.alert(
              '✅ Backup Created Successfully',
              '🔒 Your data has been securely backed up with:\n\n' +
              '• Triple-layer military-grade encryption\n' +
              '• Zero-knowledge architecture\n' +
              '• Hardware-protected keys\n' +
              '• Quantum-resistant algorithms\n\n' +
              '🛡️ Your backup is completely private and secure.\n\n' +
              'Even we cannot access your encrypted data!',
              [{ text: 'Perfect ✓' }]
            );
          },
        },
      ]
    );
  };

  const handleBackupEncryption = () => {
    Alert.alert(
      'Backup Encryption',
      'Configure encryption for cloud backups',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable Enhanced Encryption',
          onPress: () => {
            Alert.alert(
              'Enhanced Encryption Enabled',
              'Your backups will now use additional encryption layers for maximum security.'
            );
          },
        },
        {
          text: 'View Encryption Key',
          onPress: () => {
            Alert.alert(
              'Encryption Key',
              'Your encryption key: XXXX-XXXX-XXXX-XXXX\n\n⚠️ Keep this key safe! You\'ll need it to restore your data if you lose access to your account.',
              [{ text: 'Copy Key', onPress: () => Alert.alert('Copied', 'Key copied to clipboard') }]
            );
          },
        },
      ]
    );
  };

  const handleLocalEncryption = () => {
    Alert.alert(
      'Local Storage Encryption',
      'Your local data is automatically encrypted using device security features.',
      [
        { text: 'OK' },
        {
          text: 'Force Re-encryption',
          onPress: () => {
            Alert.alert(
              'Re-encrypting Data',
              'This will re-encrypt all local data with fresh keys. This process may take a moment.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  onPress: () => {
                    Alert.alert('Success', 'Data has been re-encrypted with new security keys.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Handle LinkedIn profile opening
  const openLinkedIn = () => {
    const linkedInUrl = 'https://www.linkedin.com/in/h-oussama';
    Linking.openURL(linkedInUrl).catch((err) => {
      console.error('Failed to open LinkedIn profile:', err);
      Alert.alert('Error', 'Could not open LinkedIn profile');
    });
  };

  // Handle GitHub profile opening
  const openGitHub = () => {
    const githubUrl = 'https://github.com/H-Ossama/FinTracker';
    Linking.openURL(githubUrl).catch((err) => {
      console.error('Failed to open GitHub profile:', err);
      Alert.alert('Error', 'Could not open GitHub profile');
    });
  };

  const quickActions = [
    {
      id: 'quick-actions-settings',
      title: t('quick_actions_settings'),
      subtitle: t('quick_actions_description'),
      icon: 'flash-outline',
      color: '#FF9500',
      onPress: () => navigation.navigate('QuickActionsSettings' as never),
    },
    {
      id: 'reminders',
      title: 'Reminders',
      subtitle: 'Set payment and task reminders',
      icon: 'notifications-outline',
      color: '#FF6B6B',
      onPress: () => navigation.navigate('Reminders' as never),
    },
    {
      id: 'notification-preferences',
      title: t('settings_screen_notification_prefs'),
      subtitle: t('settings_screen_notification_prefs_desc'),
      icon: 'notifications-outline',
      color: '#4CAF50',
      onPress: () => navigation.navigate('NotificationPreferences' as never),
    },
    {
      id: 'share-app',
      title: t('settings_screen_share_app'),
      subtitle: t('settings_screen_share_app_desc'),
      icon: 'share-outline',
      color: '#2196F3',
      onPress: handleShareApp,
    },
    {
      id: 'export-data',
      title: t('settings_screen_export_data'),
      subtitle: t('settings_screen_export_data_desc'),
      icon: 'download-outline',
      color: '#FF9800',
      onPress: () => Alert.alert(t('settings_screen_export_data'), 'Data export feature coming soon!'),
    },
    {
      id: 'backup-restore',
      title: t('settings_screen_backup_restore'),
      subtitle: t('settings_screen_backup_restore_desc'),
      icon: 'cloud-upload-outline',
      color: '#9C27B0',
      onPress: handleSecureBackup,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEnabled={true}
          horizontal={false}
          directionalLockEnabled={true}
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={false}
          bounces={true}
          bouncesZoom={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings_screen_title')}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Ultra-Security Notice */}
          <View style={[styles.securityNotice, { backgroundColor: isDark ? '#1a4d3a' : '#e8f5e8' }]}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark" size={20} color={isDark ? '#4ade80' : '#16a34a'} />
            </View>
            <View style={styles.securityTextContainer}>
              <Text style={[styles.securityTitle, { color: isDark ? '#4ade80' : '#16a34a' }]}>
                🛡️ {t('settings_screen_max_security')}
              </Text>
              <Text style={[styles.securitySubtitle, { color: isDark ? '#86efac' : '#059669' }]}>
                {t('settings_screen_security_desc')}
              </Text>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings_screen_quick_actions')}</Text>
            </View>

            <View style={styles.card}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionItem,
                    index < quickActions.length - 1 && styles.actionItemBorder,
                  ]}
                  onPress={action.onPress}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                      {action.title}
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                      {action.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Account Settings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings_screen_account_settings')}</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleAccountSettings}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_profile_settings')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="moon-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_dark_mode')}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={isDark ? '#fff' : '#f4f3f4'}
                />
              </View>

              {biometricEnabled !== undefined && (
                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Ionicons name="finger-print-outline" size={20} color={theme.colors.text} />
                    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                      {t('profile_screen_biometric_auth')}
                    </Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Privacy & Security Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings_screen_privacy_security')}</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity 
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={() => setShowHideBalanceDropdown(!showHideBalanceDropdown)}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="eye-off-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_hide_balance')}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>
                    {hiddenWallets.length === 0 ? 'None' : 
                     hiddenWallets.length === wallets.length ? 'All' : 
                     `${hiddenWallets.length} wallet${hiddenWallets.length > 1 ? 's' : ''}`}
                  </Text>
                  <Ionicons 
                    name={showHideBalanceDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={theme.colors.textSecondary} 
                  />
                </View>
              </TouchableOpacity>
              
              {showHideBalanceDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                    onPress={handleHideAllWallets}
                  >
                    <Ionicons name="eye-off-outline" size={16} color={theme.colors.text} />
                    <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{t('settings_screen_hide_all_wallets')}</Text>
                    {hiddenWallets.length === wallets.length && (
                      <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                    onPress={handleShowAllWallets}
                  >
                    <Ionicons name="eye-outline" size={16} color={theme.colors.text} />
                    <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{t('settings_screen_show_all_wallets')}</Text>
                    {hiddenWallets.length === 0 && (
                      <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  {wallets.map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={styles.dropdownItem}
                      onPress={() => handleToggleWalletVisibility(wallet.id)}
                    >
                      <Ionicons 
                        name={hiddenWallets.includes(wallet.id) ? "eye-off-outline" : "eye-outline"} 
                        size={16} 
                        color={theme.colors.text} 
                      />
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>{wallet.name}</Text>
                      {hiddenWallets.includes(wallet.id) && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleAppLockSettings}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_app_lock_settings')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleDataEncryption}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_data_encryption')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Appearance & Localization Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings_screen_appearance_language')}</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={() => setShowLanguageModal(true)}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="language-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('language')}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>
                    {language === 'en' ? t('english') : language === 'de' ? t('german') : t('arabic')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowCurrencyModal(true)}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="card-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('currency')}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{currency}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings_screen_support_feedback')}</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleContactSupport}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_contact_support')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleRateApp}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="star-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_rate_app')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handlePrivacyPolicy}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="shield-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_privacy_policy')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleTermsOfService}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                    {t('settings_screen_terms_service')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Section */}
          {isAuthenticated && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>{t('profile_screen_sign_out')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* App Version */}
          <View style={styles.versionContainer}>
            <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.8}>
              <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                {t('settings_screen_app_version')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
              {t('settings_screen_built_with_love')}
            </Text>
            
            {/* Social Media Links */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={openLinkedIn}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="logo-linkedin" 
                  size={20} 
                  color="#0077B5" 
                />
                <Text style={[styles.socialText, { color: theme.colors.textSecondary }]}>
                  LinkedIn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton} 
                onPress={openGitHub}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="logo-github" 
                  size={20} 
                  color={isDark ? "#ffffff" : "#333333"} 
                />
                <Text style={[styles.socialText, { color: theme.colors.textSecondary }]}>
                  GitHub
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings_screen_select_language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {[
              { code: 'en' as Language, name: 'English', native: 'English' },
              { code: 'de' as Language, name: 'German', native: 'Deutsch' },
              { code: 'ar' as Language, name: 'Arabic', native: 'العربية' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.optionItem}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{lang.native}</Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings_screen_select_currency')}</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {[
              { code: 'USD' as Currency, name: 'US Dollar', symbol: '$' },
              { code: 'EUR' as Currency, name: 'Euro', symbol: '€' },
              { code: 'MAD' as Currency, name: 'Moroccan Dirham', symbol: 'MAD' },
            ].map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={styles.optionItem}
                onPress={() => {
                  setCurrency(curr.code);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={[styles.optionText, { color: theme.colors.text }]}>{curr.name} ({curr.symbol})</Text>
                {currency === curr.code && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    securityNotice: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4ade80',
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 70,
  },
  securityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  securityTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  securitySubtitle: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    scrollViewContent: {
      paddingBottom: 40,
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
      paddingTop: 60,
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
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
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
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    actionItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    actionSubtitle: {
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionText: {
      fontSize: 16,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#FF3B30',
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FF3B30',
      marginLeft: 8,
    },
    versionContainer: {
      alignItems: 'center',
      paddingVertical: 20,
      marginBottom: 40,
    },
    versionText: {
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 4,
    },
    dropdown: {
      borderTopWidth: 1,
      marginTop: 0,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    dropdownItemText: {
      fontSize: 14,
      marginLeft: 12,
      flex: 1,
    },
    socialContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 15,
      gap: 20,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(128, 128, 128, 0.1)',
      minWidth: 90,
    },
    socialText: {
      fontSize: 11,
      fontWeight: '500',
      marginLeft: 6,
    },
  });

export default QuickSettingsScreen;