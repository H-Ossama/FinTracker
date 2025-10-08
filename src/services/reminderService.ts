import { hybridDataService } from './hybridDataService';

interface ReminderAPI {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  dueDate: string;
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
  lastCompleted?: string;
  nextDue?: string;
  snoozeUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateReminderData {
  title: string;
  description?: string;
  amount?: number;
  dueDate: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  isRecurring: boolean;
  autoCreateTransaction: boolean;
  transactionType?: 'INCOME' | 'EXPENSE';
  walletId?: string;
  categoryId?: string;
  notifyBefore?: number;
  enablePushNotification?: boolean;
  enableEmailNotification?: boolean;
}

interface UpdateReminderData extends Partial<CreateReminderData> {
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  isActive?: boolean;
}

class ReminderService {
  private baseUrl: string;

  constructor() {
    // In a real app, this would come from environment config
    this.baseUrl = __DEV__ ? 'http://localhost:3000' : 'https://your-api.com';
  }

  /**
   * Get user's push token for API authentication
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    // In a real app, you'd get the auth token from your auth service
    return {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${authToken}`,
    };
  }

  /**
   * Get all reminders for the current user
   */
  async getReminders(params?: {
    status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ReminderAPI[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${this.baseUrl}/api/reminders?${queryParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.statusText}`);
      }

      const data = await response.json();
      return data.reminders || [];
    } catch (error) {
      console.error('Error fetching reminders:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Create a new reminder
   */
  async createReminder(reminderData: CreateReminderData): Promise<ReminderAPI> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reminders`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(reminderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create reminder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Update an existing reminder
   */
  async updateReminder(reminderId: string, updates: UpdateReminderData): Promise<ReminderAPI> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update reminder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete reminder: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  /**
   * Complete a reminder
   */
  async completeReminder(reminderId: string): Promise<ReminderAPI> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reminders/${reminderId}/complete`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to complete reminder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing reminder:', error);
      throw error;
    }
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(reminderId: string, snoozeMinutes: number): Promise<ReminderAPI> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reminders/${reminderId}/snooze`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ snoozeMinutes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to snooze reminder: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      throw error;
    }
  }

  /**
   * Get notification history
   */
  async getNotifications(params?: {
    type?: 'reminder' | 'alert' | 'info' | 'success' | 'warning' | 'error';
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.type) queryParams.append('type', params.type);
      if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${this.baseUrl}/api/notifications?${queryParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    enablePushNotifications?: boolean;
    enableEmailNotifications?: boolean;
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    categories?: {
      transactions: boolean;
      budgets: boolean;
      goals: boolean;
      reminders: boolean;
      alerts: boolean;
    };
  }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update preferences: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Test notification functionality
   */
  async sendTestNotification(message: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/test`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to send test notification: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Get smart alerts
   */
  async getSmartAlerts(params?: {
    category?: 'spending' | 'budget' | 'goal' | 'pattern';
    severity?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.severity) queryParams.append('severity', params.severity);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${this.baseUrl}/api/smart-alerts?${queryParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch smart alerts: ${response.statusText}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching smart alerts:', error);
      return [];
    }
  }

  /**
   * Convert API reminder to app reminder format
   */
  convertToAppReminder(apiReminder: ReminderAPI): any {
    return {
      id: apiReminder.id,
      title: apiReminder.title,
      description: apiReminder.description,
      amount: apiReminder.amount,
      dueDate: new Date(apiReminder.dueDate),
      frequency: apiReminder.frequency,
      status: apiReminder.status,
      isActive: apiReminder.isActive,
      isRecurring: apiReminder.isRecurring,
      autoCreateTransaction: apiReminder.autoCreateTransaction,
      transactionType: apiReminder.transactionType,
      walletId: apiReminder.walletId,
      categoryId: apiReminder.categoryId,
      notifyBefore: apiReminder.notifyBefore,
      enablePushNotification: apiReminder.enablePushNotification,
      enableEmailNotification: apiReminder.enableEmailNotification,
      completedCount: apiReminder.completedCount,
      lastCompleted: apiReminder.lastCompleted ? new Date(apiReminder.lastCompleted) : undefined,
      nextDue: apiReminder.nextDue ? new Date(apiReminder.nextDue) : undefined,
      snoozeUntil: apiReminder.snoozeUntil ? new Date(apiReminder.snoozeUntil) : undefined,
      // Mock category and wallet data - in real app would be fetched separately
      category: apiReminder.categoryId ? {
        id: apiReminder.categoryId,
        name: 'Category Name',
        icon: 'folder-outline',
        color: '#10B981',
      } : undefined,
      wallet: apiReminder.walletId ? {
        id: apiReminder.walletId,
        name: 'Wallet Name',
        type: 'checking',
      } : undefined,
    };
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      } as any);
      
      return response.ok;
    } catch (error) {
      console.log('Backend not available, using local data');
      return false;
    }
  }
}

export const reminderService = new ReminderService();
export type { ReminderAPI, CreateReminderData, UpdateReminderData };