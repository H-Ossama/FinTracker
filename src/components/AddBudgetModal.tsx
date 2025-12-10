import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { budgetService } from '../services/budgetService';
import { Budget, BudgetCategory } from '../types';

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onBudgetAdded: () => void;
  monthYear: string;
  existingBudgets: Budget[];
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  visible,
  onClose,
  onBudgetAdded,
  monthYear,
  existingBudgets,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    budgetAmount: '',
    warningThreshold: 80,
    notes: '',
  });

  const styles = createStyles(theme);

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const categoriesData = await budgetService.getBudgetCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      budgetAmount: '',
      warningThreshold: 80,
      notes: '',
    });
  };

  const getAvailableCategories = () => {
    return categories.filter(category => 
      !existingBudgets.some(budget => budget.categoryId === category.id)
    );
  };

  const handleSave = async () => {
    try {
      if (!formData.categoryId || !formData.budgetAmount) {
        Alert.alert('Error', 'Please select a category and enter a budget amount');
        return;
      }

      const budgetAmount = parseFloat(formData.budgetAmount);
      if (isNaN(budgetAmount) || budgetAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid budget amount');
        return;
      }

      const category = categories.find(c => c.id === formData.categoryId);
      if (!category) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      setLoading(true);

      await budgetService.createBudget({
        categoryId: formData.categoryId,
        categoryName: category.name,
        monthYear,
        budgetAmount,
        warningThreshold: formData.warningThreshold,
        notes: formData.notes.trim(),
      });

      resetForm();
      onBudgetAdded();
      onClose();
      Alert.alert('Success', 'Budget created successfully!');
    } catch (error) {
      console.error('Error adding budget:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add budget');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const availableCategories = getAvailableCategories();
  const monthName = new Date(monthYear + '-01').toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        
        {/* Dark Header */}
        <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Budget</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
              <Text style={[styles.saveButtonText, { 
                color: loading ? '#8E8E93' : '#4A90E2' 
              }]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content Container */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Month Info */}
          <View style={[styles.monthInfoCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={[styles.monthInfoText, { color: theme.colors.text }]}>
              Creating budget for {monthName}
            </Text>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category *</Text>
            
            {availableCategories.length === 0 ? (
              <View style={[styles.noCategoriesCard, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="information-circle" size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.noCategoriesTitle, { color: theme.colors.text }]}>
                  All categories have budgets
                </Text>
                <Text style={[styles.noCategoriesSubtitle, { color: theme.colors.textSecondary }]}>
                  Delete an existing budget to add a new one, or wait for next month.
                </Text>
              </View>
            ) : (
              <View style={styles.categoriesGrid}>
                {availableCategories.map((category, index) => (
                  <TouchableOpacity
                    key={`budget-category-${category.id}-${index}`}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: formData.categoryId === category.id 
                          ? category.color + '20' 
                          : theme.colors.surface,
                        borderColor: formData.categoryId === category.id 
                          ? category.color 
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => updateFormData('categoryId', category.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <Ionicons name={category.icon as any} size={24} color={category.color} />
                    </View>
                    <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                      {category.name}
                    </Text>
                    {formData.categoryId === category.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color={category.color} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Budget Amount */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Budget Amount *</Text>
            <View style={[styles.amountInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={formData.budgetAmount}
                onChangeText={(text) => updateFormData('budgetAmount', text)}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={10}
              />
            </View>
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {[100, 200, 500, 1000].map((amount, index) => (
                <TouchableOpacity
                  key={`quick-amount-${amount}-${index}`}
                  style={[styles.quickAmountButton, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => updateFormData('budgetAmount', amount.toString())}
                >
                  <Text style={[styles.quickAmountText, { color: theme.colors.text }]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Warning Threshold */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Warning Threshold</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Get notified when you reach this percentage of your budget
            </Text>
            
            <View style={styles.thresholdOptions}>
              {[70, 80, 90].map((threshold, index) => (
                <TouchableOpacity
                  key={`threshold-${threshold}-${index}`}
                  style={[
                    styles.thresholdOption,
                    {
                      backgroundColor: formData.warningThreshold === threshold 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: formData.warningThreshold === threshold 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => updateFormData('warningThreshold', threshold)}
                >
                  <Text
                    style={[
                      styles.thresholdOptionText,
                      {
                        color: formData.warningThreshold === threshold ? '#FFFFFF' : theme.colors.text,
                      },
                    ]}
                  >
                    {threshold}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              value={formData.notes}
              onChangeText={(text) => updateFormData('notes', text)}
              placeholder="Optional notes about this budget..."
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={200}
            />
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={20} color={theme.colors.primary} />
              <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>Budget Tips</Text>
            </View>
            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>
                • Start with realistic amounts based on past spending
              </Text>
              <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>
                • Review and adjust budgets monthly
              </Text>
              <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>
                • Use the 50/30/20 rule: needs, wants, savings
              </Text>
            </View>
          </View>
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  monthInfoText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  noCategoriesCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  noCategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noCategoriesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '500',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  thresholdOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  thresholdOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsList: {
    marginLeft: 4,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default AddBudgetModal;