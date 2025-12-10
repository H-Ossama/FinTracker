import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { Goal } from '../types';
import { GoalsService } from '../services/goalsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onGoalAdded?: (goal: Goal) => void;
  editingGoal?: Goal | null;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ 
  visible, 
  onClose, 
  onGoalAdded,
  editingGoal 
}) => {
  const { theme } = useTheme();
  const { t, formatCurrency } = useLocalization();
  const insets = useSafeAreaInsets();
  
  const categories = [
    { id: 'vacation', name: t('goalCategory.vacation'), icon: '✈️', color: '#FF9500' },
    { id: 'emergency', name: t('goalCategory.emergency'), icon: '🚨', color: '#FF2D92' },
    { id: 'car', name: t('goalCategory.car'), icon: '🚗', color: '#9013FE' },
    { id: 'house', name: t('goalCategory.house'), icon: '🏠', color: '#5AC8FA' },
    { id: 'education', name: t('goalCategory.education'), icon: '🎓', color: '#7ED321' },
    { id: 'wedding', name: t('goalCategory.wedding'), icon: '💒', color: '#FF3B30' },
    { id: 'retirement', name: t('goalCategory.retirement'), icon: '👴', color: '#32D74B' },
    { id: 'gadgets', name: t('goalCategory.gadgets'), icon: '📱', color: '#4A90E2' },
    { id: 'health', name: t('goalCategory.health'), icon: '🏥', color: '#FF3B30' },
    { id: 'other', name: t('goalCategory.other'), icon: '📝', color: '#8E8E93' },
  ];
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('savings');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetAmount(editingGoal.targetAmount.toString());
      setCurrentAmount(editingGoal.currentAmount.toString());
      setTargetDate(new Date(editingGoal.targetDate));
      setSelectedCategory(editingGoal.category.toLowerCase());
    } else {
      resetForm();
    }
  }, [editingGoal, visible]);

  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    setTargetDate(futureDate);
    setSelectedCategory('savings');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert(t('error'), t('addGoal.fillAllFields'));
      return false;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert(t('error'), t('addGoal.validAmount'));
      return false;
    }
    const currentAmountNum = parseFloat(currentAmount) || 0;
    const targetAmountNum = parseFloat(targetAmount);
    if (currentAmountNum > targetAmountNum) {
      Alert.alert(t('error'), t('addGoal.currentAmountLower'));
      return false;
    }
    if (targetDate <= new Date()) {
      Alert.alert(t('error'), 'Target date must be in the future');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const goalData = {
        title: title.trim(),
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: targetDate.toISOString().split('T')[0],
        category: categories.find(c => c.id === selectedCategory)?.name || 'Savings',
      };

      let result: Goal;
      if (editingGoal) {
        result = await GoalsService.updateGoal(editingGoal.id, goalData) as Goal;
      } else {
        result = await GoalsService.addGoal(goalData);
      }

      onGoalAdded?.(result);
      handleClose();
      Alert.alert(
        t('success'), 
        editingGoal ? t('savingsGoals.goalUpdated') : t('savingsGoals.goalCreated')
      );
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert(t('error'), editingGoal ? t('savingsGoals.updateFailed') : t('savingsGoals.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || targetDate;
    setShowDatePicker(Platform.OS === 'ios');
    setTargetDate(currentDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getQuickDateOptions = () => [
    { label: '3 Months', months: 3 },
    { label: '6 Months', months: 6 },
    { label: '1 Year', months: 12 },
    { label: '2 Years', months: 24 },
    { label: '5 Years', months: 60 },
  ];

  const setQuickDate = (months: number) => {
    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + months);
    setTargetDate(newDate);
  };

  const renderCategoryItem = (category: typeof categories[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory === category.id && styles.categoryItemSelected,
        { borderColor: category.color }
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={[
        styles.categoryName,
        selectedCategory === category.id && styles.categoryNameSelected
      ]} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        
        {/* Dark Header */}
        <View style={[styles.darkHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editingGoal ? t('addGoal.editTitle') : t('addGoal.title')}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={isSubmitting}
              style={styles.headerButton}
            >
              <Text style={[
                styles.saveButtonText,
                isSubmitting && styles.saveButtonTextDisabled
              ]}>
                {isSubmitting ? 'Saving...' : (editingGoal ? t('addGoal.update') : t('addGoal.save'))}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content Container */}
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Goal Title */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addGoal.goalName')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('addGoal.goalNamePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
            />
          </View>

          {/* Target Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addGoal.targetAmount')}</Text>
            <TextInput
              style={styles.input}
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder={t('addGoal.targetAmountPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Current Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addGoal.currentAmount')}</Text>
            <TextInput
              style={styles.input}
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder={t('addGoal.currentAmountPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Target Date */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addGoal.targetDate')}</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(targetDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            {/* Quick Date Options */}
            <View style={styles.quickDatesContainer}>
              <Text style={styles.quickDatesLabel}>Quick Select:</Text>
              <View style={styles.quickDatesRow}>
                {getQuickDateOptions().map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={styles.quickDateButton}
                    onPress={() => setQuickDate(option.months)}
                  >
                    <Text style={styles.quickDateText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addGoal.category')}</Text>
            <View style={styles.categoriesContainer}>
              {categories.map(renderCategoryItem)}
            </View>
          </View>

          {/* Goal Preview */}
          {title && targetAmount && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>{t('addGoal.preview')}</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewGoalTitle} numberOfLines={2} ellipsizeMode="tail">
                    {title}
                  </Text>
                  <Text style={styles.previewCategory}>
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </Text>
                </View>
                <View style={styles.previewAmounts}>
                  <Text style={styles.previewCurrent} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(parseFloat(currentAmount) || 0)}
                  </Text>
                  <Text style={styles.previewTarget} numberOfLines={1} adjustsFontSizeToFit>
                    {t('more_screen_of')} {formatCurrency(parseFloat(targetAmount) || 0)}
                  </Text>
                </View>
                <View style={styles.previewProgress}>
                  <View style={styles.previewProgressBar}>
                    <View style={[
                      styles.previewProgressFill,
                      { 
                        width: `${Math.min(((parseFloat(currentAmount) || 0) / (parseFloat(targetAmount) || 1)) * 100, 100)}%`
                      }
                    ]} />
                  </View>
                </View>
                <Text style={styles.previewDate} numberOfLines={1}>
                  {t('more_screen_target')} {formatDate(targetDate)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
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
  headerButton: {
    width: 60,
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
  saveButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#8E8E93',
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
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  quickDatesContainer: {
    marginTop: 12,
  },
  quickDatesLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  quickDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateButton: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  quickDateText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: '45%',
    flex: 1,
    minWidth: 0,
  },
  categoryItemSelected: {
    backgroundColor: '#F0F4F8',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.text,
    flexShrink: 1,
  },
  categoryNameSelected: {
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 40,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewHeader: {
    marginBottom: 12,
  },
  previewGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  previewCategory: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  previewAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  previewCurrent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 8,
    flexShrink: 1,
  },
  previewTarget: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  previewProgress: {
    marginBottom: 8,
  },
  previewProgressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewProgressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  previewDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default AddGoalModal;