import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Reminder } from '../screens/RemindersScreen';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onComplete: (reminder: Reminder) => void;
  onSnooze: (reminder: Reminder, minutes: number) => void;
  onDelete: (reminder: Reminder) => void;
}

export default function ReminderCard({
  reminder,
  onEdit,
  onComplete,
  onSnooze,
  onDelete,
}: ReminderCardProps) {
  const { isDark } = useTheme();
  const styles = createStyles(isDark);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    } else {
      return `${Math.abs(diffDays)} days ago`;
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (): string => {
    switch (reminder.status) {
      case 'PENDING':
        return '#10B981';
      case 'OVERDUE':
        return '#EF4444';
      case 'COMPLETED':
        return '#6B7280';
      case 'CANCELLED':
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (reminder.status) {
      case 'PENDING':
        return 'time-outline';
      case 'OVERDUE':
        return 'warning-outline';
      case 'COMPLETED':
        return 'checkmark-circle-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      default:
        return 'time-outline';
    }
  };

  const getFrequencyText = (): string => {
    switch (reminder.frequency) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKLY':
        return 'Weekly';
      case 'MONTHLY':
        return 'Monthly';
      case 'QUARTERLY':
        return 'Quarterly';
      case 'YEARLY':
        return 'Yearly';
      case 'CUSTOM':
        return 'Custom';
      default:
        return 'One-time';
    }
  };

  const handleSnoozePress = () => {
    Alert.alert(
      'Snooze Reminder',
      'How long would you like to snooze this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '15 minutes', onPress: () => onSnooze(reminder, 15) },
        { text: '1 hour', onPress: () => onSnooze(reminder, 60) },
        { text: '1 day', onPress: () => onSnooze(reminder, 1440) },
      ]
    );
  };

  const isOverdue = reminder.status === 'OVERDUE' || 
    (reminder.status === 'PENDING' && new Date(reminder.dueDate) < new Date());

  const isSnoozed = reminder.snoozeUntil && new Date(reminder.snoozeUntil) > new Date();

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor() }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {reminder.title}
          </Text>
          <View style={styles.statusContainer}>
            <Ionicons 
              name={getStatusIcon()} 
              size={14} 
              color={getStatusColor()} 
            />
            <Text style={[styles.status, { color: getStatusColor() }]}>
              {reminder.status.toLowerCase()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => onEdit(reminder)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={styles.menuIcon.color} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {reminder.description && (
        <Text style={styles.description} numberOfLines={2}>
          {reminder.description}
        </Text>
      )}

      {/* Amount and Category */}
      <View style={styles.detailsContainer}>
        {reminder.amount && (
          <View style={styles.amountContainer}>
            <Ionicons name="cash-outline" size={16} color={styles.detailIcon.color} />
            <Text style={styles.amount}>
              ${reminder.amount.toFixed(2)}
            </Text>
            {reminder.transactionType && (
              <Text style={[
                styles.transactionType,
                { color: reminder.transactionType === 'INCOME' ? '#10B981' : '#EF4444' }
              ]}>
                {reminder.transactionType.toLowerCase()}
              </Text>
            )}
          </View>
        )}

        {reminder.category && (
          <View style={styles.categoryContainer}>
            <View 
              style={[
                styles.categoryIcon, 
                { backgroundColor: reminder.category.color + '20' }
              ]}
            >
              <Ionicons 
                name={reminder.category.icon as keyof typeof Ionicons.glyphMap} 
                size={14} 
                color={reminder.category.color} 
              />
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>
              {reminder.category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Due Date and Frequency */}
      <View style={styles.timeContainer}>
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar-outline" size={16} color={styles.detailIcon.color} />
          <Text style={[styles.dueDate, isOverdue && styles.overdue]}>
            {formatDate(new Date(reminder.dueDate))} at {formatTime(new Date(reminder.dueDate))}
          </Text>
        </View>

        {reminder.isRecurring && (
          <View style={styles.frequencyContainer}>
            <Ionicons name="repeat-outline" size={14} color={styles.detailIcon.color} />
            <Text style={styles.frequency}>
              {getFrequencyText()}
            </Text>
          </View>
        )}
      </View>

      {/* Snooze indicator */}
      {isSnoozed && (
        <View style={styles.snoozeContainer}>
          <Ionicons name="moon-outline" size={14} color="#8B5CF6" />
          <Text style={styles.snoozeText}>
            Snoozed until {formatTime(new Date(reminder.snoozeUntil!))}
          </Text>
        </View>
      )}

      {/* Completion info */}
      {reminder.isRecurring && reminder.completedCount > 0 && (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>
            Completed {reminder.completedCount} time{reminder.completedCount !== 1 ? 's' : ''}
            {reminder.lastCompleted && (
              <Text style={styles.lastCompleted}>
                {' • Last: '}
                {formatDate(new Date(reminder.lastCompleted))}
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {reminder.status === 'PENDING' && !isSnoozed && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => onComplete(reminder)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.snoozeButton]}
              onPress={handleSnoozePress}
            >
              <Ionicons name="moon-outline" size={16} color="#8B5CF6" />
              <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Snooze</Text>
            </TouchableOpacity>
          </>
        )}

        {reminder.status === 'OVERDUE' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => onComplete(reminder)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => onEdit(reminder)}
            >
              <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Reschedule</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(reminder)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleContainer: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 4,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    status: {
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    menuButton: {
      padding: 4,
    },
    menuIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    description: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#6B7280',
      lineHeight: 20,
      marginBottom: 12,
    },
    detailsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailIcon: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    amount: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    transactionType: {
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    categoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryName: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#6B7280',
      maxWidth: 100,
    },
    timeContainer: {
      marginBottom: 12,
    },
    dueDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    dueDate: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    overdue: {
      color: '#EF4444',
      fontWeight: '500',
    },
    frequencyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    frequency: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    snoozeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#8B5CF6' + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
    },
    snoozeText: {
      fontSize: 12,
      color: '#8B5CF6',
      fontWeight: '500',
    },
    completionContainer: {
      marginBottom: 12,
    },
    completionText: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    lastCompleted: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    actionContainer: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    completeButton: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    snoozeButton: {
      backgroundColor: 'transparent',
      borderColor: '#8B5CF6',
    },
    rescheduleButton: {
      backgroundColor: 'transparent',
      borderColor: '#F59E0B',
    },
    deleteButton: {
      backgroundColor: 'transparent',
      borderColor: '#EF4444',
      paddingHorizontal: 8,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}