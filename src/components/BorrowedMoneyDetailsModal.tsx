import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorrowedMoney } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface BorrowedMoneyDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  borrowedMoney: BorrowedMoney | null;
  onMarkAsPaid: (id: string) => void;
  onEdit: (borrowedMoney: BorrowedMoney) => void;
  onDelete: (id: string) => void;
}

const BorrowedMoneyDetailsModal: React.FC<BorrowedMoneyDetailsModalProps> = ({
  visible,
  onClose,
  borrowedMoney,
  onMarkAsPaid,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const { formatCurrency } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<BorrowedMoney | null>(null);

  React.useEffect(() => {
    if (borrowedMoney) {
      setEditedData({ ...borrowedMoney });
    }
  }, [borrowedMoney]);

  if (!borrowedMoney || !editedData) return null;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedData) {
      onEdit(editedData);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedData({ ...borrowedMoney });
    setIsEditing(false);
  };

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Mark as Paid',
      `Are you sure you want to mark this debt from ${borrowedMoney.personName} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark as Paid', 
          style: 'default',
          onPress: () => onMarkAsPaid(borrowedMoney.id)
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete this record for ${borrowedMoney.personName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(borrowedMoney.id);
            onClose();
          }
        },
      ]
    );
  };

  const handleCall = () => {
    if (borrowedMoney.phoneNumber) {
      Linking.openURL(`tel:${borrowedMoney.phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (borrowedMoney.email) {
      Linking.openURL(`mailto:${borrowedMoney.email}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = new Date(borrowedMoney.dueDate) < new Date() && !borrowedMoney.isPaid;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Borrowed Money Details
          </Text>
          <TouchableOpacity 
            onPress={isEditing ? handleSaveEdit : handleEdit} 
            style={styles.editButton}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "pencil"} 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: borrowedMoney.isPaid 
                  ? theme.colors.success 
                  : isOverdue 
                    ? '#FF3B30' 
                    : theme.colors.warning
              }
            ]}>
              <Text style={styles.statusText}>
                {borrowedMoney.isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <View style={[styles.amountCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.amountLabel, { color: theme.colors.textSecondary }]}>
              Amount Borrowed
            </Text>
            <Text style={[styles.amountValue, { color: theme.colors.text }]}>
              {formatCurrency(borrowedMoney.amount)}
            </Text>
          </View>

          {/* Person Details */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Person Details
            </Text>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Name
              </Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={editedData.personName}
                  onChangeText={(text) => setEditedData({...editedData, personName: text})}
                  placeholder="Person name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {borrowedMoney.personName}
                </Text>
              )}
            </View>

            {(borrowedMoney.phoneNumber || isEditing) && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Phone
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={editedData.phoneNumber || ''}
                    onChangeText={(text) => setEditedData({...editedData, phoneNumber: text})}
                    placeholder="Phone number"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <TouchableOpacity onPress={handleCall} style={styles.contactRow}>
                    <Text style={[styles.detailValue, { color: theme.colors.primary }]}>
                      {borrowedMoney.phoneNumber}
                    </Text>
                    <Ionicons name="call" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(borrowedMoney.email || isEditing) && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Email
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={editedData.email || ''}
                    onChangeText={(text) => setEditedData({...editedData, email: text})}
                    placeholder="Email address"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <TouchableOpacity onPress={handleEmail} style={styles.contactRow}>
                    <Text style={[styles.detailValue, { color: theme.colors.primary }]}>
                      {borrowedMoney.email}
                    </Text>
                    <Ionicons name="mail" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Loan Details */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Loan Details
            </Text>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Reason
              </Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={editedData.reason}
                  onChangeText={(text) => setEditedData({...editedData, reason: text})}
                  placeholder="Reason for borrowing"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {borrowedMoney.reason}
                </Text>
              )}
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Borrowed Date
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {formatDate(borrowedMoney.borrowedDate)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Due Date
              </Text>
              <Text style={[
                styles.detailValue,
                { color: isOverdue ? '#FF3B30' : theme.colors.text }
              ]}>
                {formatDate(borrowedMoney.dueDate)}
                {isOverdue && ' (Overdue)'}
              </Text>
            </View>

            {(borrowedMoney.notes || isEditing) && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Notes
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={editedData.notes || ''}
                    onChangeText={(text) => setEditedData({...editedData, notes: text})}
                    placeholder="Additional notes"
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {borrowedMoney.notes}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {!isEditing && (
          <View style={[styles.actionButtons, { borderTopColor: theme.colors.border }]}>
            {!borrowedMoney.isPaid && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                onPress={handleMarkAsPaid}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Mark as Paid</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEditing && (
          <View style={[styles.actionButtons, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveEdit}
            >
              <Text style={styles.actionButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  amountCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BorrowedMoneyDetailsModal;