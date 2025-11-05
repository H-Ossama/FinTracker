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
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  const { headerPadding } = useSafeAreaHelper();
  const [syncStatus, setSyncStatus] = useState({
    enabled: false,
    authenticated: false,
    lastSync: null as Date | null,
    unsyncedItems: 0,
    nextReminderDue: null as Date | null,
  });
  
  // Auto-sync settings state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncPeriod, setAutoSyncPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<'hours' | 'days' | 'weeks'>('days');
  const [syncRemindersDisabled, setSyncRemindersDisabled] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncOverview, setSyncOverview] = useState<{
    wallets: number;
    transactions: number;
    categories: number;
    totalItems: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadSyncStatus();
    }
  }, [visible]);

  const loadSyncStatus = async () => {
    try {
      const status = await hybridDataService.getSyncStatus();
      setSyncStatus(status);
      
      // Load auto-sync settings
      const autoSyncSettings = await hybridDataService.getAutoSyncSettings();
      setAutoSyncEnabled(autoSyncSettings?.enabled || false);
      setAutoSyncPeriod(autoSyncSettings?.period || 'weekly');
      setCustomInterval(autoSyncSettings?.customInterval || 1);
      setCustomUnit(autoSyncSettings?.customUnit || 'days');

      // Load sync overview data
      if (user) {
        const overview = await hybridDataService.getSyncOverview();
        setSyncOverview(overview);
      }

      // Load sync reminders disabled setting
      const remindersDisabled = await hybridDataService.areSyncRemindersDisabled();
      setSyncRemindersDisabled(remindersDisabled);
    } catch (error) {
      console.error('Error loading sync status:', error);
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

  const handleEnableSyncAndSync = async () => {
    console.log('🚀 Starting enable sync and sync process');
    if (!user) {
      console.log('❌ No user found for sync');
      Alert.alert('Error', 'Please sign in to sync your data');
      return;
    }

    console.log('👤 User found:', user.email, 'Google user:', user.isGoogleUser);
    setIsLoading(true);
    try {
      console.log('🔄 Enabling cloud sync...');
      // First enable cloud sync
      const enableResult = await hybridDataService.enableCloudSyncForExistingUser(user);
      console.log('📋 Enable result:', enableResult);
      
      if (enableResult.success) {
        console.log('✅ Cloud sync enabled, reloading status...');
        // Reload sync status to reflect the enabled state
        await loadSyncStatus();
        
        console.log('🔄 Starting manual sync...');
        // Now perform the sync
        setShowProgress(true);
        const syncResult = await hybridDataService.performManualSync((progress) => {
          console.log('📊 Sync progress:', progress);
          setSyncProgress(progress);
        });
        console.log('📋 Sync result:', syncResult);

        if (syncResult.success) {
          // Show detailed sync results
          const syncData = syncResult.syncedData;
          let message = 'Cloud sync enabled and data synced successfully!\\n\\n';
          
          if (syncData) {
            message += `✅ Synced Items:\\n`;
            if (syncData.wallets > 0) message += `• ${syncData.wallets} wallet(s)\\n`;
            if (syncData.transactions > 0) message += `• ${syncData.transactions} transaction(s)\\n`;
            if (syncData.categories > 0) message += `• ${syncData.categories} categor${syncData.categories === 1 ? 'y' : 'ies'}\\n`;
            
            const totalItems = syncData.wallets + syncData.transactions + syncData.categories;
            if (totalItems === 0) {
              message += '• All data is already up to date\\n';
            }
            
            if (syncData.errors && syncData.errors.length > 0) {
              message += `\\n⚠️ Warnings:\\n${syncData.errors.join('\\n')}`;
            }
            
            message += `\\n🕒 Synced at: ${new Date().toLocaleString()}`;
          }
          
          Alert.alert('Sync Complete', message);
          await loadSyncStatus();
          onSyncComplete?.();
        } else {
          Alert.alert('Sync Failed', syncResult.error || 'Sync failed after enabling cloud sync');
        }
      } else {
        console.log('❌ Enable sync failed:', enableResult.error);
        Alert.alert('Error', enableResult.error || 'Failed to enable cloud sync');
      }
    } catch (error) {
      console.error('❌ Error in handleEnableSyncAndSync:', error);
      Alert.alert('Error', `Failed to enable sync and sync data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setShowProgress(false);
      setSyncProgress(null);
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to sync your data');
      return;
    }

    setShowProgress(true);
    try {
      const result = await hybridDataService.performManualSync((progress) => {
        setSyncProgress(progress);
      });

      if (result.success) {
        // Show detailed sync results
        const syncData = result.syncedData;
        let message = 'Sync completed successfully!\\n\\n';
        
        if (syncData) {
          message += `✅ Synced Items:\\n`;
          if (syncData.wallets > 0) message += `• ${syncData.wallets} wallet(s)\\n`;
          if (syncData.transactions > 0) message += `• ${syncData.transactions} transaction(s)\\n`;
          if (syncData.categories > 0) message += `• ${syncData.categories} categor${syncData.categories === 1 ? 'y' : 'ies'}\\n`;
          
          const totalItems = syncData.wallets + syncData.transactions + syncData.categories;
          if (totalItems === 0) {
            message += '• All data is already up to date\\n';
          }
          
          if (syncData.errors && syncData.errors.length > 0) {
            message += `\\n⚠️ Warnings:\\n${syncData.errors.join('\\n')}`;
          }
          
          message += `\\n🕒 Synced at: ${new Date().toLocaleString()}`;
        }
        
        Alert.alert('Sync Complete', message);
        await loadSyncStatus();
        onSyncComplete?.();
      } else {
        Alert.alert('Sync Failed', result.error || 'Unknown sync error');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      // Check if it's an authentication error
      if (error.message && error.message.includes('authenticated')) {
        Alert.alert(
          'Authentication Error', 
          'Your session has expired. Please sign out and sign back in to sync your data.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', onPress: () => {
              // You might want to add a sign out function here
              Alert.alert('Please sign out and sign back in from the main app.');
            }}
          ]
        );
      } else {
        Alert.alert('Error', 'Sync failed. Please try again.');
      }
    } finally {
      setShowProgress(false);
      setSyncProgress(null);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    if (enabled) {
      // If user is already authenticated in the app, enable sync directly
      if (user) {
        try {
          setIsLoading(true);
          
          // Enable cloud sync using existing user credentials
          const result = await hybridDataService.enableCloudSyncForExistingUser(user);
          
          if (result.success) {
            await loadSyncStatus();
            Alert.alert('Success', 'Cloud sync has been enabled for your account!');
          } else {
            Alert.alert('Error', result.error || 'Failed to enable sync');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to enable sync. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // This shouldn't happen if authentication is working correctly
        Alert.alert('Error', 'Please sign in to your account first');
      }
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

  const handleAutoSyncToggle = async (enabled: boolean) => {
    // Prevent enabling auto-sync if cloud sync is not enabled
    if (enabled && !syncStatus.enabled) {
      Alert.alert(
        'Cloud Sync Required',
        'Please enable cloud sync first before setting up auto-sync.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setAutoSyncEnabled(enabled);
      await hybridDataService.setAutoSyncSettings({
        enabled,
        period: autoSyncPeriod,
        customInterval,
        customUnit,
      });
      
      // Update sync reminder behavior
      if (enabled) {
        await hybridDataService.setSyncRemindersSuppressed(true);
      } else {
        await hybridDataService.setSyncRemindersSuppressed(false);
      }
    } catch (error) {
      console.error('Error updating auto-sync settings:', error);
    }
  };

  const handleAutoSyncPeriodChange = async (period: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    try {
      setAutoSyncPeriod(period);
      await hybridDataService.setAutoSyncSettings({
        enabled: autoSyncEnabled,
        period,
        customInterval,
        customUnit,
      });
    } catch (error) {
      console.error('Error updating auto-sync period:', error);
    }
  };

  const handleCustomIntervalChange = async (interval: number) => {
    if (interval < 1) return;
    try {
      setCustomInterval(interval);
      await hybridDataService.setAutoSyncSettings({
        enabled: autoSyncEnabled,
        period: autoSyncPeriod,
        customInterval: interval,
        customUnit,
      });
    } catch (error) {
      console.error('Error updating custom interval:', error);
    }
  };

  const handleCustomUnitChange = async (unit: 'hours' | 'days' | 'weeks') => {
    try {
      setCustomUnit(unit);
      await hybridDataService.setAutoSyncSettings({
        enabled: autoSyncEnabled,
        period: autoSyncPeriod,
        customInterval,
        customUnit: unit,
      });
    } catch (error) {
      console.error('Error updating custom unit:', error);
    }
  };

  const getAutoSyncDescription = () => {
    if (!autoSyncEnabled) return 'Manual sync only';
    
    switch (autoSyncPeriod) {
      case 'daily':
        return 'Syncs automatically every day';
      case 'weekly':
        return 'Syncs automatically every week';
      case 'monthly':
        return 'Syncs automatically every month';
      case 'custom':
        return `Syncs automatically every ${customInterval} ${customInterval === 1 ? customUnit.slice(0, -1) : customUnit}`;
      default:
        return 'Manual sync only';
    }
  };

  const handleSyncRemindersDisabledToggle = async (disabled: boolean) => {
    try {
      setSyncRemindersDisabled(disabled);
      await hybridDataService.setSyncRemindersDisabled(disabled);
      
      if (disabled) {
        // Show confirmation that popups are disabled
        Alert.alert(
          'Sync Reminders Disabled',
          'You will no longer see sync reminder popups. You can manually sync from the sync settings at any time.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating sync reminders disabled setting:', error);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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
                Sync your data across devices using your current account
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Enable Cloud Sync</Text>
                  <Text style={[styles.settingSubLabel, { color: theme.colors.textSecondary }]}>
                    {syncStatus.enabled
                      ? 'Syncing with your account'
                      : user ? 'Use your current account for sync' : 'Sign in required'}
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

            {/* Auto-Sync Settings Section */}
            {user && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Auto-Sync Settings</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                  {syncStatus.enabled 
                    ? "Automatically sync your data at regular intervals"
                    : "Configure automatic sync settings (available when sync is enabled)"}
                </Text>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: syncStatus.enabled ? theme.colors.text : theme.colors.textSecondary }]}>Enable Auto-Sync</Text>
                    <Text style={[styles.settingSubLabel, { color: theme.colors.textSecondary }]}>
                      {syncStatus.enabled 
                        ? getAutoSyncDescription()
                        : 'Available when cloud sync is enabled'}
                    </Text>
                  </View>
                  <Switch
                    value={autoSyncEnabled && syncStatus.enabled}
                    onValueChange={handleAutoSyncToggle}
                    disabled={isLoading || !syncStatus.enabled}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={(autoSyncEnabled && syncStatus.enabled) ? 'white' : theme.colors.textSecondary}
                  />
                </View>

                {autoSyncEnabled && syncStatus.enabled && (
                  <View style={styles.periodContainer}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text, marginBottom: 12 }]}>Sync Frequency</Text>
                    <View style={styles.periodOptions}>
                      {['daily', 'weekly', 'monthly', 'custom'].map((period) => (
                        <TouchableOpacity
                          key={period}
                          style={[
                            styles.periodOption,
                            {
                              backgroundColor: autoSyncPeriod === period ? theme.colors.primary : theme.colors.background,
                              borderColor: theme.colors.border,
                            },
                          ]}
                          onPress={() => handleAutoSyncPeriodChange(period as 'daily' | 'weekly' | 'monthly' | 'custom')}
                        >
                          <Text
                            style={[
                              styles.periodOptionText,
                              {
                                color: autoSyncPeriod === period ? 'white' : theme.colors.text,
                              },
                            ]}
                          >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Custom interval controls */}
                    {autoSyncPeriod === 'custom' && (
                      <View style={[styles.customIntervalContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <Text style={[styles.customIntervalLabel, { color: theme.colors.text }]}>Custom Interval</Text>
                        <View style={styles.customIntervalRow}>
                          <Text style={[styles.customIntervalText, { color: theme.colors.textSecondary }]}>Every</Text>
                          <TextInput
                            style={[
                              styles.customIntervalInput,
                              {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                                color: theme.colors.text,
                              },
                            ]}
                            value={customInterval.toString()}
                            onChangeText={(text) => {
                              const num = parseInt(text) || 1;
                              handleCustomIntervalChange(num);
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                            selectTextOnFocus
                            placeholder="1"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <View style={styles.customUnitOptions}>
                            {['hours', 'days', 'weeks'].map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.customUnitOption,
                                  {
                                    backgroundColor: customUnit === unit ? theme.colors.primary : 'transparent',
                                    borderColor: customUnit === unit ? theme.colors.primary : theme.colors.border,
                                  },
                                ]}
                                onPress={() => handleCustomUnitChange(unit as 'hours' | 'days' | 'weeks')}
                              >
                                <Text
                                  style={[
                                    styles.customUnitText,
                                    {
                                      color: customUnit === unit ? 'white' : theme.colors.text,
                                    },
                                  ]}
                                >
                                  {unit}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        
                        {/* Validation warning for very frequent syncs */}
                        {customUnit === 'hours' && customInterval < 4 && (
                          <View style={[styles.warningNote, { backgroundColor: theme.isDark ? 'rgba(255, 193, 7, 0.1)' : '#fff9c4' }]}>
                            <Ionicons name="warning" size={16} color="#FFC107" />
                            <Text style={[styles.warningNoteText, { color: theme.colors.textSecondary }]}>
                              Very frequent syncing may drain battery faster
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    
                    {autoSyncEnabled && syncStatus.enabled && (
                      <View style={[styles.infoNote, { backgroundColor: theme.isDark ? 'rgba(76, 175, 80, 0.1)' : '#f0f9f0' }]}>
                        <Ionicons name="information-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.infoNoteText, { color: theme.colors.textSecondary }]}>
                          Sync reminders are disabled while auto-sync is enabled
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Show helpful note when sync is disabled */}
                {!syncStatus.enabled && (
                  <View style={[styles.infoNote, { backgroundColor: theme.isDark ? 'rgba(33, 150, 243, 0.1)' : '#e3f2fd' }]}>
                    <Ionicons name="information-circle" size={16} color="#2196F3" />
                    <Text style={[styles.infoNoteText, { color: theme.colors.textSecondary }]}>
                      Enable cloud sync above to use auto-sync features
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Sync Notifications Section */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Sync Notifications</Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                Control how and when you receive sync reminder notifications
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Disable Sync Reminders</Text>
                  <Text style={[styles.settingSubLabel, { color: theme.colors.textSecondary }]}>
                    {syncRemindersDisabled
                      ? 'Sync reminder popups are hidden'
                      : 'You\'ll see reminders when sync is needed'}
                  </Text>
                </View>
                <Switch
                  value={syncRemindersDisabled}
                  onValueChange={handleSyncRemindersDisabledToggle}
                  disabled={isLoading}
                  trackColor={{ false: theme.colors.border, true: '#FF6B6B' }}
                  thumbColor={syncRemindersDisabled ? 'white' : theme.colors.textSecondary}
                />
              </View>

              {syncRemindersDisabled && (
                <View style={[styles.infoNote, { backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.1)' : '#ffebee' }]}>
                  <Ionicons name="notifications-off" size={16} color="#FF6B6B" />
                  <Text style={[styles.infoNoteText, { color: theme.colors.textSecondary }]}>
                    Sync reminder popups are disabled. You can still sync manually from this settings screen.
                  </Text>
                </View>
              )}
            </View>

            {/* Sync Overview Section */}
            {user && syncOverview && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>What Will Be Synced</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                  {syncStatus.enabled 
                    ? "Overview of your data that will be synced to the cloud" 
                    : "Preview of data that would be synced when you enable cloud sync"}
                </Text>

                <View style={styles.syncOverviewGrid}>
                  <View style={[styles.syncOverviewItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={[styles.syncOverviewIcon, { backgroundColor: theme.isDark ? 'rgba(76, 175, 80, 0.2)' : '#e8f5e8' }]}>
                      <Ionicons name="wallet" size={20} color="#4CAF50" />
                    </View>
                    <Text style={[styles.syncOverviewCount, { color: theme.colors.text }]}>{syncOverview.wallets}</Text>
                    <Text style={[styles.syncOverviewLabel, { color: theme.colors.textSecondary }]}>
                      Wallet{syncOverview.wallets !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={[styles.syncOverviewItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={[styles.syncOverviewIcon, { backgroundColor: theme.isDark ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd' }]}>
                      <Ionicons name="receipt" size={20} color="#2196F3" />
                    </View>
                    <Text style={[styles.syncOverviewCount, { color: theme.colors.text }]}>{syncOverview.transactions}</Text>
                    <Text style={[styles.syncOverviewLabel, { color: theme.colors.textSecondary }]}>
                      Transaction{syncOverview.transactions !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={[styles.syncOverviewItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={[styles.syncOverviewIcon, { backgroundColor: theme.isDark ? 'rgba(255, 152, 0, 0.2)' : '#fff3e0' }]}>
                      <Ionicons name="pricetag" size={20} color="#FF9800" />
                    </View>
                    <Text style={[styles.syncOverviewCount, { color: theme.colors.text }]}>{syncOverview.categories}</Text>
                    <Text style={[styles.syncOverviewLabel, { color: theme.colors.textSecondary }]}>
                      Categor{syncOverview.categories !== 1 ? 'ies' : 'y'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.syncOverviewSummary, { backgroundColor: theme.isDark ? 'rgba(103, 58, 183, 0.1)' : '#f3e5f5' }]}>
                  <Ionicons name="cloud-upload" size={20} color="#673AB7" />
                  <Text style={[styles.syncOverviewSummaryText, { color: theme.colors.text }]}>
                    Total: {syncOverview.totalItems} item{syncOverview.totalItems !== 1 ? 's' : ''} {syncStatus.enabled ? 'ready to sync' : 'available for sync'}
                  </Text>
                </View>

                {/* Last sync info - only show if sync is enabled */}
                {syncStatus.enabled && (
                  <View style={[styles.lastSyncInfo, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={styles.lastSyncRow}>
                      <Text style={[styles.lastSyncLabel, { color: theme.colors.textSecondary }]}>Last Sync:</Text>
                      <Text style={[styles.lastSyncValue, { color: theme.colors.text }]}>{formatDate(syncStatus.lastSync)}</Text>
                    </View>
                    {syncStatus.unsyncedItems > 0 && (
                      <View style={styles.lastSyncRow}>
                        <Text style={[styles.lastSyncLabel, { color: theme.colors.textSecondary }]}>Unsynced Items:</Text>
                        <Text style={[styles.lastSyncValue, { color: '#FF6B6B' }]}>{syncStatus.unsyncedItems}</Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={syncStatus.enabled ? handleManualSync : handleEnableSyncAndSync}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name={syncStatus.enabled ? "sync" : "cloud-upload"} size={20} color="white" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>{syncStatus.enabled ? "Sync Now" : "Enable Sync & Sync Now"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Account Section */}
            {syncStatus.enabled && user && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
                
                <View style={styles.accountInfo}>
                  <View style={styles.userProfile}>
                    {user.avatar ? (
                      <View style={[styles.avatarContainer, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: theme.colors.text }]}>{user.name}</Text>
                      <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user.email}</Text>
                      {user.isGoogleUser && (
                        <View style={styles.providerBadge}>
                          <Ionicons name="logo-google" size={12} color="#4285F4" />
                          <Text style={[styles.providerText, { color: theme.colors.textSecondary }]}>Google Account</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.statusText, { color: '#4CAF50', fontSize: 14 }]}>
                      {syncStatus.enabled ? 'Sync Enabled' : 'Sync Disabled'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
                    onPress={handleLogout}
                    disabled={isLoading}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Logout</Text>
                  </TouchableOpacity>
                </View>
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
                    When sync is enabled, data is securely backed up to the cloud
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="sync" size={20} color="#2196F3" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Auto-sync can run hourly, daily, weekly, monthly, or on custom intervals
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="notifications" size={20} color="#FF9800" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Smart reminders only appear when you have unsynced data and sync is disabled
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="notifications-off" size={20} color="#FF6B6B" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    You can completely disable sync reminders if you prefer manual sync only
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="eye" size={20} color="#9C27B0" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    See exactly what data will be synced before starting the sync process
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    All data is encrypted and secure during transmission and storage
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  periodContainer: {
    marginTop: 16,
  },
  periodOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  infoNoteText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerText: {
    fontSize: 12,
  },
  customIntervalContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  customIntervalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customIntervalText: {
    fontSize: 16,
  },
  customIntervalInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 60,
    maxWidth: 80,
  },
  customUnitOptions: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  customUnitOption: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  customUnitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningNoteText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  syncOverviewGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  syncOverviewItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncOverviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncOverviewCount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  syncOverviewLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  syncOverviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncOverviewSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastSyncInfo: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  lastSyncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastSyncLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSyncValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SyncSettingsModal;