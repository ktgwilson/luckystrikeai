import { PaymentMethod, PaymentTransaction, PaymentResult, AdminProfitData } from '../types';
import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';

export class PaymentService {
  private static paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe_card',
      name: 'Credit/Debit Card',
      type: 'card',
      provider: 'stripe',
      isEnabled: true,
      icon: '💳'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      type: 'paypal',
      provider: 'paypal',
      isEnabled: true,
      icon: '🅿️'
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      type: 'apple_pay',
      provider: 'apple',
      isEnabled: true,
      icon: '🍎'
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      type: 'google_pay',
      provider: 'google',
      isEnabled: true,
      icon: '🔵'
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      type: 'crypto',
      provider: 'coinbase',
      isEnabled: true,
      icon: '₿'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      type: 'crypto',
      provider: 'coinbase',
      isEnabled: true,
      icon: '⟠'
    },
    {
      id: 'usdt',
      name: 'Tether (USDT)',
      type: 'crypto',
      provider: 'coinbase',
      isEnabled: true,
      icon: '₮'
    },
    {
      id: 'usdc',
      name: 'USD Coin (USDC)',
      type: 'crypto',
      provider: 'coinbase',
      isEnabled: true,
      icon: '🪙'
    }
  ];

  static getAvailablePaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.isEnabled);
  }

  static getCryptoPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.type === 'crypto' && method.isEnabled);
  }

  static getTraditionalPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.type !== 'crypto' && method.isEnabled);
  }

  static async processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    userId: string,
    description: string
  ): Promise<PaymentResult> {
    try {
      AnalyticsService.trackPaymentInitiated(amount, currency, paymentMethodId);

      const paymentMethod = this.paymentMethods.find(m => m.id === paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Invalid payment method');
      }

      const transaction: PaymentTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        amount,
        currency,
        paymentMethodId,
        description,
        status: 'pending',
        createdAt: new Date()
      };

      await this.saveTransaction(transaction);

      let result: PaymentResult;

      switch (paymentMethod.provider) {
        case 'stripe':
          result = await this.processStripePayment(transaction);
          break;
        case 'paypal':
          result = await this.processPayPalPayment(transaction);
          break;
        case 'apple':
          result = await this.processApplePayPayment(transaction);
          break;
        case 'google':
          result = await this.processGooglePayPayment(transaction);
          break;
        case 'coinbase':
          result = await this.processCryptoPayment(transaction, paymentMethod);
          break;
        default:
          throw new Error('Unsupported payment provider');
      }

      transaction.status = result.success ? 'completed' : 'failed';
      transaction.completedAt = new Date();
      transaction.error = result.error;
      await this.updateTransaction(transaction);

      if (result.success) {
        AnalyticsService.trackPaymentSuccess(amount, currency, paymentMethodId);
        await this.updateAdminProfit(amount, paymentMethodId);
        await this.recordUserPaymentHistory(userId, transaction);
      } else {
        AnalyticsService.trackPaymentFailed(amount, currency, paymentMethodId, result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
      AnalyticsService.trackPaymentError(amount, currency, paymentMethodId, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private static async processStripePayment(transaction: PaymentTransaction): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const success = Math.random() > 0.1;
    return {
      success,
      transactionId: success ? transaction.id : undefined,
      error: success ? undefined : 'Card declined'
    };
  }

  private static async processPayPalPayment(transaction: PaymentTransaction): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.05;
    return {
      success,
      transactionId: success ? transaction.id : undefined,
      paypalOrderId: success ? `PP_${transaction.id}` : undefined,
      error: success ? undefined : 'PayPal payment failed'
    };
  }

  private static async processApplePayPayment(transaction: PaymentTransaction): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const success = Math.random() > 0.03;
    return {
      success,
      transactionId: success ? transaction.id : undefined,
      error: success ? undefined : 'Apple Pay authentication failed'
    };
  }

  private static async processGooglePayPayment(transaction: PaymentTransaction): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const success = Math.random() > 0.04;
    return {
      success,
      transactionId: success ? transaction.id : undefined,
      error: success ? undefined : 'Google Pay transaction failed'
    };
  }

  private static async processCryptoPayment(transaction: PaymentTransaction, paymentMethod: PaymentMethod): Promise<PaymentResult> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.08;
    const cryptoTxId = success ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined;
    
    return {
      success,
      transactionId: success ? transaction.id : undefined,
      cryptoTransactionId: cryptoTxId,
      error: success ? undefined : `${paymentMethod.name} transaction failed - insufficient balance or network error`
    };
  }

  private static async saveTransaction(transaction: PaymentTransaction): Promise<void> {
    const transactions = await this.getUserTransactions(transaction.userId);
    transactions.push(transaction);
    await StorageService.saveUserTransactions(transaction.userId, transactions);
  }

  private static async updateTransaction(transaction: PaymentTransaction): Promise<void> {
    const transactions = await this.getUserTransactions(transaction.userId);
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      transactions[index] = transaction;
      await StorageService.saveUserTransactions(transaction.userId, transactions);
    }
  }

  static async getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    return await StorageService.getUserTransactions(userId);
  }

  private static async recordUserPaymentHistory(userId: string, transaction: PaymentTransaction): Promise<void> {
    const history = await StorageService.getUserPaymentHistory(userId);
    history.push({
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethodId,
      description: transaction.description,
      timestamp: transaction.completedAt || transaction.createdAt,
      status: transaction.status
    });
    await StorageService.saveUserPaymentHistory(userId, history);
  }

  private static async updateAdminProfit(amount: number, paymentMethodId: string): Promise<void> {
    const currentProfit = await this.getAdminProfitData();
    const fee = amount * 0.05;
    
    const updatedProfit: AdminProfitData = {
      ...currentProfit,
      totalRevenue: currentProfit.totalRevenue + amount,
      netProfit: currentProfit.netProfit + fee,
      transactionCount: currentProfit.transactionCount + 1,
      averageTransactionValue: (currentProfit.totalRevenue + amount) / (currentProfit.transactionCount + 1),
      revenueByMethod: {
        ...currentProfit.revenueByMethod,
        [paymentMethodId]: (currentProfit.revenueByMethod[paymentMethodId] || 0) + amount
      }
    };

    await StorageService.saveAdminProfitData(updatedProfit);
    console.log(`Admin profit updated: +$${fee} fee from $${amount} ${paymentMethodId} transaction`);
  }

  static async getAdminProfitData(): Promise<AdminProfitData> {
    return await StorageService.getAdminProfitData();
  }

  static async processWithdrawal(
    userId: string,
    amount: number,
    paymentMethodId: string,
    destinationAddress?: string
  ): Promise<PaymentResult> {
    try {
      const paymentMethod = this.paymentMethods.find(m => m.id === paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Invalid payment method for withdrawal');
      }

      if (paymentMethod.type === 'crypto' && !destinationAddress) {
        throw new Error('Crypto withdrawals require destination address');
      }

      const transaction: PaymentTransaction = {
        id: `wth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        amount: -amount,
        currency: 'USD',
        paymentMethodId,
        description: `Withdrawal to ${paymentMethod.name}`,
        status: 'pending',
        createdAt: new Date()
      };

      await this.saveTransaction(transaction);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const success = Math.random() > 0.02;
      transaction.status = success ? 'completed' : 'failed';
      transaction.completedAt = new Date();
      transaction.error = success ? undefined : 'Withdrawal failed - please try again';
      
      await this.updateTransaction(transaction);

      if (success) {
        await this.recordUserPaymentHistory(userId, transaction);
      }

      return {
        success,
        transactionId: success ? transaction.id : undefined,
        error: transaction.error
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown withdrawal error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async validateCryptoAddress(address: string, currency: string): Promise<boolean> {
    if (!address || address.length < 10) return false;
    
    switch (currency.toLowerCase()) {
      case 'bitcoin':
      case 'btc':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      case 'ethereum':
      case 'eth':
      case 'usdt':
      case 'usdc':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      default:
        return false;
    }
  }

  static async getCryptoExchangeRate(fromCurrency: string): Promise<number> {
    const mockRates: { [key: string]: number } = {
      'bitcoin': 45000,
      'ethereum': 2800,
      'usdt': 1.00,
      'usdc': 1.00
    };
    
    return mockRates[fromCurrency.toLowerCase()] || 1;
  }
}
