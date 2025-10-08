import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hybridDataService } from '../services/hybridDataService';
import { useTheme } from '../contexts/ThemeContext';

interface SyncReminderProps {
  onSyncComplete?: () => void;
}

export const SyncReminderBanner: React.FC<SyncReminderProps> = ({ onSyncComplete }) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [unsyncedItems, setUnsyncedItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    checkSyncReminder();
  }, []);

  const checkSyncReminder = async () => {
    try {
      const shouldShow = await hybridDataService.shouldShowSyncReminder();
      if (shouldShow) {
        const syncStatus = await hybridDataService.getSyncStatus();
        setUnsyncedItems(syncStatus.unsyncedItems);
        setVisible(true);
        
        // Animate banner in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error checking sync reminder:', error);
    }
  };

  const handleSyncNow = async () => {
    setIsLoading(true);
    try {
      const result = await hybridDataService.performManualSync();
      if (result.success) {
        handleDismiss();
        onSyncComplete?.();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await hybridDataService.markSyncReminderShown();
      
      // Animate banner out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const handleShowDetails = () => {
    setShowModal(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      <Animated.View style={[styles.banner, { opacity: fadeAnim, backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.primary }]}>
        <View style={styles.bannerContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.isDark ? 'rgba(0, 122, 255, 0.2)' : '#f0f8ff' }]}>
            <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Time to Sync!</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {unsyncedItems > 0 
                ? `You have ${unsyncedItems} unsynced items`
                : 'Keep your data backed up and synced'
              }
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={handleSyncNow}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="sync" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={handleShowDetails}
            >
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={handleDismiss}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="cloud-upload" size={32} color={theme.colors.primary} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sync Reminder</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                We recommend syncing your financial data regularly to:
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Keep your data safely backed up</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="sync" size={20} color={theme.colors.primary} />
                  <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Access from multiple devices</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="time" size={20} color="#FF9500" />
                  <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>Never lose your transaction history</Text>
                </View>
              </View>

              {unsyncedItems > 0 && (
                <View style={[styles.unsyncedWarning, { backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.1)' : '#fff5f5' }]}>
                  <Ionicons name="warning" size={20} color="#FF6B6B" />
                  <Text style={[styles.warningText, { color: '#FF6B6B' }]}>
                    You have {unsyncedItems} items that haven't been backed up yet.
                  </Text>
                </View>
              )}

              <Text style={[styles.reminderNote, { color: theme.colors.textSecondary }]}>
                💡 You can disable these reminders in sync settings
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>Maybe Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowModal(false);
                  handleSyncNow();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="sync" size={18} color="white" />
                    <Text style={styles.primaryButtonText}>Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Hook for checking and showing sync reminders
export const useSyncReminder = () => {
  const [shouldShowReminder, setShouldShowReminder] = useState(false);

  const checkReminder = async () => {
    try {
      const shouldShow = await hybridDataService.shouldShowSyncReminder();
      setShouldShowReminder(shouldShow);
      return shouldShow;
    } catch (error) {
      console.error('Error checking sync reminder:', error);
      return false;
    }
  };

  const dismissReminder = async () => {
    try {
      await hybridDataService.markSyncReminderShown();
      setShouldShowReminder(false);
    } catch (error) {
      console.error('Error dismissing sync reminder:', error);
    }
  };

  return {
    shouldShowReminder,
    checkReminder,
    dismissReminder,
  };
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    // backgroundColor and borderLeftColor will be set dynamically
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // backgroundColor will be set dynamically
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    // color will be set dynamically
  },
  description: {
    fontSize: 14,
    // color will be set dynamically
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set dynamically
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    // backgroundColor will be set dynamically
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    // backgroundColor will be set dynamically
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    // color will be set dynamically
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    // color will be set dynamically
  },
  benefitsList: {
    gap: 12,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    // color will be set dynamically
  },
  unsyncedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    // backgroundColor will be set dynamically
  },
  warningText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    // color will be set dynamically
  },
  reminderNote: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    // color will be set dynamically
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 44,
  },
  primaryButton: {
    gap: 8,
    // backgroundColor will be set dynamically
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    // borderColor will be set dynamically
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    // color will be set dynamically
  },
});

export default SyncReminderBanner;