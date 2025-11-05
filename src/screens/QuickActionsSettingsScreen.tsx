import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
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
  const [addScreenModalVisible, setAddScreenModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [enabledCount, setEnabledCount] = useState(0);
  const [maxActions] = useState(quickActionsService.getMaxEnabledActions());

  const styles = createStyles(theme);

  const availableScreens = useMemo(
    () => quickActionsService.getAvailableScreenOptions(actions),
    [actions]
  );

  const filteredAvailableScreens = useMemo(() => {
    const q = modalSearchQuery.trim().toLowerCase();
    if (!q) return availableScreens;
    return availableScreens.filter(opt =>
      opt.label.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      opt.routeName.toLowerCase().includes(q)
    );
  }, [availableScreens, modalSearchQuery]);

  const loadQuickActions = useCallback(async () => {
    try {
      setLoading(true);
      const quickActions = await quickActionsService.getAllActionsWithUserSettings();
      setActions(quickActions);
      const enabled = quickActions.filter(action => action.enabled).length;
      setEnabledCount(enabled);
    } catch (error) {
      console.error('Error loading quick actions:', error);
      Alert.alert(t('error'), t('failed_to_load_quick_actions'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadQuickActions();
  }, [loadQuickActions]);

  const handleToggleAction = useCallback(async (actionId: string) => {
    if (isSaving) {
      return;
    }

    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    // Check if we're trying to enable an action when we're at the limit
    if (!action.enabled && enabledCount >= maxActions) {
      Alert.alert(
        t('limit_reached') || 'Limit Reached',
        t('max_quick_actions_message') || `You can only have ${maxActions} quick actions enabled at once. Please disable another action first.`,
        [{ text: t('ok') || 'OK' }]
      );
      return;
    }

    try {
      setIsSaving(true);
      const updatedActions = actions.map(actionItem =>
        actionItem.id === actionId ? { ...actionItem, enabled: !actionItem.enabled } : actionItem
      );
      setActions(updatedActions);
      
      // Update enabled count
      const newEnabledCount = updatedActions.filter(a => a.enabled).length;
      setEnabledCount(newEnabledCount);
      
      await quickActionsService.saveQuickActions(updatedActions);
    } catch (error) {
      console.error('Error toggling quick action:', error);
      Alert.alert(t('error'), t('failed_to_update_quick_action'));
      loadQuickActions();
    } finally {
      setIsSaving(false);
    }
  }, [actions, isSaving, t, loadQuickActions, enabledCount, maxActions]);

  const handleReorderAction = useCallback(async (actionId: string, direction: 'up' | 'down') => {
    if (isSaving) {
      return;
    }

    try {
      const currentIndex = actions.findIndex(a => a.id === actionId);
      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === actions.length - 1)
      ) {
        return;
      }

      setIsSaving(true);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const newActions = [...actions];
      [newActions[currentIndex], newActions[newIndex]] = [
        newActions[newIndex],
        newActions[currentIndex],
      ];

      newActions.forEach((action, index) => {
        action.order = index;
      });

      setActions(newActions);
      await quickActionsService.saveQuickActions(newActions);
    } catch (error) {
      console.error('Error reordering quick action:', error);
      Alert.alert(t('error'), t('failed_to_reorder_quick_actions'));
      loadQuickActions();
    } finally {
      setIsSaving(false);
    }
  }, [actions, isSaving, t, loadQuickActions]);

  const handleAddScreenShortcut = useCallback(async (screenId: string) => {
    if (isSaving) {
      return;
    }

    // Check if we're at the limit before adding
    if (enabledCount >= maxActions) {
      Alert.alert(
        t('limit_reached') || 'Limit Reached',
        t('max_quick_actions_message') || `You can only have ${maxActions} quick actions enabled at once. Please disable some actions first.`,
        [{ text: t('ok') || 'OK' }]
      );
      return;
    }

    try {
      setIsSaving(true);
      const updatedActions = await quickActionsService.addScreenAction(screenId);
      setActions(updatedActions);
      const newEnabledCount = updatedActions.filter(a => a.enabled).length;
      setEnabledCount(newEnabledCount);
      setAddScreenModalVisible(false);
      setModalSearchQuery(''); // Clear search query
    } catch (error) {
      console.error('Error adding quick action screen:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to add this screen right now. Please try again later.';
      Alert.alert(t('error'), errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, t, enabledCount, maxActions]);

  const handleRemoveAction = useCallback(async (actionId: string) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedActions = await quickActionsService.removeScreenAction(actionId);
      setActions(updatedActions);
      const newEnabledCount = updatedActions.filter(a => a.enabled).length;
      setEnabledCount(newEnabledCount);
    } catch (error) {
      console.error('Error removing quick action:', error);
      Alert.alert(t('error'), 'Unable to remove this action. Only custom actions can be removed.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, t]);

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

  const renderActionItem = useCallback(({ item: action, index }: { item: QuickAction; index: number }) => {
    const canToggle = action.enabled || enabledCount < maxActions;
    
    return (
      <View key={action.id || `action-${index}`} style={styles.actionItem}>
        <View style={styles.actionLeft}>
          <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
            <Ionicons name={action.icon as any} size={20} color={action.color} />
          </View>
          <View style={styles.actionInfo}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <View style={styles.badgeContainer}>
                {action.isModal && (
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>Modal</Text>
                  </View>
                )}
                {action.isCustom && (
                  <View style={[styles.customBadge, { backgroundColor: theme.colors.success + '20' }]}>
                    <Text style={[styles.customBadgeText, { color: theme.colors.success }]}>Custom</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </View>
        </View>
        <View style={styles.actionRight}>
          {action.isCustom && (
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.colors.error + '15' }]}
              onPress={() => handleRemoveAction(action.id)}
              disabled={isSaving}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          )}
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
          <View style={styles.switchContainer}>
            <Switch
              value={action.enabled}
              onValueChange={() => handleToggleAction(action.id)}
              disabled={!canToggle || isSaving}
              trackColor={{ 
                false: canToggle ? '#767577' : theme.colors.textSecondary + '40', 
                true: theme.colors.primary + '80' 
              }}
              thumbColor={action.enabled ? theme.colors.primary : (canToggle ? '#f4f3f4' : theme.colors.textSecondary)}
            />
            {!canToggle && !action.enabled && (
              <Text style={[styles.limitHint, { color: theme.colors.textSecondary }]}>
                Limit reached
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }, [actions, theme, handleReorderAction, handleToggleAction, handleRemoveAction, isSaving, enabledCount, maxActions]);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        horizontal={false}
        directionalLockEnabled={true}
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false}
        bounces={true}
        bouncesZoom={false}
      >
        {/* Limit Information Section */}
        <View style={styles.limitSection}>
          <View style={[styles.limitCard, { 
            backgroundColor: theme.colors.card, 
            borderColor: enabledCount >= maxActions ? theme.colors.warning : theme.colors.border 
          }]}>
            <View style={styles.limitHeader}>
              <View style={[styles.limitIcon, { 
                backgroundColor: enabledCount >= maxActions ? theme.colors.warning + '20' : theme.colors.primary + '20' 
              }]}>
                <Ionicons 
                  name={enabledCount >= maxActions ? "warning" : "flash"} 
                  size={20} 
                  color={enabledCount >= maxActions ? theme.colors.warning : theme.colors.primary} 
                />
              </View>
              <Text style={[styles.limitTitle, { color: theme.colors.text }]}>
                Quick Actions Limit
              </Text>
            </View>
            <View style={styles.limitContent}>
              <Text style={[styles.limitDescription, { color: theme.colors.textSecondary }]}>
                You can enable up to {maxActions} quick actions at once for optimal performance.
              </Text>
              <View style={styles.limitStatus}>
                <View style={styles.limitBar}>
                  <View style={[styles.limitBarBackground, { backgroundColor: theme.colors.border }]} />
                  <View style={[
                    styles.limitBarFill, 
                    { 
                      backgroundColor: enabledCount >= maxActions ? theme.colors.warning : theme.colors.primary,
                      width: `${Math.min((enabledCount / maxActions) * 100, 100)}%`
                    }
                  ]} />
                </View>
                <Text style={[styles.limitText, { 
                  color: enabledCount >= maxActions ? theme.colors.warning : theme.colors.text 
                }]}>
                  {enabledCount} / {maxActions} enabled
                </Text>
              </View>
              {enabledCount >= maxActions && (
                <View style={[styles.warningBanner, { backgroundColor: theme.colors.warning + '15', borderColor: theme.colors.warning + '50' }]}>
                  <Ionicons name="warning" size={16} color={theme.colors.warning} />
                  <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                    You've reached the maximum limit. Disable some actions to add new ones.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Customize Quick Actions
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Enable the actions you use most frequently (up to {maxActions} actions). You can reorder them by using the up/down arrows. Enabled actions will appear in the quick action menu.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: theme.colors.primary + '10',
              borderColor: theme.colors.primary + '50',
              opacity: (availableScreens.length === 0 || isSaving || enabledCount >= maxActions) ? 0.6 : 1,
            },
          ]}
          onPress={() => setAddScreenModalVisible(true)}
          disabled={availableScreens.length === 0 || isSaving || enabledCount >= maxActions}
        >
          <Ionicons
            name={availableScreens.length === 0 ? 'checkmark-circle-outline' : enabledCount >= maxActions ? 'warning' : 'add'}
            size={18}
            color={theme.colors.primary}
          />
          <Text
            style={[
              styles.addButtonText,
              { color: theme.colors.primary },
            ]}
          >
            {availableScreens.length === 0
              ? 'All available screens added'
              : enabledCount >= maxActions
              ? `Maximum ${maxActions} actions reached`
              : 'Add Screen Shortcut'}
          </Text>
        </TouchableOpacity>

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
              You can enable up to {maxActions} actions for the best experience. The quick action menu works best with 3-5 frequently used actions.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={addScreenModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isSaving) {
            setAddScreenModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Screen Shortcut
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  if (!isSaving) {
                    setAddScreenModalVisible(false);
                  }
                }}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}> 
              Quickly pin additional app screens to the quick action wheel.
            </Text>

            <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, marginBottom: 12 }]}> 
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search screens..."
                placeholderTextColor={theme.colors.textSecondary}
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {modalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchQuery('')} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {filteredAvailableScreens.length === 0 ? (
                <View style={styles.emptyModalState}>
                  <Ionicons name="checkmark-circle" size={36} color={theme.colors.success} />
                  <Text style={[styles.emptyModalText, { color: theme.colors.textSecondary }]}> 
                    No matching screens found.
                  </Text>
                </View>
              ) : (
                filteredAvailableScreens.map(option => (
                  <View key={option.id} style={[styles.modalOption, { borderColor: theme.colors.border }]}> 
                    <View style={styles.modalOptionInfo}>
                      <View style={[styles.modalOptionIcon, { backgroundColor: option.color + '20' }]}> 
                        <Ionicons name={option.icon as any} size={22} color={option.color} />
                      </View>
                      <View style={styles.modalOptionCopy}>
                        <Text style={[styles.modalOptionLabel, { color: theme.colors.text }]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.modalOptionDescription, { color: theme.colors.textSecondary }]}> 
                          {option.description}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalOptionButton, { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.6 : 1 }]}
                      onPress={() => handleAddScreenShortcut(option.id)}
                      disabled={isSaving}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.modalOptionButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      paddingTop: 60,
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
      paddingHorizontal: 20,
    },
    scrollViewContent: {
      paddingBottom: 40,
      flexGrow: 1,
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
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      marginBottom: 16,
      gap: 8,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
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
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
    },
    modalBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    customBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    customBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    actionDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    actionRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    removeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    modalCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 32,
      maxHeight: '75%',
      width: '100%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalCloseButton: {
      padding: 6,
      borderRadius: 16,
    },
    modalSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 16,
    },
    modalScroll: {
      marginHorizontal: -4,
      paddingHorizontal: 4,
    },
    emptyModalState: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    emptyModalText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    modalOption: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalOptionInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    modalOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modalOptionCopy: {
      flex: 1,
    },
    modalOptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
    },
    modalOptionDescription: {
      fontSize: 12,
      lineHeight: 16,
    },
    modalOptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    modalOptionButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
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
    // Limit Section Styles
    limitSection: {
      marginTop: 16,
      marginBottom: 16,
    },
    limitCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
    },
    limitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    limitIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    limitTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    limitContent: {
      gap: 12,
    },
    limitDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    limitStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    limitBar: {
      flex: 1,
      height: 8,
      position: 'relative',
      borderRadius: 4,
      overflow: 'hidden',
    },
    limitBarBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 4,
    },
    limitBarFill: {
      height: '100%',
      borderRadius: 4,
      minWidth: 2,
    },
    limitText: {
      fontSize: 14,
      fontWeight: '600',
      minWidth: 80,
      textAlign: 'right',
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
    },
    warningText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    switchContainer: {
      alignItems: 'center',
      gap: 4,
    },
    limitHint: {
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

export default QuickActionsSettingsScreen;
