import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNavigation } from '@react-navigation/native';

const PrivacyPolicyScreen = () => {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const styles = createStyles(theme);

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      
      {/* Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          directionalLockEnabled={true}
          scrollEventThrottle={16}
        >
          <Text style={[styles.section, { color: theme.colors.text }]}>Last Updated: December 2024</Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>1. Introduction</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            FinTracker ("we," "us," "our," or "Company") operates as a financial tracking application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>2. Information We Collect</Text>
          <Text style={[styles.subheading, { color: theme.colors.text }]}>Personal Information</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            • Account information (name, email, password){'\n'}
            • Profile data (avatar, preferences){'\n'}
            • Transaction history and financial data{'\n'}
            • Device information and usage analytics
          </Text>

          <Text style={[styles.subheading, { color: theme.colors.text }]}>Automatically Collected Information</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            • Device identifiers and type{'\n'}
            • App usage patterns and features accessed{'\n'}
            • Crash reports and error logs{'\n'}
            • Location data (only with your permission)
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>3. How We Use Your Information</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            • Provide and maintain the application{'\n'}
            • Improve and personalize user experience{'\n'}
            • Send notifications and updates{'\n'}
            • Ensure security and prevent fraud{'\n'}
            • Comply with legal obligations
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>4. Data Security</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>5. Third-Party Services</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Our application uses third-party services including Google Firebase for authentication and data storage. These services may collect information in accordance with their own privacy policies.
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>6. User Rights</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            You have the right to:{'\n'}
            • Access your personal information{'\n'}
            • Correct inaccurate data{'\n'}
            • Request deletion of your data{'\n'}
            • Opt-out of marketing communications
          </Text>

          <Text style={[styles.heading, { color: theme.colors.text }]}>7. Contact Us</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            If you have questions about this Privacy Policy, please contact us at:{'\n'}
            Email: privacy@fintracker.app
          </Text>

          <View style={{ height: 32 }} />
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
    backButton: {
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
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    section: {
      fontSize: 14,
      marginBottom: 32,
      fontWeight: '500',
    },
    heading: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
      marginTop: 24,
    },
    subheading: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 16,
    },
    body: {
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 16,
    },
  });

export default PrivacyPolicyScreen;
