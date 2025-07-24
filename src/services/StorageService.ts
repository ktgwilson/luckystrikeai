import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Wallet, DailyTicketStatus, PaymentTransaction, UserPaymentHistory, AdminProfitData } from '../types';

const STORAGE_KEYS = {
  USER: 'user_data',
  WALLET: 'wallet_data',
  DAILY_TICKET: 'daily_ticket_status',
  FIRST_LAUNCH: 'first_launch_completed',
  USER_TRANSACTIONS: 'user_transactions_',
  USER_PAYMENT_HISTORY: 'user_payment_history_',
  ADMIN_PROFIT: 'admin_profit_data'
};

export class StorageService {
  static async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  static async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  static async getWallet(): Promise<Wallet> {
    try {
      const walletData = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      return walletData ? JSON.parse(walletData) : {
        tokens: 0,
        coins: 0,
        tickets: 1,
        totalWinnings: 0,
        totalSpent: 0
      };
    } catch (error) {
      console.error('Error getting wallet data:', error);
      return {
        tokens: 0,
        coins: 0,
        tickets: 1,
        totalWinnings: 0,
        totalSpent: 0
      };
    }
  }

  static async saveWallet(wallet: Wallet): Promise<void> {
    try {
      console.log('StorageService: Saving wallet:', wallet);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
      console.log('StorageService: Wallet saved successfully');
      
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.WALLET);
      console.log('StorageService: Verification read:', saved ? JSON.parse(saved) : null);
    } catch (error) {
      console.error('Error saving wallet data:', error);
    }
  }

  static async getDailyTicketStatus(): Promise<DailyTicketStatus> {
    try {
      const statusData = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_TICKET);
      if (statusData) {
        const parsed = JSON.parse(statusData);
        return {
          lastClaimedAt: parsed.lastClaimedAt ? new Date(parsed.lastClaimedAt) : null,
          canClaim: parsed.canClaim,
          nextClaimAt: parsed.nextClaimAt ? new Date(parsed.nextClaimAt) : null
        };
      }
      return {
        lastClaimedAt: null,
        canClaim: true,
        nextClaimAt: null
      };
    } catch (error) {
      console.error('Error getting daily ticket status:', error);
      return {
        lastClaimedAt: null,
        canClaim: true,
        nextClaimAt: null
      };
    }
  }

  static async saveDailyTicketStatus(status: DailyTicketStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_TICKET, JSON.stringify(status));
    } catch (error) {
      console.error('Error saving daily ticket status:', error);
    }
  }

  static async isFirstLaunch(): Promise<boolean> {
    try {
      const firstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      return firstLaunch === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
      return true;
    }
  }

  static async setFirstLaunchCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'true');
    } catch (error) {
      console.error('Error setting first launch completed:', error);
    }
  }

  static async getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    try {
      const transactionsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_TRANSACTIONS + userId);
      if (transactionsData) {
        const parsed = JSON.parse(transactionsData);
        return parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  static async saveUserTransactions(userId: string, transactions: PaymentTransaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TRANSACTIONS + userId, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving user transactions:', error);
    }
  }

  static async getUserPaymentHistory(userId: string): Promise<UserPaymentHistory[]> {
    try {
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PAYMENT_HISTORY + userId);
      if (historyData) {
        const parsed = JSON.parse(historyData);
        return parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting user payment history:', error);
      return [];
    }
  }

  static async saveUserPaymentHistory(userId: string, history: UserPaymentHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PAYMENT_HISTORY + userId, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving user payment history:', error);
    }
  }

  static async getAdminProfitData(): Promise<AdminProfitData> {
    try {
      const profitData = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_PROFIT);
      if (profitData) {
        return JSON.parse(profitData);
      }
      return {
        totalRevenue: 0,
        totalPayouts: 0,
        netProfit: 0,
        transactionCount: 0,
        averageTransactionValue: 0,
        revenueByMethod: {},
        dailyRevenue: [],
        monthlyRevenue: []
      };
    } catch (error) {
      console.error('Error getting admin profit data:', error);
      return {
        totalRevenue: 0,
        totalPayouts: 0,
        netProfit: 0,
        transactionCount: 0,
        averageTransactionValue: 0,
        revenueByMethod: {},
        dailyRevenue: [],
        monthlyRevenue: []
      };
    }
  }

  static async saveAdminProfitData(profitData: AdminProfitData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_PROFIT, JSON.stringify(profitData));
    } catch (error) {
      console.error('Error saving admin profit data:', error);
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => 
        Object.values(STORAGE_KEYS).some(storageKey => 
          key.startsWith(storageKey.replace('_', ''))
        )
      );
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}
