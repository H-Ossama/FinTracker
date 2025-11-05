import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface AccessDeniedScreenProps {
  onReturnToLogin: () => void;
}

const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({ onReturnToLogin }) => {
  const { theme } = useTheme();
  const auth = useAuth();
  
  // Defensive programming: handle case where auth context might not be fully initialized
  const accessDenied = auth?.accessDenied || { 
    isDenied: false, 
    reason: 'Access denied', 
    details: 'Please try signing in again.' 
  };
  const clearAccessDenial = auth?.clearAccessDenial || (() => {});

  const handleReturnToLogin = () => {
    clearAccessDenial();
    onReturnToLogin();
  };

  const getIconForReason = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('expired') || lowerReason.includes('session')) {
      return 'time-outline';
    } else if (lowerReason.includes('disabled') || lowerReason.includes('suspended')) {
      return 'ban-outline';
    } else if (lowerReason.includes('invalid') || lowerReason.includes('error')) {
      return 'warning-outline';
    } else if (lowerReason.includes('exists') || lowerReason.includes('deleted')) {
      return 'person-remove-outline';
    } else {
      return 'lock-closed-outline';
    }
  };

  const getIconColor = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('expired') || lowerReason.includes('session')) {
      return '#FF9500'; // Orange for expired
    } else if (lowerReason.includes('disabled') || lowerReason.includes('suspended')) {
      return '#FF3B30'; // Red for disabled
    } else if (lowerReason.includes('invalid') || lowerReason.includes('error')) {
      return '#FF9500'; // Orange for errors
    } else if (lowerReason.includes('exists') || lowerReason.includes('deleted')) {
      return '#FF3B30'; // Red for account issues
    } else {
      return '#8E8E93'; // Gray for generic
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(accessDenied.reason) + '20' }]}>
              <Ionicons 
                name={getIconForReason(accessDenied.reason)} 
                size={48} 
                color={getIconColor(accessDenied.reason)} 
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Access Denied
            </Text>
          </View>

          {/* Main Content */}
          <View style={[styles.contentCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.reasonSection}>
              <Text style={[styles.reasonTitle, { color: theme.colors.text }]}>
                Why can't I access my account?
              </Text>
              <Text style={[styles.reasonText, { color: getIconColor(accessDenied.reason) }]}>
                {accessDenied.reason}
              </Text>
            </View>

            {accessDenied.details && (
              <View style={styles.detailsSection}>
                <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
                  What can I do?
                </Text>
                <Text style={[styles.detailsText, { color: theme.colors.textSecondary }]}>
                  {accessDenied.details}
                </Text>
              </View>
            )}

            {/* Common Solutions */}
            <View style={styles.solutionsSection}>
              <Text style={[styles.solutionsTitle, { color: theme.colors.text }]}>
                Common Solutions:
              </Text>
              
              <View style={styles.solutionItem}>
                <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.solutionText, { color: theme.colors.textSecondary }]}>
                  Sign in again with your current credentials
                </Text>
              </View>

              <View style={styles.solutionItem}>
                <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.solutionText, { color: theme.colors.textSecondary }]}>
                  Reset your password if you've forgotten it
                </Text>
              </View>

              <View style={styles.solutionItem}>
                <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.solutionText, { color: theme.colors.textSecondary }]}>
                  Create a new account if needed
                </Text>
              </View>

              <View style={styles.solutionItem}>
                <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.solutionText, { color: theme.colors.textSecondary }]}>
                  Contact support if the issue persists
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleReturnToLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Return to Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={handleReturnToLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                Create New Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Having trouble? This usually happens when your session has expired or your account status has changed.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  detailsSection: {
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  solutionsSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  solutionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  solutionText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionsSection: {
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default AccessDeniedScreen;