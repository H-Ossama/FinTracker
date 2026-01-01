/**
 * Simple Cloud Backup Modal
 * 
 * A clean, straightforward UI for backup and restore using Firebase only.
 * No complex sync logic - just simple backup to cloud and restore from cloud.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { 
  simpleCloudBackupService, 
  BackupInfo, 
  SyncProgress 
} from '../services/simpleCloudBackupService';

interface SimpleCloudBackupModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  mode?: 'modal' | 'screen';
}

export const SimpleCloudBackupModal: React.FC<SimpleCloudBackupModalProps> = ({
  visible,
  onClose,
  onComplete,
  mode = 'modal',
}) => {
  const { theme } = useTheme();
  const { user, isGoogleAuthenticated } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [lastRestoreTime, setLastRestoreTime] = useState<string | null>(null);

  useEffect(() => {
    const shouldLoad = mode === 'screen' ? true : visible;
    if (shouldLoad) {
      loadBackupInfo();
    }
  }, [visible, mode]);

  const loadBackupInfo = async () => {
    try {
      setIsLoading(true);
      
      // Check if authenticated
      if (!simpleCloudBackupService.isAuthenticated()) {
        setBackupInfo({ exists: false });
        return;
      }

      // Get backup info
      const info = await simpleCloudBackupService.getBackupInfo();
      setBackupInfo(info);

      // Get local timestamps
      const times = await simpleCloudBackupService.getLastSyncTimes();
      setLastBackupTime(times.lastBackup);
      setLastRestoreTime(times.lastRestore);
    } catch (error) {
      console.error('Error loading backup info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!simpleCloudBackupService.isAuthenticated()) {
      dialog.alert('Sign In Required', 'Please sign in with Google to backup your data to the cloud.', 'OK');
      return;
    }

    setProgress({ stage: 'preparing', progress: 0, message: 'Starting backup...' });

    try {
      const result = await simpleCloudBackupService.backup((p) => {
        setProgress(p);
      });

      if (result.success) {
        dialog.show({
          title: '✅ Backup Complete',
          message: `Successfully backed up ${result.itemsBackedUp} items to the cloud.`,
          icon: 'checkmark-circle',
          iconColor: '#22C55E',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        await loadBackupInfo();
        onComplete?.();
      } else {
        dialog.show({
          title: 'Backup Failed',
          message: result.error || 'Unknown error occurred',
          icon: 'alert-circle',
          iconColor: '#EF4444',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } catch (error) {
      dialog.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Backup failed',
        icon: 'alert-circle',
        iconColor: '#EF4444',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setProgress(null);
    }
  };

  const handleRestore = async () => {
    if (!simpleCloudBackupService.isAuthenticated()) {
      dialog.alert('Sign In Required', 'Please sign in with Google to restore your data from the cloud.', 'OK');
      return;
    }

    if (!backupInfo?.exists) {
      dialog.alert('No Backup Found', 'No cloud backup exists for your account. Create a backup first!', 'OK');
      return;
    }

    dialog.show({
      title: '⚠️ Restore from Cloud',
      message:
        'This will REPLACE all data on this device with your cloud backup. Your current local data will be lost.\n\nAre you sure you want to continue?',
      icon: 'warning',
      iconColor: '#F59E0B',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setProgress({ stage: 'preparing', progress: 0, message: 'Starting restore...' });

            try {
              const result = await simpleCloudBackupService.restore((p) => {
                setProgress(p);
              });

              if (result.success) {
                dialog.show({
                  title: '✅ Restore Complete',
                  message: `Successfully restored ${result.itemsRestored} items from your cloud backup.`,
                  icon: 'checkmark-circle',
                  iconColor: '#22C55E',
                  buttons: [{ text: 'OK', style: 'default' }],
                });
                await loadBackupInfo();
                onComplete?.();
              } else {
                dialog.show({
                  title: 'Restore Failed',
                  message: result.error || 'Unknown error occurred',
                  icon: 'alert-circle',
                  iconColor: '#EF4444',
                  buttons: [{ text: 'OK', style: 'default' }],
                });
              }
            } catch (error) {
              dialog.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Restore failed',
                icon: 'alert-circle',
                iconColor: '#EF4444',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } finally {
              setProgress(null);
            }
          },
        },
      ],
    });
  };

  const handleDeleteBackup = async () => {
    dialog.confirm({
      title: '🗑️ Delete Cloud Backup',
      message:
        'This will permanently delete your cloud backup. Your local data will NOT be affected.\n\nAre you sure?',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const result = await simpleCloudBackupService.deleteBackup();
          if (result.success) {
            dialog.show({
              title: 'Deleted',
              message: 'Your cloud backup has been deleted.',
              icon: 'checkmark-circle',
              iconColor: '#22C55E',
              buttons: [{ text: 'OK', style: 'default' }],
            });
            await loadBackupInfo();
          } else {
            dialog.show({
              title: 'Error',
              message: result.error || 'Failed to delete backup',
              icon: 'alert-circle',
              iconColor: '#EF4444',
              buttons: [{ text: 'OK', style: 'default' }],
            });
          }
        } catch (error) {
          dialog.show({
            title: 'Error',
            message: error instanceof Error ? error.message : 'Delete failed',
            icon: 'alert-circle',
            iconColor: '#EF4444',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  const renderProgressOverlay = () => {
    if (!progress) return null;

    return (
      <View style={styles.progressOverlay}>
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
          {progress.stage === 'error' ? (
            <>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={[styles.progressTitle, { color: '#FF6B6B' }]}>Error</Text>
              <Text style={[styles.progressMessage, { color: theme.colors.textSecondary }]}>
                {progress.error || progress.message}
              </Text>
              <TouchableOpacity
                style={[styles.progressButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setProgress(null)}
              >
                <Text style={styles.progressButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : progress.stage === 'complete' ? (
            <>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={[styles.progressTitle, { color: '#4CAF50' }]}>Complete!</Text>
              <Text style={[styles.progressMessage, { color: theme.colors.textSecondary }]}>
                {progress.message}
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                {progress.stage === 'uploading' ? 'Backing Up...' : 
                 progress.stage === 'downloading' ? 'Downloading...' :
                 progress.stage === 'restoring' ? 'Restoring...' : 
                 'Please Wait...'}
              </Text>
              <Text style={[styles.progressMessage, { color: theme.colors.textSecondary }]}>
                {progress.message}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(100, Math.max(0, progress.progress))}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>
                {progress.progress}%
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const isAuthenticated = simpleCloudBackupService.isAuthenticated();

  const content = (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name={mode === 'screen' ? 'chevron-back' : 'close'} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cloud Backup</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            
            {/* Status Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.statusHeader}>
                <View style={[
                  styles.statusIcon,
                  { backgroundColor: isAuthenticated ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 107, 107, 0.1)' }
                ]}>
                  <Ionicons 
                    name={isAuthenticated ? "cloud-done" : "cloud-offline"} 
                    size={32} 
                    color={isAuthenticated ? "#4CAF50" : "#FF6B6B"} 
                  />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                    {isAuthenticated ? 'Connected' : 'Not Connected'}
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
                    {isAuthenticated 
                      ? simpleCloudBackupService.getUserEmail() 
                      : 'Sign in with Google to backup'}
                  </Text>
                </View>
              </View>

              {isAuthenticated && backupInfo && (
                <View style={[styles.backupStatus, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.backupStatusRow}>
                    <Text style={[styles.backupStatusLabel, { color: theme.colors.textSecondary }]}>
                      Cloud Backup:
                    </Text>
                    <Text style={[styles.backupStatusValue, { color: backupInfo.exists ? '#4CAF50' : '#FF9800' }]}>
                      {backupInfo.exists ? 'Available' : 'No Backup'}
                    </Text>
                  </View>

                  {backupInfo.exists && backupInfo.lastBackup && (
                    <View style={styles.backupStatusRow}>
                      <Text style={[styles.backupStatusLabel, { color: theme.colors.textSecondary }]}>
                        Last Backup:
                      </Text>
                      <Text style={[styles.backupStatusValue, { color: theme.colors.text }]}>
                        {formatDate(backupInfo.lastBackup)}
                      </Text>
                    </View>
                  )}

                  {backupInfo.exists && backupInfo.itemCounts && (
                    <View style={styles.itemCountsGrid}>
                      <View style={[styles.itemCountBox, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                        <Text style={[styles.itemCountValue, { color: theme.colors.text }]}>
                          {backupInfo.itemCounts.wallets}
                        </Text>
                        <Text style={[styles.itemCountLabel, { color: theme.colors.textSecondary }]}>
                          Wallets
                        </Text>
                      </View>
                      <View style={[styles.itemCountBox, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="receipt" size={20} color={theme.colors.primary} />
                        <Text style={[styles.itemCountValue, { color: theme.colors.text }]}>
                          {backupInfo.itemCounts.transactions}
                        </Text>
                        <Text style={[styles.itemCountLabel, { color: theme.colors.textSecondary }]}>
                          Transactions
                        </Text>
                      </View>
                      <View style={[styles.itemCountBox, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="flag" size={20} color={theme.colors.primary} />
                        <Text style={[styles.itemCountValue, { color: theme.colors.text }]}>
                          {backupInfo.itemCounts.goals}
                        </Text>
                        <Text style={[styles.itemCountLabel, { color: theme.colors.textSecondary }]}>
                          Goals
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            {isAuthenticated && (
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Actions</Text>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleBackup}
                  disabled={isLoading}
                >
                  <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                  <View style={styles.actionButtonText}>
                    <Text style={styles.actionButtonTitle}>Backup to Cloud</Text>
                    <Text style={styles.actionButtonSubtitle}>
                      Save all your data to Firebase
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    { 
                      backgroundColor: backupInfo?.exists ? '#2196F3' : theme.colors.border,
                    }
                  ]}
                  onPress={handleRestore}
                  disabled={isLoading || !backupInfo?.exists}
                >
                  <Ionicons 
                    name="cloud-download" 
                    size={24} 
                    color={backupInfo?.exists ? "#FFFFFF" : theme.colors.textSecondary} 
                  />
                  <View style={styles.actionButtonText}>
                    <Text style={[
                      styles.actionButtonTitle,
                      !backupInfo?.exists && { color: theme.colors.textSecondary }
                    ]}>
                      Restore from Cloud
                    </Text>
                    <Text style={[
                      styles.actionButtonSubtitle,
                      !backupInfo?.exists && { color: theme.colors.textSecondary }
                    ]}>
                      {backupInfo?.exists 
                        ? 'Replace local data with cloud backup'
                        : 'No backup available to restore'}
                    </Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={backupInfo?.exists ? "rgba(255,255,255,0.5)" : theme.colors.textSecondary} 
                  />
                </TouchableOpacity>

                {backupInfo?.exists && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#FF6B6B' }]}
                    onPress={handleDeleteBackup}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    <Text style={styles.deleteButtonText}>Delete Cloud Backup</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Info Section */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>How It Works</Text>
              
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Your data is securely stored in Firebase Cloud with end-to-end encryption
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                  <Ionicons name="phone-portrait" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Backup saves: wallets, transactions, categories, goals, budgets, bills, and reminders
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                  <Ionicons name="warning" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Restore will replace ALL local data with your cloud backup
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                  <Ionicons name="logo-google" size={20} color="#9C27B0" />
                </View>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Sign in with Google to access cloud backup features
                </Text>
              </View>
            </View>

            {/* Last Activity */}
            {(lastBackupTime || lastRestoreTime) && (
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Activity</Text>
                
                {lastBackupTime && (
                  <View style={styles.activityRow}>
                    <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.activityLabel, { color: theme.colors.textSecondary }]}>
                      Last backup from this device:
                    </Text>
                    <Text style={[styles.activityValue, { color: theme.colors.text }]}>
                      {formatDate(lastBackupTime)}
                    </Text>
                  </View>
                )}

                {lastRestoreTime && (
                  <View style={styles.activityRow}>
                    <Ionicons name="cloud-download-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.activityLabel, { color: theme.colors.textSecondary }]}>
                      Last restore on this device:
                    </Text>
                    <Text style={[styles.activityValue, { color: theme.colors.text }]}>
                      {formatDate(lastRestoreTime)}
                    </Text>
                  </View>
                )}
              </View>
            )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Progress Overlay */}
      {progress && renderProgressOverlay()}
    </View>
  );

  if (mode === 'screen') {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
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
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  backupStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  backupStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backupStatusLabel: {
    fontSize: 14,
  },
  backupStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemCountsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  itemCountBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  itemCountValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  itemCountLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 13,
    marginLeft: 8,
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  progressContainer: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  progressButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  progressButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SimpleCloudBackupModal;
