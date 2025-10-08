import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { hybridDataService } from '../services/hybridDataService';
import { reminderService } from '../services/reminderService';
import AddReminderModal from '../components/AddReminderModal';
import ReminderCard from '../components/ReminderCard';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  dueDate: Date;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  isActive: boolean;
  isRecurring: boolean;
  autoCreateTransaction: boolean;
  transactionType?: 'INCOME' | 'EXPENSE';
  walletId?: string;
  categoryId?: string;
  notifyBefore?: number;
  enablePushNotification: boolean;
  enableEmailNotification: boolean;
  completedCount: number;
  lastCompleted?: Date;
  nextDue?: Date;
  snoozeUntil?: Date;
  wallet?: {
    id: string;
    name: string;
    type: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export default function RemindersScreen() {
  const { isDark } = useTheme();
  const { addNotification } = useNotification();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');

  const styles = createStyles(isDark);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setIsLoading(true);
      // For now, we'll use mock data since the backend integration is optional
      const mockReminders: Reminder[] = [
        {
          id: '1',
          title: 'Monthly Rent',
          description: 'Pay monthly rent',
          amount: 1200,
          dueDate: new Date(2025, 9, 15), // October 15, 2025
          frequency: 'MONTHLY',
          status: 'PENDING',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: true,
          transactionType: 'EXPENSE',
          walletId: 'wallet1',
          categoryId: 'category1',
          notifyBefore: 60,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 8,
          nextDue: new Date(2025, 10, 15), // November 15, 2025
          category: {
            id: 'category1',
            name: 'Housing',
            icon: 'home',
            color: '#3B82F6',
          },
          wallet: {
            id: 'wallet1',
            name: 'Main Checking',
            type: 'BANK',
          },
        },
        {
          id: '2',
          title: 'Gym Membership',
          description: 'Monthly gym payment',
          amount: 45,
          dueDate: new Date(2025, 9, 20), // October 20, 2025
          frequency: 'MONTHLY',
          status: 'OVERDUE',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: false,
          notifyBefore: 120,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 3,
          category: {
            id: 'category2',
            name: 'Health & Fitness',
            icon: 'fitness',
            color: '#10B981',
          },
        },
        {
          id: '3',
          title: 'Weekly Groceries',
          description: 'Grocery shopping reminder',
          dueDate: new Date(2025, 9, 12), // October 12, 2025
          frequency: 'WEEKLY',
          status: 'COMPLETED',
          isActive: true,
          isRecurring: true,
          autoCreateTransaction: false,
          notifyBefore: 30,
          enablePushNotification: true,
          enableEmailNotification: false,
          completedCount: 15,
          lastCompleted: new Date(2025, 9, 12),
          nextDue: new Date(2025, 9, 19), // October 19, 2025
          category: {
            id: 'category3',
            name: 'Groceries',
            icon: 'basket',
            color: '#F59E0B',
          },
        },
      ];

      setReminders(mockReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to load reminders',
        type: 'error',
        read: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleAddReminder = () => {
    setSelectedReminder(null);
    setShowAddModal(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowAddModal(true);
  };

  const handleCompleteReminder = async (reminder: Reminder) => {
    try {
      // Update reminder status
      const updatedReminders = reminders.map(r =>
        r.id === reminder.id
          ? {
              ...r,
              status: 'COMPLETED' as const,
              lastCompleted: new Date(),
              completedCount: r.completedCount + 1,
              // If recurring, calculate next due date
              ...(r.isRecurring && {
                status: 'PENDING' as const,
                dueDate: calculateNextDueDate(r.dueDate, r.frequency),
              }),
            }
          : r
      );

      setReminders(updatedReminders);

      addNotification({
        title: 'Reminder Completed',
        message: `"${reminder.title}" has been marked as completed`,
        type: 'success',
        read: false,
      });

      // If it's set to auto-create transaction, show confirmation
      if (reminder.autoCreateTransaction && reminder.amount && reminder.transactionType) {
        Alert.alert(
          'Create Transaction?',
          `Would you like to create a ${reminder.transactionType.toLowerCase()} transaction for $${reminder.amount}?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              onPress: () => handleCreateTransaction(reminder),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to complete reminder',
        type: 'error',
        read: false,
      });
    }
  };

  const handleSnoozeReminder = async (reminder: Reminder, minutes: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

      const updatedReminders = reminders.map(r =>
        r.id === reminder.id
          ? { ...r, snoozeUntil }
          : r
      );

      setReminders(updatedReminders);

      addNotification({
        title: 'Reminder Snoozed',
        message: `"${reminder.title}" snoozed for ${minutes} minutes`,
        type: 'info',
        read: false,
      });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to snooze reminder',
        type: 'error',
        read: false,
      });
    }
  };

  const handleDeleteReminder = async (reminder: Reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${reminder.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedReminders = reminders.filter(r => r.id !== reminder.id);
              setReminders(updatedReminders);

              addNotification({
                title: 'Reminder Deleted',
                message: `"${reminder.title}" has been deleted`,
                type: 'info',
                read: false,
              });
            } catch (error) {
              console.error('Error deleting reminder:', error);
              addNotification({
                title: 'Error',
                message: 'Failed to delete reminder',
                type: 'error',
                read: false,
              });
            }
          },
        },
      ]
    );
  };

  const handleCreateTransaction = async (reminder: Reminder) => {
    try {
      if (!reminder.amount || !reminder.transactionType || !reminder.walletId) {
        throw new Error('Missing transaction data');
      }

      // Create transaction using hybrid data service
      await hybridDataService.addTransaction({
        amount: reminder.amount,
        description: `Auto: ${reminder.title}`,
        type: reminder.transactionType,
        date: new Date().toISOString(),
        walletId: reminder.walletId,
        categoryId: reminder.categoryId || '',
      });

      addNotification({
        title: 'Transaction Created',
        message: `${reminder.transactionType.toLowerCase()} of $${reminder.amount} created for "${reminder.title}"`,
        type: 'success',
        read: false,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to create transaction',
        type: 'error',
        read: false,
      });
    }
  };

  const calculateNextDueDate = (currentDate: Date, frequency: string): Date => {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  };

  const getFilteredReminders = (): Reminder[] => {
    switch (filterStatus) {
      case 'active':
        return reminders.filter(r => r.isActive && r.status === 'PENDING');
      case 'overdue':
        return reminders.filter(r => r.status === 'OVERDUE');
      case 'completed':
        return reminders.filter(r => r.status === 'COMPLETED');
      default:
        return reminders;
    }
  };

  const getStatusCounts = () => {
    return {
      all: reminders.length,
      active: reminders.filter(r => r.isActive && r.status === 'PENDING').length,
      overdue: reminders.filter(r => r.status === 'OVERDUE').length,
      completed: reminders.filter(r => r.status === 'COMPLETED').length,
    };
  };

  const statusCounts = getStatusCounts();
  const filteredReminders = getFilteredReminders();

  const renderFilterButton = (
    status: typeof filterStatus,
    label: string,
    count: number,
    color: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.filterButtonActive,
        { borderColor: color },
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterStatus === status && styles.filterButtonTextActive,
          { color: filterStatus === status ? color : styles.filterButtonText.color },
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderReminder = ({ item }: { item: Reminder }) => (
    <ReminderCard
      reminder={item}
      onEdit={handleEditReminder}
      onComplete={handleCompleteReminder}
      onSnooze={handleSnoozeReminder}
      onDelete={handleDeleteReminder}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddReminder}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', statusCounts.all, '#8B5CF6')}
        {renderFilterButton('active', 'Active', statusCounts.active, '#10B981')}
        {renderFilterButton('overdue', 'Overdue', statusCounts.overdue, '#EF4444')}
        {renderFilterButton('completed', 'Completed', statusCounts.completed, '#6B7280')}
      </View>

      {/* Reminders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : filteredReminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alarm-outline" size={64} color={styles.emptyIcon.color} />
          <Text style={styles.emptyTitle}>
            {filterStatus === 'all' ? 'No Reminders' : `No ${filterStatus} reminders`}
          </Text>
          <Text style={styles.emptyDescription}>
            {filterStatus === 'all'
              ? 'Create your first reminder to get started'
              : `You don't have any ${filterStatus} reminders`}
          </Text>
          {filterStatus === 'all' && (
            <TouchableOpacity style={styles.createButton} onPress={handleAddReminder}>
              <Text style={styles.createButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredReminders}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Reminder Modal */}
      <AddReminderModal
        visible={showAddModal}
        reminder={selectedReminder}
        onClose={() => {
          setShowAddModal(false);
          setSelectedReminder(null);
        }}
        onSave={(reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
          if (selectedReminder) {
            // Edit existing reminder
            const updatedReminders = reminders.map(r =>
              r.id === selectedReminder.id ? { ...r, ...reminderData } : r
            );
            setReminders(updatedReminders);
            addNotification({
              title: 'Reminder Updated',
              message: `"${reminderData.title}" has been updated`,
              type: 'success',
              read: false,
            });
          } else {
            // Add new reminder
            const newReminder: Reminder = {
              id: Date.now().toString(),
              ...reminderData,
              status: 'PENDING',
              completedCount: 0,
            };
            setReminders([newReminder, ...reminders]);
            addNotification({
              title: 'Reminder Created',
              message: `"${reminderData.title}" has been created`,
              type: 'success',
              read: false,
            });
          }
          setShowAddModal(false);
          setSelectedReminder(null);
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#F8F9FA',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
    },
    addButton: {
      backgroundColor: '#3B82F6',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
      gap: 8,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#6B7280' : '#D1D5DB',
      backgroundColor: isDark ? '#4B5563' : '#F9FAFB',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: isDark ? '#374151' : '#FFFFFF',
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    filterButtonTextActive: {
      fontWeight: '600',
    },
    listContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIcon: {
      color: isDark ? '#6B7280' : '#9CA3AF',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1F2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: '#3B82F6',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}