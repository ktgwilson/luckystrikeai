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

export interface UserSettings {
  aiPersonalizationEnabled: boolean;
  notificationsEnabled: boolean;
  dataCollectionOptOut: boolean;
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
}

export interface ScratchParty {
  id: string;
  name: string;
  hostId: string;
  participants: PartyParticipant[];
  maxParticipants: number;
  startTime: Date;
  endTime: Date;
  prizePool: number;
  status: 'waiting' | 'active' | 'completed';
  theme: string;
  entryFee: number;
}

export interface PartyParticipant {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  score: number;
  wins: number;
  isReady: boolean;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ClubMember[];
  maxMembers: number;
  level: number;
  totalXP: number;
  challenges: ClubChallenge[];
  createdAt: Date;
  isPublic: boolean;
  requirements: {
    minLevel: number;
    minWins: number;
  };
}

export interface ClubMember {
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  contributedXP: number;
  lastActive: Date;
}

export interface ClubChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: {
    tokens: number;
    xp: number;
    badges: string[];
  };
  expiresAt: Date;
  isCompleted: boolean;
}

export interface NFTItem {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'skin' | 'theme' | 'avatar' | 'badge';
  attributes: NFTAttribute[];
  creator: string;
  owner: string;
  price?: number;
  currency?: 'tokens' | 'eth' | 'usdc';
  isForSale: boolean;
  createdAt: Date;
  lastSalePrice?: number;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface MarketplaceListing {
  id: string;
  nftId: string;
  sellerId: string;
  price: number;
  currency: 'tokens' | 'eth' | 'usdc';
  listedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

export interface PlayerInventory {
  userId: string;
  nfts: NFTItem[];
  equippedItems: {
    skin?: string;
    theme?: string;
    avatar?: string;
    badges: string[];
  };
  totalValue: number;
  lastUpdated: Date;
}

export interface BehavioralSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  avgLTV: number;
  churnRate: number;
  preferredOffers: string[];
}

export interface SegmentCriteria {
  minSessions: number;
  maxSessions?: number;
  minSpend: number;
  maxSpend?: number;
  winRateRange: [number, number];
  playTimeRange: [number, number];
  preferredThemes: string[];
  churnRiskRange: [number, number];
}

export interface FraudDetectionResult {
  userId: string;
  riskScore: number;
  confidence: number;
  flags: FraudFlag[];
  recommendation: 'allow' | 'review' | 'block';
  timestamp: Date;
}

export interface FraudFlag {
  type: 'velocity' | 'pattern' | 'device' | 'location' | 'behavior';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: Record<string, any>;
}

export interface LocalizedContent {
  language: string;
  region: string;
  translations: Record<string, string>;
  prizeNames: Record<string, string>;
  themeNames: Record<string, string>;
  currencySymbol: string;
  dateFormat: string;
}

export interface RegionConfig {
  code: string;
  name: string;
  currency: string;
  language: string;
  isGamblingAllowed: boolean;
  maxPrizeValue: number;
  requiredAge: number;
  taxRate: number;
  supportedPayments: string[];
}

export interface SocialShare {
  id: string;
  userId: string;
  platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook';
  content: {
    text: string;
    image?: string;
    video?: string;
    hashtags: string[];
  };
  winAmount?: number;
  theme: string;
  sharedAt: Date;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export interface ReferralProgram {
  id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  status: 'pending' | 'completed' | 'expired';
  reward: {
    referrerTokens: number;
    refereeTokens: number;
    bonusTickets: number;
  };
  createdAt: Date;
  completedAt?: Date;
}
