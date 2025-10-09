import { BorrowedMoney } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hybridDataService } from './hybridDataService';

const BORROWED_MONEY_KEY = 'borrowed_money';

export class BorrowedMoneyService {
  private static instance: BorrowedMoneyService;
  private borrowedMoneyList: BorrowedMoney[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): BorrowedMoneyService {
    if (!BorrowedMoneyService.instance) {
      BorrowedMoneyService.instance = new BorrowedMoneyService();
    }
    return BorrowedMoneyService.instance;
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(BORROWED_MONEY_KEY);
      if (data) {
        this.borrowedMoneyList = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading borrowed money from storage:', error);
      this.borrowedMoneyList = [];
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(BORROWED_MONEY_KEY, JSON.stringify(this.borrowedMoneyList));
    } catch (error) {
      console.error('Error saving borrowed money to storage:', error);
    }
  }

  public async getAllBorrowedMoney(): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    return [...this.borrowedMoneyList].sort((a, b) => 
      new Date(b.borrowedDate).getTime() - new Date(a.borrowedDate).getTime()
    );
  }

  public async getUnpaidBorrowedMoney(): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    return this.borrowedMoneyList
      .filter(item => !item.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public async getPaidBorrowedMoney(): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    return this.borrowedMoneyList
      .filter(item => item.isPaid)
      .sort((a, b) => new Date(b.borrowedDate).getTime() - new Date(a.borrowedDate).getTime());
  }

  public async getOverdueBorrowedMoney(): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    const now = new Date();
    return this.borrowedMoneyList
      .filter(item => !item.isPaid && new Date(item.dueDate) < now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public async getTotalBorrowedAmount(): Promise<number> {
    await this.loadFromStorage();
    return this.borrowedMoneyList
      .filter(item => !item.isPaid)
      .reduce((total, item) => total + item.amount, 0);
  }

  public async getTotalPaidAmount(): Promise<number> {
    await this.loadFromStorage();
    return this.borrowedMoneyList
      .filter(item => item.isPaid)
      .reduce((total, item) => total + item.amount, 0);
  }

  public async addBorrowedMoney(borrowedMoney: Omit<BorrowedMoney, 'id'>): Promise<BorrowedMoney> {
    const newBorrowedMoney: BorrowedMoney = {
      ...borrowedMoney,
      id: Date.now().toString(),
    };

    this.borrowedMoneyList.push(newBorrowedMoney);
    await this.saveToStorage();
    return newBorrowedMoney;
  }

  public async updateBorrowedMoney(id: string, updates: Partial<BorrowedMoney>): Promise<BorrowedMoney | null> {
    const index = this.borrowedMoneyList.findIndex(item => item.id === id);
    if (index === -1) {
      return null;
    }

    this.borrowedMoneyList[index] = { ...this.borrowedMoneyList[index], ...updates };
    await this.saveToStorage();
    return this.borrowedMoneyList[index];
  }

  public async markAsPaid(id: string, walletId: string): Promise<BorrowedMoney | null> {
    const borrowedMoney = await this.getBorrowedMoneyById(id);
    if (!borrowedMoney) {
      throw new Error('Borrowed money record not found');
    }

    if (borrowedMoney.isPaid) {
      throw new Error('This borrowed money is already marked as paid');
    }

    // Create an income transaction for the repayment
    await hybridDataService.createTransaction({
      amount: borrowedMoney.amount,
      description: `Payment received from ${borrowedMoney.personName}`,
      type: 'INCOME',
      walletId: walletId,
      date: new Date().toISOString(),
      notes: `Borrowed money repayment - ${borrowedMoney.reason}`,
    });

    // Mark as paid
    return this.updateBorrowedMoney(id, { isPaid: true });
  }

  public async markAsUnpaid(id: string): Promise<BorrowedMoney | null> {
    return this.updateBorrowedMoney(id, { isPaid: false });
  }

  public async deleteBorrowedMoney(id: string): Promise<boolean> {
    const index = this.borrowedMoneyList.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    this.borrowedMoneyList.splice(index, 1);
    await this.saveToStorage();
    return true;
  }

  public async getBorrowedMoneyById(id: string): Promise<BorrowedMoney | null> {
    await this.loadFromStorage();
    return this.borrowedMoneyList.find(item => item.id === id) || null;
  }

  public async getBorrowedMoneyByPerson(personName: string): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    return this.borrowedMoneyList
      .filter(item => item.personName.toLowerCase().includes(personName.toLowerCase()))
      .sort((a, b) => new Date(b.borrowedDate).getTime() - new Date(a.borrowedDate).getTime());
  }

  public async getStatistics(): Promise<{
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    averageAmount: number;
    totalRecords: number;
    paymentRate: number;
  }> {
    await this.loadFromStorage();
    
    const totalRecords = this.borrowedMoneyList.length;
    const paidItems = this.borrowedMoneyList.filter(item => item.isPaid);
    const unpaidItems = this.borrowedMoneyList.filter(item => !item.isPaid);
    const now = new Date();
    const overdueItems = unpaidItems.filter(item => new Date(item.dueDate) < now);

    const totalAmount = this.borrowedMoneyList.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = paidItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPending = unpaidItems.reduce((sum, item) => sum + item.amount, 0);
    const totalOverdue = overdueItems.reduce((sum, item) => sum + item.amount, 0);
    
    const averageAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;
    const paymentRate = totalRecords > 0 ? (paidItems.length / totalRecords) * 100 : 0;

    return {
      totalAmount,
      totalPaid,
      totalPending,
      totalOverdue,
      averageAmount,
      totalRecords,
      paymentRate,
    };
  }

  public async searchBorrowedMoney(query: string): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    const lowerQuery = query.toLowerCase();
    
    return this.borrowedMoneyList
      .filter(item => 
        item.personName.toLowerCase().includes(lowerQuery) ||
        item.reason.toLowerCase().includes(lowerQuery) ||
        (item.notes && item.notes.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => new Date(b.borrowedDate).getTime() - new Date(a.borrowedDate).getTime());
  }

  public async clearAllData(): Promise<void> {
    this.borrowedMoneyList = [];
    await this.saveToStorage();
  }

  public async importData(data: BorrowedMoney[]): Promise<void> {
    this.borrowedMoneyList = data;
    await this.saveToStorage();
  }

  public async exportData(): Promise<BorrowedMoney[]> {
    await this.loadFromStorage();
    return [...this.borrowedMoneyList];
  }
}

export default BorrowedMoneyService.getInstance();