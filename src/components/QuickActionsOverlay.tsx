import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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

  const popoverActions = useMemo(() => {
    // Screenshot-like: compact list (keep existing icons/actions)
    return [...actions, settingsAction];
  }, [actions, settingsAction]);

  const anim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [anim, visible]);

  const popoverTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const popoverScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <BlurView
          intensity={Platform.OS === 'android' ? 40 : 55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Subtle veil above blur */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)',
              opacity: anim,
            },
          ]}
        />

        {/* Backdrop: dismiss when tapping outside */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Popover panel (iOS-style) */}
        <View
          style={[styles.popoverWrap, { paddingBottom: Math.max(insets.bottom, 10) + TAB_BAR_OFFSET }]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.popover,
              {
                transform: [{ translateY: popoverTranslateY }, { scale: popoverScale }],
                opacity: anim,
              },
            ]}
          >
            <BlurView
              intensity={Platform.OS === 'android' ? 25 : 40}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.popoverChrome, { borderColor: panelBorder, backgroundColor: panelBg }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
              >
                {popoverActions.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => handleAction(a)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: isDark ? 'rgba(15,15,18,0.60)' : 'rgba(20,20,25,0.12)',
                        borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.iconBubble, { backgroundColor: a.color }]}>
                      <Ionicons name={a.icon as any} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.rowLabel, { color: isDark ? '#FFFFFF' : theme.colors.text }]} numberOfLines={1}>
                      {t(a.label) || a.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Arrow pointing to the center quick button */}
            <View style={styles.pointerWrap} pointerEvents="none">
              <View style={[styles.pointer, { backgroundColor: panelBg, borderColor: panelBorder }]} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const TAB_BAR_OFFSET = 104;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  popoverWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  popover: {
    width: 280,
    borderRadius: 26,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 18,
  },
  popoverChrome: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 12,
    maxHeight: 340,
    overflow: 'hidden',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 12,
  },
  row: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  pointerWrap: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    transform: [{ translateX: -8 }],
    width: 16,
    height: 16,
    overflow: 'visible',
  },
  pointer: {
    width: 16,
    height: 16,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
    opacity: 0.98,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default QuickActionsOverlay;
