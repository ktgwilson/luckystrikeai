import { AnalyticsEvent, AIDataPoint, User } from '../types';
import { ANALYTICS_EVENTS } from '../constants';

export class AnalyticsService {
  private static events: AnalyticsEvent[] = [];
  private static aiDataPoints: AIDataPoint[] = [];
  private static sessionId: string = '';
  private static userId: string = '';

  static initialize(user: User): void {
    this.userId = user.id;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.trackEvent(ANALYTICS_EVENTS.SESSION_STARTED, {
      userId: user.id,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  static trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      eventName,
      parameters: {
        ...parameters,
        sessionId: this.sessionId,
        userId: this.userId
      },
      timestamp: new Date(),
      userId: this.userId
    };

    this.events.push(event);
    this.collectAIData(eventName, parameters);
    
    console.log('Analytics Event:', event);
  }

  private static collectAIData(eventType: string, eventData: Record<string, any>): void {
    const aiDataPoint: AIDataPoint = {
      userId: this.userId,
      sessionId: this.sessionId,
      eventType,
      eventData,
      timestamp: new Date(),
      deviceInfo: {
        platform: 'react-native',
        version: '1.0.0'
      }
    };

    this.aiDataPoints.push(aiDataPoint);
  }

  static trackScratchStarted(ticketType: string): void {
    this.trackEvent(ANALYTICS_EVENTS.SCRATCH_STARTED, {
      ticketType,
      timestamp: new Date().toISOString()
    });
  }

  static trackScratchCompleted(isWin: boolean, prizeValue: number, symbols: string[]): void {
    this.trackEvent(ANALYTICS_EVENTS.SCRATCH_COMPLETED, {
      isWin,
      prizeValue,
      symbols,
      timestamp: new Date().toISOString()
    });

    if (isWin) {
      this.trackEvent(ANALYTICS_EVENTS.PRIZE_WON, {
        prizeValue,
        symbols,
        timestamp: new Date().toISOString()
      });
    }
  }

  static trackWalletUpdate(oldWallet: any, newWallet: any): void {
    this.trackEvent(ANALYTICS_EVENTS.WALLET_UPDATED, {
      oldWallet,
      newWallet,
      change: {
        tokens: newWallet.tokens - oldWallet.tokens,
        coins: newWallet.coins - oldWallet.coins,
        tickets: newWallet.tickets - oldWallet.tickets
      },
      timestamp: new Date().toISOString()
    });
  }

  static trackTicketClaimed(ticketType: string): void {
    this.trackEvent(ANALYTICS_EVENTS.TICKET_CLAIMED, {
      ticketType,
      timestamp: new Date().toISOString()
    });
  }

  static trackAgeVerification(isVerified: boolean, age?: number): void {
    this.trackEvent(ANALYTICS_EVENTS.AGE_VERIFIED, {
      isVerified,
      age,
      timestamp: new Date().toISOString()
    });
  }

  static trackTermsAccepted(version: string): void {
    this.trackEvent(ANALYTICS_EVENTS.TERMS_ACCEPTED, {
      version,
      timestamp: new Date().toISOString()
    });
  }

  static getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  static getAIDataPoints(): AIDataPoint[] {
    return [...this.aiDataPoints];
  }

  static clearEvents(): void {
    this.events = [];
    this.aiDataPoints = [];
  }

  static trackPaymentInitiated(amount: number, currency: string, paymentMethodId: string): void {
    this.trackEvent(ANALYTICS_EVENTS.PAYMENT_INITIATED, {
      amount,
      currency,
      paymentMethod: paymentMethodId,
      timestamp: new Date().toISOString()
    });
  }

  static trackPaymentSuccess(amount: number, currency: string, paymentMethodId: string): void {
    this.trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
      amount,
      currency,
      paymentMethod: paymentMethodId,
      timestamp: new Date().toISOString()
    });
  }

  static trackPaymentFailed(amount: number, currency: string, paymentMethodId: string, error?: string): void {
    this.trackEvent(ANALYTICS_EVENTS.PAYMENT_FAILED, {
      amount,
      currency,
      paymentMethod: paymentMethodId,
      error,
      timestamp: new Date().toISOString()
    });
  }

  static trackPaymentError(amount: number, currency: string, paymentMethodId: string, error: string): void {
    this.trackEvent(ANALYTICS_EVENTS.PAYMENT_ERROR, {
      amount,
      currency,
      paymentMethod: paymentMethodId,
      error,
      timestamp: new Date().toISOString()
    });
  }

  static endSession(): void {
    this.trackEvent(ANALYTICS_EVENTS.SESSION_ENDED, {
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      timestamp: new Date().toISOString()
    });
  }
}
