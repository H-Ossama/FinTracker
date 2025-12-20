import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const QuickActionsOverlay: React.FC<Props> = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const quickActions = useQuickActions();

  const [actions, setActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    if (!visible) return;

    let mounted = true;
    const load = async () => {
      try {
        const enabled = await quickActionsService.getEnabledQuickActions();
        if (mounted) setActions(enabled);
      } catch (e) {
        if (mounted) setActions([]);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [visible]);

  const settingsAction = useMemo<QuickAction>(
    () => ({
      id: 'quick_actions_settings',
      label: 'Settings',
      description: 'Configure quick actions',
      icon: 'settings',
      color: '#8E8E93',
      action: 'quickActionsSettings',
      enabled: true,
      order: 999,
      category: 'settings',
      isModal: false,
      navigateTo: 'QuickActionsSettings',
    }),
    []
  );

  const handleAction = useCallback(
    (action: QuickAction) => {
      onClose();

      // Let the modal close animation start.
      setTimeout(() => {
        try {
          if (action.isModal) {
            switch (action.action) {
              case 'addExpense':
                quickActions.triggerAddExpense();
                return;
              case 'transfer':
                quickActions.triggerTransfer();
                return;
              case 'addWallet':
                quickActions.triggerAddWallet();
                return;
              default:
                break;
            }
          }

          if (action.navigateTo) {
            (navigation as any).navigate(action.navigateTo, action.navigateParams);
            return;
          }

          // Fallback route mapping for legacy actions
          const routeMap: Record<string, string> = {
            addIncome: 'AddIncome',
            insights: 'Insights',
            budget: 'BudgetPlanner',
            bills: 'BillsTracker',
            goals: 'SavingsGoals',
            borrowedMoney: 'BorrowedMoneyHistory',
            notificationCenter: 'NotificationCenter',
          };

          const routeName = routeMap[action.action];
          if (routeName) {
            (navigation as any).navigate(routeName);
          }
        } catch (e) {
          // no-op; navigation errors are non-fatal for UI
        }
      }, 120);
    },
    [navigation, onClose, quickActions]
  );

  const panelBg = isDark ? 'rgba(24, 24, 27, 0.92)' : 'rgba(255, 255, 255, 0.92)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  const actionRing = useMemo(() => {
    // Match the screenshot: 4 enabled actions + Settings (5 items total).
    return [...actions.slice(0, 4), settingsAction];
  }, [actions, settingsAction]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <BlurView
          intensity={Platform.OS === 'android' ? 40 : 55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Dark grey veil for better visibility (above blur) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(80,80,80,0.65)' },
          ]}
        />

        {/* Backdrop: dismiss when tapping outside */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Circular panel */}
        <View style={styles.panelWrap} pointerEvents="box-none">
          <View style={[styles.panel, { backgroundColor: panelBg }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('quick_actions') || 'Quick Actions'}</Text>

            <View style={styles.ringStage}>
              {/* Actions arranged around a circle */}
              {actionRing.map((a, idx) => {
                const total = actionRing.length;
                const angle = (idx * (2 * Math.PI)) / total - Math.PI / 2;
                const x = Math.cos(angle) * RING_RADIUS;
                const y = Math.sin(angle) * RING_RADIUS;
                const left = RING_STAGE_SIZE / 2 + x - ACTION_SIZE / 2;
                const top = RING_STAGE_SIZE / 2 + y - ACTION_SIZE / 2;

                return (
                  <View key={a.id} style={[styles.ringItem, { left, top }]}>
                    <Pressable
                      onPress={() => handleAction(a)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        {
                          backgroundColor: a.color,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}
                    >
                      <Ionicons name={a.icon as any} size={22} color="#FFFFFF" />
                    </Pressable>
                    <Text style={[styles.actionLabel, { color: theme.colors.text }]} numberOfLines={2}>
                      {t(a.label) || a.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CIRCLE_SIZE = 340;
const RING_STAGE_SIZE = 300;
const ACTION_SIZE = 54;
const RING_RADIUS = 110;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 110,
  },
  panel: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  ringStage: {
    width: RING_STAGE_SIZE,
    height: RING_STAGE_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  ringItem: {
    position: 'absolute',
    width: 92,
    alignItems: 'center',
  },
  actionButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default QuickActionsOverlay;
