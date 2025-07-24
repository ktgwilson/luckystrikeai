export interface User {
  id: string;
  dateOfBirth?: Date;
  isAgeVerified: boolean;
  hasAcceptedTerms: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  location?: {
    country: string;
    state?: string;
  };
}

export interface Wallet {
  tokens: number;
  coins: number;
  tickets: number;
  totalWinnings: number;
  totalSpent: number;
  totalTokens?: number;
}

export interface Ticket {
  id: string;
  type: TicketType;
  purchasePrice: number;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}

export enum TicketType {
  FREE_DAILY = 'free_daily',
  PURCHASED = 'purchased',
  BONUS = 'bonus'
}

export interface Prize {
  id: string;
  tier: PrizeTier;
  type: PrizeType;
  value: number;
  name: string;
  description: string;
  probability: number;
}

export enum PrizeTier {
  COMMON = 'common',
  RARE = 'rare',
  JACKPOT = 'jackpot'
}

export enum PrizeType {
  TOKENS = 'tokens',
  COINS = 'coins',
  TICKETS = 'tickets',
  NONE = 'none'
}

export interface ScratchResult {
  prize: Prize | null;
  isWin: boolean;
  revealedSymbols: string[];
  timestamp: Date;
}

export interface DailyTicketStatus {
  lastClaimedAt: Date | null;
  canClaim: boolean;
  nextClaimAt: Date | null;
}

export interface AnalyticsEvent {
  eventName: string;
  parameters: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

export interface AIDataPoint {
  userId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'crypto';
  provider: string;
  isEnabled: boolean;
  icon: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  paymentIntentId?: string;
  paypalOrderId?: string;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paypalOrderId?: string;
  cryptoTransactionId?: string;
  error?: string;
}

export interface AdminProfitData {
  totalRevenue: number;
  totalPayouts: number;
  netProfit: number;
  transactionCount: number;
  averageTransactionValue: number;
  revenueByMethod: { [key: string]: number };
  dailyRevenue: { date: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface UserPaymentHistory {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface ComplianceData {
  ageVerified: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  jurisdiction: string;
  verificationDate: Date;
}

export interface AIPersonalizationData {
  userId: string;
  sessionCount: number;
  avgSessionDuration: number;
  winRate: number;
  spendingPattern: {
    avgSpend: number;
    trend: number;
  };
  preferredPlayTimes: number[];
  churnRisk: ChurnPrediction;
  lastActivity: Date;
  engagementScore: number;
  preferredThemes: string[];
}

export interface ChurnPrediction {
  riskScore: number;
  confidence: number;
  factors: string[];
  recommendation: string;
}

export interface SmartReward {
  id: string;
  type: 'comeback_bonus' | 'lucky_hour' | 'loyalty_reward' | 'streak_bonus';
  title: string;
  description: string;
  reward: {
    tokens: number;
    freeTickets: number;
    multiplier: number;
  };
  expiresAt: Date;
  personalizedMessage: string;
  triggerCondition: string;
}

export interface UserSession {
  id: string;
  userId: string;
  timestamp: number;
  duration: number;
  won: boolean;
  tokensSpent: number;
  theme: string;
  scratchCount: number;
}
