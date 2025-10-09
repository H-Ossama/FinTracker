import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../services/notificationService';

const { width } = Dimensions.get('window');

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
}

const NotificationPreferencesScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enablePushNotifications: true,
    enableEmailNotifications: false,
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '08:00',
    },
    categories: {
      transactions: true,
      budgets: true,
      goals: false,
      reminders: true,
      alerts: true,
    },
    frequency: {
      dailyDigest: false,
      weeklyReport: true,
      monthlyReport: true,
    },
  });

  const styles = createStyles(theme);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        '🧪 Test Notification',
        'Your notifications are working perfectly!',
        3
      );
      
      Alert.alert(
        '✅ Test Sent!', 
        'Your test notification will appear in 3 seconds.',
        [{ text: 'Got it!', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to schedule test notification.');
    }
  };

  const updateNotificationPreference = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateCategoryPreference = (category: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
  };

  const updateQuietHours = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    React.useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [{
            translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={isDark 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#667eea', '#764ba2', '#f093fb']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back-ios" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Customize your experience</Text>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.statBubble}>
              <Text style={styles.statNumber}>
                {Object.values(preferences.categories).filter(Boolean).length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </Animated.View>

        {/* Floating Status Card */}
        <AnimatedCard>
          <View style={styles.floatingCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']
              }
              style={styles.floatingCardGradient}
            >
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { 
                    backgroundColor: preferences.enablePushNotifications ? '#4CAF50' : '#FF5722' 
                  }]} />
                  <Text style={[styles.statusText, { color: isDark ? 'white' : '#1a1a2e' }]}>
                    Push {preferences.enablePushNotifications ? 'On' : 'Off'}
                  </Text>
                </View>
                
                <View style={styles.statusDivider} />
                
                <View style={styles.statusItem}>
                  <MaterialIcons 
                    name={preferences.quietHours.enabled ? 'nights-stay' : 'wb-sunny'} 
                    size={16} 
                    color={isDark ? '#ffffff80' : '#1a1a2e80'} 
                  />
                  <Text style={[styles.statusText, { color: isDark ? 'white' : '#1a1a2e' }]}>
                    {preferences.quietHours.enabled ? 'Quiet Mode' : 'Always On'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </AnimatedCard>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Controls */}
        <AnimatedCard delay={100}>
          <View style={styles.quickControlsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Controls</Text>
            
            <View style={styles.quickControlsGrid}>
              <TouchableOpacity 
                style={[styles.quickControl, { backgroundColor: theme.colors.surface }]}
                onPress={() => updateNotificationPreference('enablePushNotifications', !preferences.enablePushNotifications)}
              >
                <LinearGradient
                  colors={preferences.enablePushNotifications 
                    ? ['#4CAF50', '#45a049'] 
                    : [theme.colors.border, theme.colors.textSecondary]
                  }
                  style={styles.quickControlIcon}
                >
                  <MaterialIcons 
                    name="notifications" 
                    size={24} 
                    color="white" 
                  />
                </LinearGradient>
                <Text style={[styles.quickControlLabel, { color: theme.colors.text }]}>
                  Push Notifications
                </Text>
                <Switch
                  value={preferences.enablePushNotifications}
                  onValueChange={(value) => updateNotificationPreference('enablePushNotifications', value)}
                  trackColor={{ false: theme.colors.border, true: '#4CAF50' }}
                  thumbColor={preferences.enablePushNotifications ? '#ffffff' : '#f4f3f4'}
                  style={styles.quickControlSwitch}
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickControl, { backgroundColor: theme.colors.surface }]}
                onPress={() => updateQuietHours('enabled', !preferences.quietHours.enabled)}
              >
                <LinearGradient
                  colors={preferences.quietHours.enabled 
                    ? ['#9C27B0', '#8E24AA'] 
                    : [theme.colors.border, theme.colors.textSecondary]
                  }
                  style={styles.quickControlIcon}
                >
                  <MaterialIcons 
                    name={preferences.quietHours.enabled ? 'nights-stay' : 'wb-sunny'} 
                    size={24} 
                    color="white" 
                  />
                </LinearGradient>
                <Text style={[styles.quickControlLabel, { color: theme.colors.text }]}>
                  Quiet Hours
                </Text>
                <Switch
                  value={preferences.quietHours.enabled}
                  onValueChange={(value) => updateQuietHours('enabled', value)}
                  trackColor={{ false: theme.colors.border, true: '#9C27B0' }}
                  thumbColor={preferences.quietHours.enabled ? '#ffffff' : '#f4f3f4'}
                  style={styles.quickControlSwitch}
                />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedCard>

        {/* Categories Section */}
        <AnimatedCard delay={200}>
          <View style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('categories')}
            >
              <View style={styles.sectionHeaderLeft}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E8E']}
                  style={styles.sectionIcon}
                >
                  <MaterialIcons name="category" size={24} color="white" />
                </LinearGradient>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Categories
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    {Object.values(preferences.categories).filter(Boolean).length} of {Object.keys(preferences.categories).length} enabled
                  </Text>
                </View>
              </View>
              <MaterialIcons 
                name={activeSection === 'categories' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>

            {activeSection === 'categories' && (
              <View style={styles.expandedContent}>
                {Object.entries(preferences.categories).map(([key, value], index) => {
                  const categoryConfig = {
                    transactions: { icon: 'swap-horiz', color: '#2196F3', label: 'Transactions', desc: 'Income and expense notifications' },
                    budgets: { icon: 'pie-chart', color: '#FF9800', label: 'Budgets', desc: 'Budget limits and progress alerts' },
                    goals: { icon: 'flag', color: '#4CAF50', label: 'Goals', desc: 'Savings goals and milestones' },
                    reminders: { icon: 'alarm', color: '#9C27B0', label: 'Reminders', desc: 'Payment and bill reminders' },
                    alerts: { icon: 'warning', color: '#F44336', label: 'Alerts', desc: 'System alerts and warnings' }
                  };
                  
                  const config = categoryConfig[key as keyof typeof categoryConfig];
                  
                  return (
                    <View key={key} style={[styles.categoryItem, index > 0 && styles.categoryItemBorder]}>
                      <View style={styles.categoryLeft}>
                        <LinearGradient
                          colors={[config.color, config.color + 'DD']}
                          style={styles.categoryIcon}
                        >
                          <MaterialIcons name={config.icon as any} size={20} color="white" />
                        </LinearGradient>
                        <View style={styles.categoryText}>
                          <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>
                            {config.label}
                          </Text>
                          <Text style={[styles.categoryDesc, { color: theme.colors.textSecondary }]}>
                            {config.desc}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(val) => updateCategoryPreference(key, val)}
                        trackColor={{ false: theme.colors.border, true: config.color + '80' }}
                        thumbColor={value ? config.color : '#f4f3f4'}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Test Notification */}
        <AnimatedCard delay={300}>
          <TouchableOpacity 
            style={styles.testCard}
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDark 
                ? ['#667eea', '#764ba2'] 
                : ['#f093fb', '#f5576c']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.testCardGradient}
            >
              <View style={styles.testContent}>
                <View style={styles.testIcon}>
                  <MaterialIcons name="send" size={28} color="white" />
                </View>
                <View style={styles.testText}>
                  <Text style={styles.testTitle}>Test Notification</Text>
                  <Text style={styles.testSubtitle}>Send a test to verify your settings</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Styles
  headerGradient: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  headerStats: {
    alignItems: 'center',
  },
  statBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Floating Card
  floatingCard: {
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  floatingCardGradient: {
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  // Scroll Content
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  // Quick Controls
  quickControlsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickControlsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  quickControl: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickControlIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickControlLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickControlSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  // Modern Cards
  modernCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  categoryItemBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 16,
    paddingTop: 16,
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
    marginRight: 15,
  },
  categoryText: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Test Card
  testCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  testCardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  testContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  testIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testText: {
    flex: 1,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default NotificationPreferencesScreen;