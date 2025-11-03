import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNavigation } from '@react-navigation/native';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

const QuickActionsSettingsScreen = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(theme);

  useEffect(() => {
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      setLoading(true);
      const quickActions = await quickActionsService.getQuickActions();
      setActions(quickActions);
    } catch (error) {
      console.error('Error loading quick actions:', error);
      Alert.alert(t('error'), t('failed_to_load_quick_actions'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAction = async (actionId: string) => {
    try {
      const updatedActions = actions.map(action =>
        action.id === actionId ? { ...action, enabled: !action.enabled } : action
      );
      setActions(updatedActions);
      await quickActionsService.toggleQuickAction(actionId);
    } catch (error) {
      console.error('Error toggling quick action:', error);
      Alert.alert(t('error'), t('failed_to_update_quick_action'));
      // Revert on error
      loadQuickActions();
    }
  };

  const handleReorderAction = async (actionId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = actions.findIndex(a => a.id === actionId);
      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === actions.length - 1)
      ) {
        return;
      }

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const newActions = [...actions];
      [newActions[currentIndex], newActions[newIndex]] = [
        newActions[newIndex],
        newActions[currentIndex],
      ];

      // Update order property
      newActions.forEach((action, index) => {
        action.order = index;
      });

      setActions(newActions);
      await quickActionsService.reorderQuickActions(newActions);
    } catch (error) {
      console.error('Error reordering quick action:', error);
      Alert.alert(t('error'), t('failed_to_reorder_quick_actions'));
      loadQuickActions();
    }
  };

  const renderActionItem = (action: QuickAction, index: number) => (
    <View key={action.id} style={styles.actionItem}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
          <Ionicons name={action.icon as any} size={24} color={action.color} />
        </View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionLabel}>{action.label}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
      </View>
      <View style={styles.actionRight}>
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={() => handleReorderAction(action.id, 'up')}
            disabled={index === 0}
            style={styles.reorderButton}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? theme.colors.textSecondary : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleReorderAction(action.id, 'down')}
            disabled={index === actions.length - 1}
            style={styles.reorderButton}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={
                index === actions.length - 1 ? theme.colors.textSecondary : theme.colors.text
              }
            />
          </TouchableOpacity>
        </View>
        <Switch
          value={action.enabled}
          onValueChange={() => handleToggleAction(action.id)}
          trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
          thumbColor={action.enabled ? theme.colors.primary : '#f4f3f4'}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('quick_actions_settings')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('available_quick_actions')}
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            {t('quick_actions_settings_description')}
          </Text>
        </View>

        <View style={styles.actionsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('loading')}...
              </Text>
            </View>
          ) : (
            actions.map((action, index) => renderActionItem(action, index))
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {t('quick_actions_info')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
    },
    placeholder: {
      width: 32,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginTop: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    actionsList: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    actionInfo: {
      flex: 1,
    },
    actionLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 4,
    },
    actionDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    actionRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    reorderButtons: {
      marginRight: 12,
    },
    reorderButton: {
      padding: 4,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
    },
    infoSection: {
      marginTop: 24,
      marginBottom: 32,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
    },
    infoText: {
      fontSize: 13,
      lineHeight: 18,
      marginLeft: 12,
      flex: 1,
    },
  });

export default QuickActionsSettingsScreen;
