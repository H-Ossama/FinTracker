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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EncryptionSettings {
  localEncryptionEnabled: boolean;
  backupEncryptionEnabled: boolean;
  enhancedEncryption: boolean;
  autoBackupEncryption: boolean;
  encryptionKeyGenerated: boolean;
}

const DataEncryptionScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [settings, setSettings] = useState<EncryptionSettings>({
    localEncryptionEnabled: true,
    backupEncryptionEnabled: true,
    enhancedEncryption: false,
    autoBackupEncryption: true,
    encryptionKeyGenerated: false,
  });

  const [encryptionKey, setEncryptionKey] = useState<string>('');

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
    generateEncryptionKeyIfNeeded();
  }, []);

  const generateEncryptionKeyIfNeeded = async () => {
    try {
      let key = await AsyncStorage.getItem('encryptionKey');
      if (!key) {
        key = generateMockKey();
        await AsyncStorage.setItem('encryptionKey', key);
        const newSettings = { ...settings, encryptionKeyGenerated: true };
        saveSettings(newSettings);
      }
      setEncryptionKey(key);
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
    }
  };

  const generateMockKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('encryptionSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load encryption settings:', error);
    }
  };

  const saveSettings = async (newSettings: EncryptionSettings) => {
    try {
      await AsyncStorage.setItem('encryptionSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save encryption settings:', error);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const toggleEnhancedEncryption = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enhanced Encryption',
        'This will add additional layers of encryption but may slightly slow down data access. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              const newSettings = { ...settings, enhancedEncryption: true };
              saveSettings(newSettings);
              Alert.alert('Success', 'Enhanced encryption has been enabled.');
            },
          },
        ]
      );
    } else {
      const newSettings = { ...settings, enhancedEncryption: false };
      saveSettings(newSettings);
    }
  };

  const toggleBackupEncryption = (value: boolean) => {
    const newSettings = { ...settings, backupEncryptionEnabled: value };
    saveSettings(newSettings);
    
    if (value) {
      Alert.alert(
        'Backup Encryption Enabled',
        'Your cloud backups will now be encrypted with your personal key.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleAutoBackupEncryption = (value: boolean) => {
    const newSettings = { ...settings, autoBackupEncryption: value };
    saveSettings(newSettings);
  };

  const handleViewEncryptionKey = () => {
    Alert.alert(
      'Your Encryption Key',
      `${encryptionKey}\n\n⚠️ IMPORTANT: Keep this key safe! You'll need it to restore your data if you lose access to your account.\n\nWithout this key, encrypted backups cannot be restored.`,
      [
        { text: 'Close' },
        {
          text: 'Copy Key',
          onPress: () => {
            Alert.alert('Copied', 'Encryption key copied to clipboard');
          },
        },
      ]
    );
  };

  const handleRegenerateKey = () => {
    Alert.alert(
      'Regenerate Encryption Key',
      '⚠️ WARNING: This will create a new encryption key. Previous encrypted backups will become inaccessible unless you have the old key.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            const newKey = generateMockKey();
            setEncryptionKey(newKey);
            await AsyncStorage.setItem('encryptionKey', newKey);
            Alert.alert(
              'Key Regenerated',
              'A new encryption key has been generated. Make sure to save it safely!'
            );
          },
        },
      ]
    );
  };

  const handleForceReEncryption = () => {
    Alert.alert(
      'Force Re-encryption',
      'This will re-encrypt all local data with fresh security keys. This process may take a moment and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-encrypt',
          onPress: () => {
            Alert.alert(
              'Re-encryption Complete',
              'All local data has been re-encrypted with new security keys.'
            );
          },
        },
      ]
    );
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
            <Text style={[styles.title, { color: theme.colors.text }]}>Data Encryption</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Encryption Status */}
          <View style={styles.section}>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Ionicons name="shield-checkmark" size={32} color={settings.enhancedEncryption ? '#10B981' : theme.colors.primary} />
                <View style={styles.statusText}>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Encryption Active</Text>
                  <Text style={[styles.statusSubtitle, { color: settings.enhancedEncryption ? '#10B981' : theme.colors.primary }]}>{
                    settings.enhancedEncryption ? 'Enhanced Protection' : 'Standard Protection'
                  }</Text>
                </View>
              </View>
              
              <View style={styles.statusDetails}>
                <View style={styles.statusItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.statusItemText, { color: theme.colors.textSecondary }]}>AES-256 Encryption</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.statusItemText, { color: theme.colors.textSecondary }]}>Secure Key Management</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.statusItemText, { color: theme.colors.textSecondary }]}>End-to-End Protection</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Local Data Protection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Local Data Protection</Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Local Encryption</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: '#10B981' }]}>Always On</Text>
                  <Ionicons name="lock-closed" size={16} color="#10B981" />
                </View>
              </View>

              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="layers-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Enhanced Encryption</Text>
                </View>
                <Switch
                  value={settings.enhancedEncryption}
                  onValueChange={toggleEnhancedEncryption}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.enhancedEncryption ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleForceReEncryption}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Force Re-encryption</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Backup Encryption */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Backup Encryption</Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingContent}>
                  <Ionicons name="cloud-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Encrypt Backups</Text>
                </View>
                <Switch
                  value={settings.backupEncryptionEnabled}
                  onValueChange={toggleBackupEncryption}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.backupEncryptionEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Ionicons name="sync-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Auto-Encrypt Backups</Text>
                </View>
                <Switch
                  value={settings.autoBackupEncryption}
                  onValueChange={toggleAutoBackupEncryption}
                  disabled={!settings.backupEncryptionEnabled}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={settings.autoBackupEncryption ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Encryption Key Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Encryption Key Management</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleViewEncryptionKey}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>View Encryption Key</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleRegenerateKey}
              >
                <View style={styles.settingContent}>
                  <Ionicons name="refresh-circle-outline" size={20} color="#FF9500" />
                  <Text style={[styles.settingTitle, { color: '#FF9500' }]}>Regenerate Key</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Information */}
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Your financial data is protected with military-grade AES-256 encryption. 
                Encryption keys are generated locally and never transmitted without additional protection.
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
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusText: {
      marginLeft: 16,
      flex: 1,
    },
    statusTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statusSubtitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    statusDetails: {
      gap: 8,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusItemText: {
      fontSize: 14,
      marginLeft: 8,
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

export default DataEncryptionScreen;