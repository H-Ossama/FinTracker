import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { syncProgressService } from '../services/syncProgressService';
import CustomAlert from './CustomAlert';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService } from '../services/notificationService';
import { hybridDataService } from '../services/hybridDataService';

const SyncProgressModal: React.FC = () => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<any>({ progress: 0, message: '' });
  const [showCompleteAlert, setShowCompleteAlert] = useState(false);
  const [cancelRequestedState, setCancelRequested] = useState(false);
  const [completeAlertTitle, setCompleteAlertTitle] = useState('Sync Complete');
  const [completeAlertMessage, setCompleteAlertMessage] = useState('Your data is synced successfully.');

  const mountedRef = useRef(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const unsub = syncProgressService.subscribe((p) => {
      if (!mountedRef.current) return;

      if (!p || Object.keys(p).length === 0) {
        setVisible(false);
        setPayload({ progress: 0, message: '' });
        return;
      }

      setPayload(p);
      setCancelRequested(!!p.cancelled);
      // Show modal for active progress or error state
      setVisible((!p.complete && !p.cancelled) || !!p.failed);

      if (p.complete) {
        const op = p.operation as string | undefined;
        const isRestore = op === 'restore' || String(p.stage || '').includes('restore') || String(p.stage || '').includes('downloading');

        if (isRestore) {
          setCompleteAlertTitle('Data Restored');
          setCompleteAlertMessage('Your cloud backup was downloaded and applied to this device.');
        } else {
          setCompleteAlertTitle('Sync Complete');
          setCompleteAlertMessage('Your cloud backup is up to date.');
        }

        // schedule a local notification announcing completion
        try {
          notificationService.scheduleLocalNotification(
            isRestore ? 'Data Restored' : 'Sync Complete',
            isRestore ? 'Your cloud backup has been downloaded to this device.' : 'Your cloud backup is up to date.',
            { type: isRestore ? 'sync_restore' : 'sync_complete' }
          ).catch(() => {});
        } catch (_) {}

        // show a completion alert in-app and hide modal immediately
        if (mountedRef.current) setShowCompleteAlert(true);
        if (mountedRef.current) setVisible(false);

        // clear progress shortly after to allow UI to settle
        clearTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShowCompleteAlert(false);
          try { syncProgressService.clear(); } catch {}
        }, 1000) as unknown as number;
      }

      if (p.failed) {
        // Show modal with error and switch to OK button
        if (mountedRef.current) setVisible(true);
        if (mountedRef.current) setCancelRequested(false);
      }
    });

    return () => {
      mountedRef.current = false;
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      try { unsub(); } catch {}
    };
  }, []);

  const handleCancel = () => {
    setCancelRequested(true);
    try { syncProgressService.requestCancel(); } catch {}
  };

  const handleRetry = async () => {
    setCancelRequested(false);
    try { syncProgressService.clearCancel(); } catch {}

    try {
      const result = await hybridDataService.performManualSync((p: any) => {
        try { syncProgressService.setProgress(p); } catch {}
      });
      if (!result.success) {
        try {
          syncProgressService.setProgress({ stage: 'error', progress: 0, message: result.error || 'Sync failed', failed: true });
        } catch {}
      }
    } catch (err: any) {
      try {
        syncProgressService.setProgress({ stage: 'error', progress: 0, message: err?.message || 'Sync failed', failed: true });
      } catch {}
    }
  };

  const stage = String(payload?.stage || '');
  const operation = payload?.operation as string | undefined;
  const title =
    stage === 'waking_server'
      ? 'Waking Cloud Server'
      : operation === 'restore' || stage.includes('restor') || stage.includes('downloading')
        ? 'Restoring Data'
        : 'Syncing Data';

  const progress = typeof payload.progress === 'number' ? Math.max(0, Math.min(100, payload.progress)) : 0;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: payload.failed ? '#FF6B6B' : theme.colors.textSecondary }]}>
              {payload.message || (payload.stage === 'uploading' ? 'Uploading your backup…' : 'Downloading your backup…')}
            </Text>
            <View style={styles.progressRow}>
              {Platform.OS === 'android' ? (
                <View style={[styles.track, { backgroundColor: theme.colors.border }]}> 
                  <View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
                </View>
              ) : (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
              <Text style={[styles.percent, { color: theme.colors.textSecondary }]}>{progress}%</Text>
            </View>
            <View style={{ marginTop: 12, width: '100%' }}>
              {!payload.failed ? (
                !cancelRequestedState ? (
                  <TouchableOpacity onPress={handleCancel} style={{ padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#FF3B30' }}>
                    <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Cancelling…</Text>
                  </View>
                )
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => { setVisible(false); syncProgressService.clear(); }}
                    style={{ flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: theme.colors.border, marginRight: 8 }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRetry}
                    style={{ flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: theme.colors.primary, marginLeft: 8 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={showCompleteAlert}
        title={completeAlertTitle}
        message={completeAlertMessage}
        icon="cloud-done"
        iconColor="#4CAF50"
        buttons={[{ text: 'OK' }]}
        onDismiss={() => setShowCompleteAlert(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  card: {
    width: '90%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center'
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  progressRow: { width: '100%' , marginTop: 6 },
  percent: { marginTop: 8, textAlign: 'center' }
  ,
  track: {
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  }
});

export default SyncProgressModal;
