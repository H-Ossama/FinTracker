import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { billsService } from '../services/billsService';
import { localStorageService } from '../services/localStorageService';
import { Bill, BillCategory } from '../types';
import { useFocusEffect } from '@react-navigation/native';

const BillsTrackerScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'overdue' | 'upcoming' | 'paid'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [selectedBillForEdit, setSelectedBillForEdit] = useState<Bill | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Add bill form state
  const [newBill, setNewBill] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    frequency: 'monthly' as Bill['frequency'],
    category: '',
    categoryId: '',
    isRecurring: true,
    isAutoPay: false,
    reminderDays: 3,
    remindersPerDay: 1,
    notes: '',
  });

  // Edit bill form state
  const [editBill, setEditBill] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
    frequency: 'monthly' as Bill['frequency'],
    category: '',
    categoryId: '',
    isRecurring: true,
    isAutoPay: false,
    reminderDays: 3,
    remindersPerDay: 1,
    notes: '',
  });

  const styles = createStyles(theme);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      if (__DEV__) {
        console.log('🔄 Loading bills data...');
      }
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout')), 10000);
      });
      
      const loadPromise = (async () => {
        // Initialize categories first
        await billsService.initializeCategories();
        if (__DEV__) {
          console.log('✅ Categories initialized');
        }
        
        // Load all data
        const [billsData, categoriesData, analyticsData, walletsData] = await Promise.all([
          billsService.getAllBills(),
          billsService.getBillCategories(),
          billsService.getBillsAnalytics(),
          localStorageService.getWallets(),
        ]);
        
        if (__DEV__) {
          console.log('📊 Loaded data:', { 
            billsCount: billsData.length, 
            categoriesCount: categoriesData.length,
            walletsCount: walletsData.length
          });
        }
        
        return { billsData, categoriesData, analyticsData, walletsData };
      })();
      
      const result = await Promise.race([loadPromise, timeoutPromise]) as {
        billsData: Bill[];
        categoriesData: BillCategory[];
        analyticsData: any;
        walletsData: any[];
      };
      
      setBills(result.billsData);
      setCategories(result.categoriesData);
      setAnalytics(result.analyticsData);
      setWallets(result.walletsData);
      if (result.walletsData.length > 0 && !selectedWallet) {
        setSelectedWallet(result.walletsData[0].id);
      }
    } catch (error) {
      console.error('❌ Error loading bills data:', error);
      Alert.alert('Error', 'Failed to load bills data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Set empty data to prevent infinite loading
      setBills([]);
      setCategories([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log('✅ Bills loading complete');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredBills = () => {
    if (selectedFilter === 'all') return bills;
    return bills.filter(bill => bill.status === selectedFilter);
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    if (wallets.length === 0) {
      Alert.alert('No Wallets', 'Please add a wallet first to make payments.');
      return;
    }
    setSelectedBillForPayment(bill);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedBillForPayment || !selectedWallet) return;
    
    try {
      setShowPaymentModal(false);
      const selectedWalletData = wallets.find(w => w.id === selectedWallet);
      
      if (selectedWalletData && selectedWalletData.balance < selectedBillForPayment.amount) {
        Alert.alert(
          'Insufficient Funds',
          `Your ${selectedWalletData.name} has insufficient balance. Current balance: ${formatCurrency(selectedWalletData.balance)}, Required: ${formatCurrency(selectedBillForPayment.amount)}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pay Anyway', onPress: () => performPayment() }
          ]
        );
      } else {
        await performPayment();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const performPayment = async () => {
    if (!selectedBillForPayment || !selectedWallet) return;
    
    try {
      if (__DEV__) {
        console.log('🚀 Starting payment process for bill:', selectedBillForPayment.title);
      }
      await billsService.markBillAsPaid(selectedBillForPayment.id, selectedWallet, selectedBillForPayment.amount);
      
      // Add a small delay to ensure data is properly saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (__DEV__) {
        console.log('🔄 Reloading bills data after payment...');
      }
      await loadData();
      setSelectedBillForPayment(null);
      
      Alert.alert('Success', `Payment of ${formatCurrency(selectedBillForPayment.amount)} processed successfully!`);
      console.log('✅ Payment process completed successfully');
    } catch (error) {
      console.error('❌ Error making payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setSelectedBillForEdit(bill);
    setEditBill({
      title: bill.title,
      description: bill.description || '',
      amount: bill.amount.toString(),
      dueDate: bill.nextDueDate.split('T')[0],
      frequency: bill.frequency,
      category: bill.category,
      categoryId: bill.categoryId,
      isRecurring: bill.isRecurring,
      isAutoPay: bill.isAutoPay,
      reminderDays: bill.reminderDays,
      remindersPerDay: bill.remindersPerDay,
      notes: bill.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateBill = async () => {
    try {
      if (!editBill.title || !editBill.amount || !editBill.categoryId || !selectedBillForEdit) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const category = categories.find(c => c.id === editBill.categoryId);
      if (!category) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      await billsService.updateBill(selectedBillForEdit.id, {
        title: editBill.title,
        description: editBill.description,
        amount: parseFloat(editBill.amount),
        nextDueDate: editBill.dueDate,
        frequency: editBill.frequency,
        category: category.name,
        categoryId: editBill.categoryId,
        isRecurring: editBill.isRecurring,
        isAutoPay: editBill.isAutoPay,
        reminderDays: editBill.reminderDays,
        remindersPerDay: editBill.remindersPerDay,
        notes: editBill.notes,
      });

      setShowEditModal(false);
      setSelectedBillForEdit(null);
      resetEditForm();
      await loadData();
      Alert.alert('Success', 'Bill updated successfully!');
    } catch (error) {
      console.error('Error updating bill:', error);
      Alert.alert('Error', 'Failed to update bill');
    }
  };

  const resetEditForm = () => {
    setEditBill({
      title: '',
      description: '',
      amount: '',
      dueDate: '',
      frequency: 'monthly',
      category: '',
      categoryId: '',
      isRecurring: true,
      isAutoPay: false,
      reminderDays: 3,
      remindersPerDay: 1,
      notes: '',
    });
  };

  const handleDeleteBill = async (bill: Bill) => {
    try {
      Alert.alert(
        'Delete Bill',
        `Are you sure you want to delete "${bill.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await billsService.deleteBill(bill.id);
              await loadData();
              Alert.alert('Success', 'Bill deleted!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting bill:', error);
      Alert.alert('Error', 'Failed to delete bill');
    }
  };

  const handleAddBill = async () => {
    try {
      if (!newBill.title || !newBill.amount || !newBill.categoryId) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const category = categories.find(c => c.id === newBill.categoryId);
      if (!category) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      await billsService.createBill({
        title: newBill.title,
        description: newBill.description,
        amount: parseFloat(newBill.amount),
        dueDate: newBill.dueDate,
        frequency: newBill.frequency,
        category: category.name,
        categoryId: newBill.categoryId,
        isRecurring: newBill.isRecurring,
        isAutoPay: newBill.isAutoPay,
        status: 'upcoming',
        reminderDays: newBill.reminderDays,
        remindersPerDay: newBill.remindersPerDay,
        notes: newBill.notes,
      });

      setShowAddModal(false);
      resetForm();
      await loadData();
      Alert.alert('Success', 'Bill added successfully!');
    } catch (error) {
      console.error('Error adding bill:', error);
      Alert.alert('Error', 'Failed to add bill');
    }
  };

  const resetForm = () => {
    setNewBill({
      title: '',
      description: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      category: '',
      categoryId: '',
      isRecurring: true,
      isAutoPay: false,
      reminderDays: 3,
      remindersPerDay: 1,
      notes: '',
    });
  };

  const getStatusColor = (status: Bill['status']) => {
    switch (status) {
      case 'overdue': return '#FF6B6B';
      case 'pending': return '#FFB02E';
      case 'paid': return '#4ECDC4';
      case 'upcoming': return '#45B7D1';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: Bill['status']) => {
    switch (status) {
      case 'overdue': return 'warning';
      case 'pending': return 'time';
      case 'paid': return 'checkmark-circle';
      case 'upcoming': return 'calendar';
      default: return 'ellipse';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const renderBillCard = (bill: Bill) => {
    const category = categories.find(c => c.id === bill.categoryId);
    const statusColor = getStatusColor(bill.status);
    const statusIcon = getStatusIcon(bill.status);

    return (
      <TouchableOpacity key={bill.id} style={[styles.billCard, { backgroundColor: theme.colors.card }]}>
        <LinearGradient
          colors={[theme.colors.card, theme.colors.surface + '80']}
          style={styles.billCardGradient}
        >
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          
          <View style={styles.billHeader}>
            <View style={styles.billMainInfo}>
              <View style={[styles.categoryIcon, { backgroundColor: category?.color + '20' }]}>
                <Ionicons 
                  name={category?.icon as any || 'document'} 
                  size={20} 
                  color={category?.color || theme.colors.primary} 
                />
              </View>
              <View style={styles.billDetails}>
                <Text style={[styles.billTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {bill.title}
                </Text>
                <View style={styles.billMeta}>
                  <Text style={[styles.billCategory, { color: theme.colors.textSecondary }]}>
                    {bill.category}
                  </Text>
                  {bill.isRecurring && (
                    <>
                      <View style={styles.metaDivider} />
                      <Text style={[styles.billFrequency, { color: theme.colors.textSecondary }]}>
                        {bill.frequency}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.billAmount}>
              <Text style={[styles.amountText, { color: theme.colors.text }]}>
                {formatCurrency(bill.amount)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {bill.status}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.billFooter}>
            <View style={styles.dueDateInfo}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                Due: {formatDate(bill.nextDueDate)}
              </Text>
              {bill.remindersPerDay > 1 && (
                <>
                  <View style={styles.metaDivider} />
                  <Ionicons name="notifications" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                    {bill.remindersPerDay}x daily
                  </Text>
                </>
              )}
            </View>
            
            <View style={styles.billActions}>
              {bill.status !== 'paid' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4ECDC4' + '20' }]}
                  onPress={() => handleMarkAsPaid(bill)}
                >
                  <Ionicons name="checkmark" size={16} color="#4ECDC4" />
                  <Text style={[styles.actionText, { color: '#4ECDC4' }]}>Pay</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                onPress={() => handleEditBill(bill)}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.border }]}
                onPress={() => handleDeleteBill(bill)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => {
    const filters: { key: typeof selectedFilter; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: bills.length },
      { key: 'overdue', label: 'Overdue', count: bills.filter(b => b.status === 'overdue').length },
      { key: 'pending', label: 'Pending', count: bills.filter(b => b.status === 'pending').length },
      { key: 'upcoming', label: 'Upcoming', count: bills.filter(b => b.status === 'upcoming').length },
      { key: 'paid', label: 'Paid', count: bills.filter(b => b.status === 'paid').length },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              {
                backgroundColor: selectedFilter === filter.key ? theme.colors.primary : theme.colors.surface,
                borderColor: selectedFilter === filter.key ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                {
                  color: selectedFilter === filter.key ? '#FFFFFF' : theme.colors.text,
                },
              ]}
            >
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View
                style={[
                  styles.filterTabBadge,
                  {
                    backgroundColor: selectedFilter === filter.key ? '#FFFFFF' : theme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabBadgeText,
                    {
                      color: selectedFilter === filter.key ? theme.colors.primary : '#FFFFFF',
                    },
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Bills Overview</Text>
        
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <View style={[styles.analyticsIcon, { backgroundColor: '#FF6B6B' + '20' }]}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
            </View>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {formatCurrency(analytics.totalOverdue)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Overdue
            </Text>
          </View>

          <View style={styles.analyticsItem}>
            <View style={[styles.analyticsIcon, { backgroundColor: '#FFB02E' + '20' }]}>
              <Ionicons name="time" size={20} color="#FFB02E" />
            </View>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {formatCurrency(analytics.totalPending)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Pending
            </Text>
          </View>

          <View style={styles.analyticsItem}>
            <View style={[styles.analyticsIcon, { backgroundColor: '#4ECDC4' + '20' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
            </View>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {formatCurrency(analytics.totalPaidThisMonth)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Paid This Month
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEditBillModal = () => {
    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedBillForEdit(null);
          resetEditForm();
        }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowEditModal(false);
              setSelectedBillForEdit(null);
              resetEditForm();
            }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Bill</Text>
            <TouchableOpacity onPress={handleUpdateBill}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Update</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Bill Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editBill.title}
                onChangeText={(text) => setEditBill({ ...editBill, title: text })}
                placeholder="e.g., Electricity Bill"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Amount *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editBill.amount}
                onChangeText={(text) => setEditBill({ ...editBill, amount: text })}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category, index) => (
                  <TouchableOpacity
                    key={`edit-category-${category.id}-${index}`}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: editBill.categoryId === category.id ? category.color + '20' : theme.colors.surface,
                        borderColor: editBill.categoryId === category.id ? category.color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEditBill({ ...editBill, categoryId: category.id, category: category.name })}
                  >
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                    <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Due Date</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={editBill.dueDate}
                  onChangeText={(text) => setEditBill({ ...editBill, dueDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Frequency</Text>
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(['weekly', 'monthly', 'yearly', 'one-time'] as const).map((freq, index) => (
                      <TouchableOpacity
                        key={`edit-freq-${freq}-${index}`}
                        style={[
                          styles.frequencyOption,
                          {
                            backgroundColor: editBill.frequency === freq ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setEditBill({ ...editBill, frequency: freq })}
                      >
                        <Text
                          style={[
                            styles.frequencyOptionText,
                            {
                              color: editBill.frequency === freq ? '#FFFFFF' : theme.colors.text,
                            },
                          ]}
                        >
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editBill.description}
                onChangeText={(text) => setEditBill({ ...editBill, description: text })}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Recurring Bill</Text>
                <Switch
                  value={editBill.isRecurring}
                  onValueChange={(value) => setEditBill({ ...editBill, isRecurring: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={editBill.isRecurring ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Auto Pay</Text>
                <Switch
                  value={editBill.isAutoPay}
                  onValueChange={(value) => setEditBill({ ...editBill, isAutoPay: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={editBill.isAutoPay ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminder (days before due)</Text>
              <View style={styles.reminderOptions}>
                {[1, 3, 7, 14].map((days, index) => (
                  <TouchableOpacity
                    key={`edit-reminder-${days}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: editBill.reminderDays === days ? theme.colors.primary : theme.colors.surface,
                        borderColor: editBill.reminderDays === days ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEditBill({ ...editBill, reminderDays: days })}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: editBill.reminderDays === days ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminders per day</Text>
              <View style={styles.reminderOptions}>
                {[1, 2, 3, 4].map((count, index) => (
                  <TouchableOpacity
                    key={`edit-reminders-per-day-${count}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: editBill.remindersPerDay === count ? theme.colors.primary : theme.colors.surface,
                        borderColor: editBill.remindersPerDay === count ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEditBill({ ...editBill, remindersPerDay: count })}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: editBill.remindersPerDay === count ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {count}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editBill.notes}
                onChangeText={(text) => setEditBill({ ...editBill, notes: text })}
                placeholder="Optional notes"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };
  // ...existing code...

  const renderAddBillModal = () => {
    return (
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Bill</Text>
            <TouchableOpacity onPress={handleAddBill}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Bill Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newBill.title}
                onChangeText={(text) => setNewBill({ ...newBill, title: text })}
                placeholder="e.g., Electricity Bill"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Amount *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newBill.amount}
                onChangeText={(text) => setNewBill({ ...newBill, amount: text })}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category, index) => (
                  <TouchableOpacity
                    key={`category-${category.id}-${index}`}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: newBill.categoryId === category.id ? category.color + '20' : theme.colors.surface,
                        borderColor: newBill.categoryId === category.id ? category.color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewBill({ ...newBill, categoryId: category.id, category: category.name })}
                  >
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                    <Text style={[styles.categoryOptionText, { color: theme.colors.text }]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Due Date</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={newBill.dueDate}
                  onChangeText={(text) => setNewBill({ ...newBill, dueDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Frequency</Text>
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(['weekly', 'monthly', 'yearly', 'one-time'] as const).map((freq, index) => (
                      <TouchableOpacity
                        key={`freq-${freq}-${index}`}
                        style={[
                          styles.frequencyOption,
                          {
                            backgroundColor: newBill.frequency === freq ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setNewBill({ ...newBill, frequency: freq })}
                      >
                        <Text
                          style={[
                            styles.frequencyOptionText,
                            {
                              color: newBill.frequency === freq ? '#FFFFFF' : theme.colors.text,
                            },
                          ]}
                        >
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newBill.description}
                onChangeText={(text) => setNewBill({ ...newBill, description: text })}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Recurring Bill</Text>
                <Switch
                  value={newBill.isRecurring}
                  onValueChange={(value) => setNewBill({ ...newBill, isRecurring: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={newBill.isRecurring ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Auto Pay</Text>
                <Switch
                  value={newBill.isAutoPay}
                  onValueChange={(value) => setNewBill({ ...newBill, isAutoPay: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={newBill.isAutoPay ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminder (days before due)</Text>
              <View style={styles.reminderOptions}>
                {[1, 3, 7, 14].map((days, index) => (
                  <TouchableOpacity
                    key={`reminder-${days}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: newBill.reminderDays === days ? theme.colors.primary : theme.colors.surface,
                        borderColor: newBill.reminderDays === days ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewBill({ ...newBill, reminderDays: days })}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: newBill.reminderDays === days ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Reminders per day</Text>
              <View style={styles.reminderOptions}>
                {[1, 2, 3, 4].map((count, index) => (
                  <TouchableOpacity
                    key={`reminders-per-day-${count}-${index}`}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: newBill.remindersPerDay === count ? theme.colors.primary : theme.colors.surface,
                        borderColor: newBill.remindersPerDay === count ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewBill({ ...newBill, remindersPerDay: count })}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: newBill.remindersPerDay === count ? '#FFFFFF' : theme.colors.text,
                        },
                      ]}
                    >
                      {count}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderPaymentModal = () => {
    if (!selectedBillForPayment) return null;

    return (
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.paymentModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.paymentModalHeader}>
              <Text style={[styles.paymentModalTitle, { color: theme.colors.text }]}>
                Pay Bill
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentBillTitle, { color: theme.colors.text }]}>
                {selectedBillForPayment.title}
              </Text>
              <Text style={[styles.paymentAmount, { color: theme.colors.primary }]}>
                {formatCurrency(selectedBillForPayment.amount)}
              </Text>
            </View>

            <View style={styles.walletSelection}>
              <Text style={[styles.walletSelectionLabel, { color: theme.colors.text }]}>
                Select Payment Method
              </Text>
              <ScrollView style={styles.walletsList}>
                {wallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletOption,
                      {
                        backgroundColor: selectedWallet === wallet.id ? theme.colors.primary + '20' : theme.colors.surface,
                        borderColor: selectedWallet === wallet.id ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedWallet(wallet.id)}
                  >
                    <View style={styles.walletInfo}>
                      <Text style={[styles.walletName, { color: theme.colors.text }]}>
                        {wallet.name}
                      </Text>
                      <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                        Balance: {formatCurrency(wallet.balance)}
                      </Text>
                    </View>
                    {selectedWallet === wallet.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
                onPress={processPayment}
              >
                <Text style={styles.payButtonText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredBills = getFilteredBills();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Bills Reminder</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Development helper button */}
            {__DEV__ && (
              <TouchableOpacity 
                onPress={async () => {
                  Alert.alert(
                    'Development Tools',
                    'Reset bills with test data?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Reset', 
                        onPress: async () => {
                          try {
                            await billsService.resetWithTestBills();
                            await loadData();
                            Alert.alert('Success', 'Test bills have been reset!');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to reset test bills');
                          }
                        }
                      }
                    ]
                  );
                }}
                style={{ marginRight: 12 }}
              >
                <Ionicons name="refresh" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Analytics */}
          {renderAnalytics()}

          {/* Filter Tabs */}
          {renderFilterTabs()}

          {/* Bills List */}
          <View style={styles.billsList}>
            {filteredBills.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                  {selectedFilter === 'all' ? 'No bills yet' : `No ${selectedFilter} bills`}
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                  {selectedFilter === 'all' 
                    ? 'Add your first bill to start tracking payments'
                    : `You don't have any ${selectedFilter} bills at the moment`
                  }
                </Text>
                {selectedFilter === 'all' && (
                  <TouchableOpacity
                    style={[styles.addFirstBillButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addFirstBillText}>Add Your First Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredBills.map(renderBillCard)
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Add Bill Modal */}
      {renderAddBillModal()}

      {/* Edit Bill Modal */}
      {renderEditBillModal()}

      {/* Payment Modal */}
      {renderPaymentModal()}
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  analyticsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  filterTabs: {
    marginBottom: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  billsList: {
    paddingBottom: 20,
  },
  billCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  billCardGradient: {
    padding: 16,
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billDetails: {
    flex: 1,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: 8,
  },
  billFrequency: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  billAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '50',
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  billActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addFirstBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstBillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  frequencyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reminderOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  paymentDetails: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  paymentBillTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  walletSelection: {
    marginBottom: 24,
  },
  walletSelectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  walletsList: {
    maxHeight: 200,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 14,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BillsTrackerScreen;