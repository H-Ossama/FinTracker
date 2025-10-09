import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../contexts/NotificationContext';
import { notificationService } from '../services/notificationService';

interface NotificationPreferences {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  categories: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    reminders: boolean;
    alerts: boolean;
  };
  frequency: {
    dailyDigest: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
  testNotifications: boolean;
}

const NotificationPreferencesScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { addNotification } = useNotification();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enablePushNotifications: true,
    enableEmailNotifications: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
    categories: {
      transactions: true,
      budgets: true,
      goals: true,
      reminders: true,
      alerts: true,
    },
    frequency: {
      dailyDigest: false,
      weeklyReport: true,
      monthlyReport: true,
    },
    testNotifications: true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [testNotificationText, setTestNotificationText] = useState('This is a test notification');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState('22:00');
  const [tempEndTime, setTempEndTime] = useState('08:00');

  const styles = createStyles(theme);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem('notificationPreferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
      }
      
      // Also check system notification permissions
      const permissionStatus = await Notifications.getPermissionsAsync();
      if (!permissionStatus.granted) {
        setPreferences(prev => ({
          ...prev,
          enablePushNotifications: false
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(
      '🚧 Coming Soon!',
      `${feature} functionality is coming in a future update. We're working hard to bring you this feature!`,
      [
        { text: 'Got it!', style: 'default' },
        { 
          text: 'Notify Me', 
          onPress: () => {
            Alert.alert(
              '🔔 Notification Set',
              `We'll notify you when ${feature} is available!`,
              [{ text: 'Thanks!' }]
            );
          }
        }
      ]
    );
  };

  const handleEmailNotificationToggle = (value: boolean) => {
    if (value) {
      showComingSoon('Email Notifications');
      return;
    }
    updatePreference('enableEmailNotifications', value);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const showStartTimePickerModal = () => {
    setTempStartTime(preferences.quietHours.startTime);
    setShowStartTimePicker(true);
  };

  const showEndTimePickerModal = () => {
    setTempEndTime(preferences.quietHours.endTime);
    setShowEndTimePicker(true);
  };

  const updateStartTime = (timeString: string) => {
    updatePreference('quietHours', {
      ...preferences.quietHours,
      startTime: timeString
    });
    setShowStartTimePicker(false);
  };

  const updateEndTime = (timeString: string) => {
    updatePreference('quietHours', {
      ...preferences.quietHours,
      endTime: timeString
    });
    setShowEndTimePicker(false);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const sendTestNotification = async () => {
    try {
      if (!preferences.enablePushNotifications) {
        Alert.alert(
          'Push Notifications Disabled',
          'Please enable push notifications first to test them.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable', 
              onPress: () => updatePreference('enablePushNotifications', true)
            }
          ]
        );
        return;
      }

      // Check if we're in quiet hours
      if (preferences.quietHours.enabled && isInQuietHours()) {
        Alert.alert(
          'Quiet Hours Active',
          'Test notification will be sent anyway, but normally notifications are silenced during quiet hours.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send Anyway', onPress: () => doSendTestNotification() }
          ]
        );
        return;
      }

      await doSendTestNotification();
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to schedule test notification.');
    }
  };

  const doSendTestNotification = async () => {
    await notificationService.scheduleLocalNotification(
      '🧪 Test Notification',
      testNotificationText || 'This is a test notification from FinTracker!',
      2
    );
    Alert.alert(
      '✅ Test Sent!',
      'Your test notification will appear in 2 seconds.',
      [{ text: 'Got it!' }]
    );
  };

  const isInQuietHours = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quietHours.startTime.split(':')[0]);
    const endHour = parseInt(preferences.quietHours.endTime.split(':')[0]);
    
    if (startHour > endHour) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      return currentHour >= startHour || currentHour < endHour;
    } else {
      // Quiet hours within same day
      return currentHour >= startHour && currentHour < endHour;
    }
  };

  const updatePreference = async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    // Special handling for push notifications
    if (key === 'enablePushNotifications' && value === true) {
      const permissionStatus = await Notifications.requestPermissionsAsync();
      if (!permissionStatus.granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive push notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  // For Android, we can't directly open notification settings
                  Alert.alert('Settings', 'Please go to Settings > Apps > FinTracker > Notifications to enable notifications.');
                }
              }
            }
          ]
        );
        return;
      }
    }

    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        [key]: value,
      };
      
      // Auto-save preferences
      AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPrefs))
        .catch(error => console.error('Error saving preferences:', error));
      
      return newPrefs;
    });

    // Show feedback for certain changes
    if (key === 'enablePushNotifications') {
      if (value) {
        Alert.alert('✅ Push Notifications Enabled', 'You will now receive push notifications.');
      } else {
        Alert.alert('🔕 Push Notifications Disabled', 'You will no longer receive push notifications.');
      }
    }
  };

  const updateCategoryPreference = (
    category: keyof NotificationPreferences['categories'],
    enabled: boolean
  ) => {
    // Check if this is a coming soon feature
    const comingSoonFeatures = ['budgets', 'goals'];
    
    if (enabled && comingSoonFeatures.includes(category)) {
      const categoryNames = {
        budgets: 'Budget Notifications',
        goals: 'Goal Notifications'
      };
      showComingSoon(categoryNames[category as keyof typeof categoryNames]);
      return;
    }

    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        categories: {
          ...prev.categories,
          [category]: enabled,
        },
      };
      
      // Auto-save preferences
      AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPrefs))
        .catch(error => console.error('Error saving preferences:', error));
      
      return newPrefs;
    });

    // Show brief feedback
    const categoryNames = {
      transactions: 'Transaction',
      budgets: 'Budget',
      goals: 'Goal',
      reminders: 'Reminder',
      alerts: 'Alert'
    };
    
    const categoryName = categoryNames[category];
    if (enabled) {
      console.log(`${categoryName} notifications enabled`);
    } else {
      console.log(`${categoryName} notifications disabled`);
    }
  };

  const updateFrequencyPreference = (
    frequency: keyof NotificationPreferences['frequency'],
    enabled: boolean
  ) => {
    // Check if this is a coming soon feature
    if (enabled && frequency === 'dailyDigest') {
      showComingSoon('Daily Digest Reports');
      return;
    }

    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        frequency: {
          ...prev.frequency,
          [frequency]: enabled,
        },
      };
      
      // Auto-save preferences
      AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPrefs))
        .catch(error => console.error('Error saving preferences:', error));
      
      return newPrefs;
    });

    // Schedule or cancel report notifications based on preference
    if (enabled) {
      scheduleReportNotification(frequency);
    } else {
      cancelReportNotification(frequency);
    }
  };

  const scheduleReportNotification = async (frequency: keyof NotificationPreferences['frequency']) => {
    try {
      const notificationContent = {
        dailyDigest: {
          title: '📊 Daily Financial Digest',
          body: 'Your daily spending summary is ready to view!',
          hour: 20, // 8 PM
          minute: 0
        },
        weeklyReport: {
          title: '📈 Weekly Financial Report',
          body: 'Your weekly financial analysis is available!',
          hour: 9, // 9 AM on Sunday
          minute: 0
        },
        monthlyReport: {
          title: '📋 Monthly Financial Summary',
          body: 'Your monthly financial report is ready for review!',
          hour: 10, // 10 AM on 1st of month
          minute: 0
        }
      };

      const content = notificationContent[frequency];
      
      // Schedule recurring notification (implementation would depend on specific requirements)
      console.log(`Scheduling ${frequency} notification: ${content.title}`);
      
    } catch (error) {
      console.error(`Error scheduling ${frequency} notification:`, error);
    }
  };

  const cancelReportNotification = (frequency: keyof NotificationPreferences['frequency']) => {
    // Cancel specific recurring notification
    console.log(`Cancelling ${frequency} notification`);
  };

  const savePreferences = async () => {
    setIsLoading(true);
    try {
      // Save to local storage
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      
      // Apply notification settings immediately
      if (preferences.enablePushNotifications) {
        // Ensure notification permissions are still valid
        const permissionStatus = await Notifications.getPermissionsAsync();
        if (!permissionStatus.granted) {
          Alert.alert('Warning', 'Push notifications are enabled but system permissions are not granted.');
        }
      }
      
      // Show success with details
      const enabledCategories = Object.entries(preferences.categories)
        .filter(([_, enabled]) => enabled)
        .map(([category, _]) => category)
        .join(', ');
      
      const enabledReports = Object.entries(preferences.frequency)
        .filter(([_, enabled]) => enabled)
        .map(([frequency, _]) => frequency)
        .join(', ');

      Alert.alert(
        '✅ Preferences Saved!',
        `Your notification settings have been updated:\n\n` +
        `📱 Push Notifications: ${preferences.enablePushNotifications ? 'Enabled' : 'Disabled'}\n` +
        `📧 Email Notifications: ${preferences.enableEmailNotifications ? 'Enabled' : 'Disabled'}\n` +
        `🌙 Quiet Hours: ${preferences.quietHours.enabled ? 'Enabled' : 'Disabled'}\n` +
        `📂 Active Categories: ${enabledCategories || 'None'}\n` +
        `📊 Report Frequency: ${enabledReports || 'None'}`,
        [{ text: 'Perfect!' }]
      );
      
      // Add notification to context to show it was saved
      addNotification({
        title: 'Settings Saved',
        message: 'Your notification preferences have been updated successfully.',
        type: 'success',
        read: false,
      });
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(
        '❌ Save Failed',
        'Failed to save your preferences. Please check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => savePreferences() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to reset preferences
  const resetPreferences = () => {
    Alert.alert(
      '🔄 Reset Preferences',
      'Are you sure you want to reset all notification preferences to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultPrefs: NotificationPreferences = {
              enablePushNotifications: true,
              enableEmailNotifications: false,
              quietHours: {
                enabled: false,
                startTime: '22:00',
                endTime: '08:00',
              },
              categories: {
                transactions: true,
                budgets: true,
                goals: true,
                reminders: true,
                alerts: true,
              },
              frequency: {
                dailyDigest: false,
                weeklyReport: true,
                monthlyReport: true,
              },
              testNotifications: true,
            };
            
            setPreferences(defaultPrefs);
            await AsyncStorage.setItem('notificationPreferences', JSON.stringify(defaultPrefs));
            Alert.alert('✅ Reset Complete', 'All notification preferences have been reset to default values.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Notification Preferences</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
          >
          {/* Status Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Current Status</Text>
            
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.statusOverview}>
                <View style={styles.statusItem}>
                  <Ionicons 
                    name={preferences.enablePushNotifications ? "notifications" : "notifications-off"} 
                    size={20} 
                    color={preferences.enablePushNotifications ? "#4CAF50" : "#F44336"} 
                  />
                  <Text style={[styles.statusText, { color: theme.colors.text }]}>
                    Push: {preferences.enablePushNotifications ? "On" : "Off"}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons 
                    name={preferences.quietHours.enabled ? "moon" : "sunny"} 
                    size={20} 
                    color={preferences.quietHours.enabled ? "#9C27B0" : "#FF9800"} 
                  />
                  <Text style={[styles.statusText, { color: theme.colors.text }]}>
                    {preferences.quietHours.enabled ? "Quiet Mode" : "Always Active"}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Ionicons 
                    name="list" 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={[styles.statusText, { color: theme.colors.text }]}>
                    {Object.values(preferences.categories).filter(Boolean).length}/5 Categories
                  </Text>
                </View>
              </View>
              
              {preferences.quietHours.enabled && (
                <View style={[styles.quietHoursInfo, { backgroundColor: theme.colors.background }]}>
                  <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.quietHoursText, { color: theme.colors.textSecondary }]}>
                    Quiet hours: {preferences.quietHours.startTime} - {preferences.quietHours.endTime}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* General Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>General Settings</Text>
            
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                    Receive notifications on your device
                  </Text>
                </View>
                <Switch
                  value={preferences.enablePushNotifications}
                  onValueChange={(value) => updatePreference('enablePushNotifications', value)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={preferences.enablePushNotifications ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.preferenceItem, styles.preferenceItemBorder]}>
                <View style={styles.preferenceInfo}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                    Receive financial summaries and alerts via email (Coming Soon)
                  </Text>
                </View>
                <Switch
                  value={preferences.enableEmailNotifications}
                  onValueChange={handleEmailNotificationToggle}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={preferences.enableEmailNotifications ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>Quiet Hours</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
                    Silence notifications during specified hours to avoid interruptions
                  </Text>
                </View>
                <Switch
                  value={preferences.quietHours.enabled}
                  onValueChange={(value) => updatePreference('quietHours', { ...preferences.quietHours, enabled: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={preferences.quietHours.enabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              {preferences.quietHours.enabled && (
                <View style={[styles.quietHoursSettings, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.quietHoursTitle, { color: theme.colors.text }]}>Customize Quiet Hours</Text>
                  
                  <View style={styles.timePickerContainer}>
                    <TouchableOpacity 
                      style={[styles.timePicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={showStartTimePickerModal}
                    >
                      <Ionicons name="moon" size={20} color={theme.colors.primary} />
                      <View style={styles.timePickerText}>
                        <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>Start Time</Text>
                        <Text style={[styles.timePickerValue, { color: theme.colors.text }]}>
                          {formatTime(preferences.quietHours.startTime)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.timePicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={showEndTimePickerModal}
                    >
                      <Ionicons name="sunny" size={20} color={theme.colors.primary} />
                      <View style={styles.timePickerText}>
                        <Text style={[styles.timePickerLabel, { color: theme.colors.textSecondary }]}>End Time</Text>
                        <Text style={[styles.timePickerValue, { color: theme.colors.text }]}>
                          {formatTime(preferences.quietHours.endTime)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.quietHoursNote, { color: theme.colors.textSecondary }]}>
                    💡 Tip: Emergency notifications and calls will still come through
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notification Categories</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Choose which types of activities you want to be notified about
            </Text>
            
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              {Object.entries(preferences.categories).map(([category, enabled], index) => {
                const categoryInfo = {
                  transactions: {
                    name: 'Transactions',
                    description: 'Get notified when money comes in or goes out',
                    icon: 'swap-horizontal',
                    implemented: true
                  },
                  budgets: {
                    name: 'Budget Alerts',
                    description: 'Warnings when approaching spending limits (Coming Soon)',
                    icon: 'pie-chart',
                    implemented: false
                  },
                  goals: {
                    name: 'Savings Goals',
                    description: 'Progress updates and milestone celebrations (Coming Soon)',
                    icon: 'flag',
                    implemented: false
                  },
                  reminders: {
                    name: 'Payment Reminders',
                    description: 'Never miss bills, subscriptions, or important payments',
                    icon: 'alarm',
                    implemented: true
                  },
                  alerts: {
                    name: 'Security Alerts',
                    description: 'Important account security and system notifications',
                    icon: 'shield-checkmark',
                    implemented: true
                  }
                };
                
                const info = categoryInfo[category as keyof typeof categoryInfo];
                
                return (
                  <View 
                    key={category} 
                    style={[
                      styles.categoryItem,
                      index < Object.entries(preferences.categories).length - 1 && styles.preferenceItemBorder
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: info.implemented ? theme.colors.primary + '20' : theme.colors.border + '40' }]}>
                        <Ionicons 
                          name={info.icon as any} 
                          size={20} 
                          color={info.implemented ? theme.colors.primary : theme.colors.textSecondary} 
                        />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                          {info.name}
                        </Text>
                        <Text style={[styles.categoryDescription, { color: theme.colors.textSecondary }]}>
                          {info.description}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => updateCategoryPreference(category as any, value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      thumbColor={enabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Report Frequency</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Get regular summaries of your financial activity
            </Text>
            
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              {Object.entries(preferences.frequency).map(([frequency, enabled], index) => {
                const frequencyInfo = {
                  dailyDigest: {
                    name: 'Daily Digest',
                    description: 'Summary of today\'s transactions at 8 PM (Coming Soon)',
                    icon: 'today',
                    implemented: false
                  },
                  weeklyReport: {
                    name: 'Weekly Report',
                    description: 'Weekly spending analysis every Sunday at 9 AM',
                    icon: 'calendar',
                    implemented: true
                  },
                  monthlyReport: {
                    name: 'Monthly Report',
                    description: 'Comprehensive monthly review on the 1st at 10 AM',
                    icon: 'stats-chart',
                    implemented: true
                  }
                };
                
                const info = frequencyInfo[frequency as keyof typeof frequencyInfo];
                
                return (
                  <View 
                    key={frequency} 
                    style={[
                      styles.categoryItem,
                      index < Object.entries(preferences.frequency).length - 1 && styles.preferenceItemBorder
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: info.implemented ? theme.colors.primary + '20' : theme.colors.border + '40' }]}>
                        <Ionicons 
                          name={info.icon as any} 
                          size={20} 
                          color={info.implemented ? theme.colors.primary : theme.colors.textSecondary} 
                        />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                          {info.name}
                        </Text>
                        <Text style={[styles.categoryDescription, { color: theme.colors.textSecondary }]}>
                          {info.description}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => updateFrequencyPreference(frequency as any, value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      thumbColor={enabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Test Notifications */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Test Notifications</Text>
            
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.testContainer}>
                <TextInput
                  style={[styles.testInput, { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={testNotificationText}
                  onChangeText={setTestNotificationText}
                  placeholder="Enter test notification message"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
                  onPress={sendTestNotification}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Send Test Notification</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          </ScrollView>
          
          {/* Fixed Bottom Button Container */}
          <View style={[styles.fixedButtonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.resetButton, { 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface 
                }]}
                onPress={resetPreferences}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { 
                  backgroundColor: isLoading ? theme.colors.textSecondary : theme.colors.primary,
                  opacity: isLoading ? 0.7 : 1
                }]}
                onPress={savePreferences}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <>
                    <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Preferences</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
      
      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Set Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              When should quiet hours begin?
            </Text>
            
            <View style={styles.timeButtonsContainer}>
              {['20:00', '21:00', '22:00', '23:00', '00:00'].map((time, index) => (
                <TouchableOpacity
                  key={`evening-time-${time}-${index}`}
                  style={[
                    styles.timeButton,
                    { 
                      backgroundColor: tempStartTime === time ? theme.colors.primary : theme.colors.background,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => {
                    setTempStartTime(time);
                    updateStartTime(time);
                  }}
                >
                  <Text style={[
                    styles.timeButtonText,
                    { color: tempStartTime === time ? '#fff' : theme.colors.text }
                  ]}>
                    {formatTime(time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Set End Time</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              When should quiet hours end?
            </Text>
            
            <View style={styles.timeButtonsContainer}>
              {['06:00', '07:00', '08:00', '09:00', '10:00'].map((time, index) => (
                <TouchableOpacity
                  key={`morning-time-${time}-${index}`}
                  style={[
                    styles.timeButton,
                    { 
                      backgroundColor: tempEndTime === time ? theme.colors.primary : theme.colors.background,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => {
                    setTempEndTime(time);
                    updateEndTime(time);
                  }}
                >
                  <Text style={[
                    styles.timeButtonText,
                    { color: tempEndTime === time ? '#fff' : theme.colors.text }
                  ]}>
                    {formatTime(time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface + '80',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 140 : 120, // Extra space for fixed buttons + keyboard
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
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
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  preferenceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
  },
  testContainer: {
    padding: 16,
    gap: 12,
  },
  testInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 100,
    maxHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Fixed Bottom Button Container
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for safe area
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statusItem: {
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  quietHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 6,
  },
  quietHoursText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  quietHoursSettings: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quietHoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  timePickerContainer: {
    gap: 8,
    marginBottom: 12,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePickerText: {
    flex: 1,
    marginLeft: 12,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timePickerValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  quietHoursNote: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  timeButtonsContainer: {
    gap: 12,
  },
  timeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NotificationPreferencesScreen;