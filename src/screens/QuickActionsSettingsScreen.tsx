import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SectionList,
  ActivityIndicator,
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'category' | 'alphabetical'>('category');

  const styles = createStyles(theme);

  useEffect(() => {
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      setLoading(true);
      const quickActions = await quickActionsService.getAllActionsWithUserSettings();
      setActions(quickActions);
    } catch (error) {
      console.error('Error loading quick actions:', error);
      Alert.alert(t('error'), t('failed_to_load_quick_actions'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAction = useCallback(async (actionId: string) => {
    try {
      const updatedActions = actions.map(action =>
        action.id === actionId ? { ...action, enabled: !action.enabled } : action
      );
      setActions(updatedActions);
      
      // Save only enabled actions to storage
      const enabledActions = updatedActions.filter(action => action.enabled);
      await quickActionsService.saveQuickActions(enabledActions);
    } catch (error) {
      console.error('Error toggling quick action:', error);
      Alert.alert(t('error'), t('failed_to_update_quick_action'));
      // Revert on error
      loadQuickActions();
    }
  }, [actions, t]);

  const handleReorderAction = useCallback(async (actionId: string, direction: 'up' | 'down') => {
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
      
      // Save only enabled actions to storage
      const enabledActions = newActions.filter(action => action.enabled);
      await quickActionsService.saveQuickActions(enabledActions);
    } catch (error) {
      console.error('Error reordering quick action:', error);
      Alert.alert(t('error'), t('failed_to_reorder_quick_actions'));
      loadQuickActions();
    }
  }, [actions, t]);

  // Organize actions by category or alphabetically
  const { sectionData, filteredActionsCount } = useMemo(() => {
    const filteredActions = actions.filter(action =>
      searchQuery === '' ||
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortMode === 'alphabetical') {
      // Sort alphabetically and group by first letter
      const sortedActions = filteredActions.sort((a, b) => a.label.localeCompare(b.label));
      const letterGroups: { [key: string]: QuickAction[] } = {};
      
      sortedActions.forEach(action => {
        const firstLetter = action.label.charAt(0).toUpperCase();
        if (!letterGroups[firstLetter]) {
          letterGroups[firstLetter] = [];
        }
        letterGroups[firstLetter].push(action);
      });

      const alphabeticalSections = Object.keys(letterGroups)
        .sort()
        .map(letter => ({
          title: `📝 ${letter}`,
          data: letterGroups[letter]
        }));

      return {
        sectionData: alphabeticalSections,
        filteredActionsCount: filteredActions.length
      };
    } else {
      // Group by category (original behavior)
      const categories = {
        financial: { title: '💰 Financial Actions', data: [] as QuickAction[] },
        navigation: { title: '🧭 Navigation', data: [] as QuickAction[] },
        tools: { title: '🔧 Tools & Features', data: [] as QuickAction[] },
        settings: { title: '⚙️ Settings', data: [] as QuickAction[] },
      };

      filteredActions.forEach(action => {
        if (categories[action.category]) {
          categories[action.category].data.push(action);
        }
      });

      return {
        sectionData: Object.values(categories).filter(category => category.data.length > 0),
        filteredActionsCount: filteredActions.length
      };
    }
  }, [actions, searchQuery, sortMode]);

  const renderActionItem = useCallback(({ item: action, index }: { item: QuickAction; index: number }) => (
    <View key={action.id || `action-${index}`} style={styles.actionItem}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
          <Ionicons name={action.icon as any} size={24} color={action.color} />
        </View>
        <View style={styles.actionInfo}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            {action.isModal && (
              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>Modal</Text>
              </View>
            )}
          </View>
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
  ), [actions, theme, handleReorderAction, handleToggleAction]);

  const renderSectionHeader = useCallback(({ section }: { section: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>
        {section.data.length} items
      </Text>
    </View>
  ), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('quick_actions_settings')}
        </Text>
        <TouchableOpacity 
          onPress={() => setSortMode(sortMode === 'category' ? 'alphabetical' : 'category')}
          style={styles.sortButton}
        >
          <Ionicons 
            name={sortMode === 'category' ? 'list' : 'albums'} 
            size={16} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.sortButtonText, { color: theme.colors.primary }]}>
            {sortMode === 'category' ? 'A-Z' : 'Cat'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search actions..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {(searchQuery.length > 0 || sortMode === 'alphabetical') && (
          <View style={styles.searchResults}>
            <Text style={[styles.searchResultsText, { color: theme.colors.textSecondary }]}>
              {searchQuery.length > 0 
                ? `${filteredActionsCount} results found • Sorted by ${sortMode}`
                : `Showing all actions • Sorted by ${sortMode}`
              }
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.instructionsCard}>
          <View style={[styles.instructionHeader, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={[styles.instructionTitle, { color: theme.colors.text }]}>
              How to Use Quick Actions
            </Text>
          </View>
          <View style={styles.instructionContent}>
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '600' }}>Press and hold</Text> the floating action button at the bottom of your screen
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '600' }}>Slide your finger</Text> to the action you want while holding
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '600' }}>Release</Text> to navigate to that screen instantly
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Customize Quick Actions
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Enable the actions you use most frequently. You can reorder them by using the up/down arrows. Enabled actions will appear in the quick action menu.
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
            <View>
              {sectionData.map((section, sectionIndex) => (
                <View key={sectionIndex}>
                  {renderSectionHeader({ section })}
                  {section.data.map((item, index) => renderActionItem({ item, index }))}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.tipBox, { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success }]}>
            <Ionicons name="bulb" size={20} color={theme.colors.success} />
            <Text style={[styles.tipText, { color: theme.colors.text }]}>
              <Text style={{ fontWeight: '600' }}>Tip: </Text>
              Enable 3-5 actions for the best experience. Too many actions can make the menu cluttered.
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
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'transparent',
      gap: 4,
    },
    sortButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    contentContainer: {
      flex: 1,
    },
    sectionListContent: {
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
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    actionLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      flex: 1,
    },
    modalBadge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
    },
    modalBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.primary,
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
    instructionsCard: {
      marginTop: 16,
      marginBottom: 24,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    instructionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    instructionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    instructionContent: {
      padding: 16,
      paddingTop: 8,
    },
    instructionStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    stepNumberText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '700',
    },
    stepText: {
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
    },
    infoSection: {
      marginTop: 24,
      marginBottom: 32,
    },
    tipBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    tipText: {
      fontSize: 13,
      lineHeight: 18,
      marginLeft: 12,
      flex: 1,
    },
    sectionHeader: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '500',
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginLeft: 60,
    },
    sectionSeparator: {
      height: 8,
      backgroundColor: theme.colors.card,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      height: 44,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    searchResults: {
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    searchResultsText: {
      fontSize: 12,
      fontStyle: 'italic',
    },
  });

export default QuickActionsSettingsScreen;
