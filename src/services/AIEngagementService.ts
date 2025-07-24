import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { WalletManager } from '../utils/WalletManager';
import { User, Wallet, AIPersonalizationData, ChurnPrediction, SmartReward } from '../types';

export class AIEngagementService {
  private static readonly CHURN_THRESHOLD = 0.7;
  private static readonly ENGAGEMENT_WINDOW_DAYS = 7;
  private static readonly MIN_SESSIONS_FOR_PREDICTION = 5;

  static async analyzeUserBehavior(userId: string): Promise<AIPersonalizationData> {
    try {
      const userSessions = await StorageService.getUserSessions(userId);
      const wallet = await WalletManager.getWallet();
      const lastActivity = await StorageService.getLastActivity(userId);
      
      const behaviorData: AIPersonalizationData = {
        userId,
        sessionCount: userSessions.length,
        avgSessionDuration: this.calculateAverageSessionDuration(userSessions),
        winRate: this.calculateWinRate(userSessions),
        spendingPattern: this.analyzeSpendingPattern(userSessions),
        preferredPlayTimes: this.analyzePlayTimes(userSessions),
        churnRisk: await this.predictChurnRisk(userId, userSessions),
        lastActivity: lastActivity || new Date(),
        engagementScore: this.calculateEngagementScore(userSessions, wallet),
        preferredThemes: this.analyzeThemePreferences(userSessions)
      };

      await StorageService.saveAIPersonalizationData(userId, behaviorData);
      return behaviorData;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      throw error;
    }
  }

  static async predictChurnRisk(userId: string, sessions: any[]): Promise<ChurnPrediction> {
    try {
      if (sessions.length < this.MIN_SESSIONS_FOR_PREDICTION) {
        return {
          riskScore: 0.5,
          confidence: 0.3,
          factors: ['Insufficient data'],
          recommendation: 'Continue monitoring user behavior'
        };
      }

      const daysSinceLastSession = this.getDaysSinceLastSession(sessions);
      const sessionFrequencyTrend = this.calculateSessionFrequencyTrend(sessions);
      const spendingTrend = this.calculateSpendingTrend(sessions);
      const winLossRatio = this.calculateWinLossRatio(sessions);

      let riskScore = 0;
      const factors: string[] = [];

      if (daysSinceLastSession > 3) {
        riskScore += 0.3;
        factors.push('Extended absence from app');
      }

      if (sessionFrequencyTrend < -0.2) {
        riskScore += 0.25;
        factors.push('Declining session frequency');
      }

      if (spendingTrend < -0.3) {
        riskScore += 0.2;
        factors.push('Reduced spending activity');
      }

      if (winLossRatio < 0.1) {
        riskScore += 0.25;
        factors.push('Poor win rate experience');
      }

      const confidence = Math.min(sessions.length / 20, 1.0);
      
      let recommendation = 'User engagement is healthy';
      if (riskScore > this.CHURN_THRESHOLD) {
        recommendation = 'High churn risk - deploy retention campaign';
      } else if (riskScore > 0.4) {
        recommendation = 'Moderate churn risk - increase engagement';
      }

      return {
        riskScore: Math.min(riskScore, 1.0),
        confidence,
        factors,
        recommendation
      };
    } catch (error) {
      console.error('Error predicting churn risk:', error);
      return {
        riskScore: 0.5,
        confidence: 0.1,
        factors: ['Error in prediction'],
        recommendation: 'Manual review required'
      };
    }
  }

  static async generateSmartReward(userId: string): Promise<SmartReward | null> {
    try {
      const behaviorData = await this.analyzeUserBehavior(userId);
      const wallet = await WalletManager.getWallet();
      
      if (behaviorData.churnRisk.riskScore > this.CHURN_THRESHOLD) {
        return this.generateComebackBonus(behaviorData, wallet);
      }

      if (this.isInLuckyHour()) {
        return this.generateLuckyHourBonus(behaviorData);
      }

      if (behaviorData.engagementScore > 0.8) {
        return this.generateLoyaltyReward(behaviorData);
      }

      return null;
    } catch (error) {
      console.error('Error generating smart reward:', error);
      return null;
    }
  }

  private static generateComebackBonus(behaviorData: AIPersonalizationData, wallet: Wallet): SmartReward {
    const bonusTokens = Math.floor(behaviorData.spendingPattern.avgSpend * 0.5);
    
    return {
      id: `comeback_${Date.now()}`,
      type: 'comeback_bonus',
      title: 'Welcome Back!',
      description: `We missed you! Here's ${bonusTokens} bonus tokens to get you back in the game.`,
      reward: {
        tokens: bonusTokens,
        freeTickets: 2,
        multiplier: 1.2
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      personalizedMessage: this.generatePersonalizedMessage(behaviorData),
      triggerCondition: 'churn_risk_high'
    };
  }

  private static generateLuckyHourBonus(behaviorData: AIPersonalizationData): SmartReward {
    return {
      id: `lucky_hour_${Date.now()}`,
      type: 'lucky_hour',
      title: 'Lucky Hour Active!',
      description: 'Double your chances of winning for the next hour!',
      reward: {
        tokens: 0,
        freeTickets: 1,
        multiplier: 2.0
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      personalizedMessage: 'Your lucky hour is here - time to strike it rich!',
      triggerCondition: 'lucky_hour_active'
    };
  }

  private static generateLoyaltyReward(behaviorData: AIPersonalizationData): SmartReward {
    const loyaltyTokens = Math.floor(behaviorData.sessionCount * 2);
    
    return {
      id: `loyalty_${Date.now()}`,
      type: 'loyalty_reward',
      title: 'Loyalty Bonus',
      description: `Thanks for being a loyal player! ${loyaltyTokens} bonus tokens for you.`,
      reward: {
        tokens: loyaltyTokens,
        freeTickets: 1,
        multiplier: 1.1
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      personalizedMessage: 'Your dedication pays off!',
      triggerCondition: 'high_engagement'
    };
  }

  private static calculateAverageSessionDuration(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    return totalDuration / sessions.length;
  }

  private static calculateWinRate(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const wins = sessions.filter(session => session.won).length;
    return wins / sessions.length;
  }

  private static analyzeSpendingPattern(sessions: any[]): { avgSpend: number; trend: number } {
    const spends = sessions.map(s => s.tokensSpent || 0);
    const avgSpend = spends.reduce((sum, spend) => sum + spend, 0) / spends.length || 0;
    
    const recentSpends = spends.slice(-5);
    const olderSpends = spends.slice(0, -5);
    const recentAvg = recentSpends.reduce((sum, spend) => sum + spend, 0) / recentSpends.length || 0;
    const olderAvg = olderSpends.reduce((sum, spend) => sum + spend, 0) / olderSpends.length || 0;
    
    const trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    
    return { avgSpend, trend };
  }

  private static analyzePlayTimes(sessions: any[]): number[] {
    const hourCounts = new Array(24).fill(0);
    sessions.forEach(session => {
      if (session.timestamp) {
        const hour = new Date(session.timestamp).getHours();
        hourCounts[hour]++;
      }
    });
    return hourCounts;
  }

  private static calculateEngagementScore(sessions: any[], wallet: Wallet): number {
    const sessionScore = Math.min(sessions.length / 50, 1.0) * 0.3;
    const walletScore = Math.min(wallet.totalTokens / 1000, 1.0) * 0.3;
    const activityScore = this.calculateRecentActivityScore(sessions) * 0.4;
    
    return sessionScore + walletScore + activityScore;
  }

  private static analyzeThemePreferences(sessions: any[]): string[] {
    const themeCounts: { [key: string]: number } = {};
    sessions.forEach(session => {
      if (session.theme) {
        themeCounts[session.theme] = (themeCounts[session.theme] || 0) + 1;
      }
    });
    
    return Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme);
  }

  private static getDaysSinceLastSession(sessions: any[]): number {
    if (sessions.length === 0) return 999;
    const lastSession = sessions[sessions.length - 1];
    const lastTimestamp = lastSession.timestamp || Date.now();
    return (Date.now() - lastTimestamp) / (1000 * 60 * 60 * 24);
  }

  private static calculateSessionFrequencyTrend(sessions: any[]): number {
    if (sessions.length < 10) return 0;
    
    const recentSessions = sessions.slice(-5);
    const olderSessions = sessions.slice(-10, -5);
    
    const recentFreq = this.calculateFrequency(recentSessions);
    const olderFreq = this.calculateFrequency(olderSessions);
    
    return olderFreq > 0 ? (recentFreq - olderFreq) / olderFreq : 0;
  }

  private static calculateSpendingTrend(sessions: any[]): number {
    const spendingPattern = this.analyzeSpendingPattern(sessions);
    return spendingPattern.trend;
  }

  private static calculateWinLossRatio(sessions: any[]): number {
    const wins = sessions.filter(s => s.won).length;
    const losses = sessions.length - wins;
    return losses > 0 ? wins / losses : wins;
  }

  private static calculateFrequency(sessions: any[]): number {
    if (sessions.length < 2) return 0;
    const timeSpan = sessions[sessions.length - 1].timestamp - sessions[0].timestamp;
    return sessions.length / (timeSpan / (1000 * 60 * 60 * 24));
  }

  private static calculateRecentActivityScore(sessions: any[]): number {
    const recentSessions = sessions.filter(session => {
      const daysSince = (Date.now() - session.timestamp) / (1000 * 60 * 60 * 24);
      return daysSince <= this.ENGAGEMENT_WINDOW_DAYS;
    });
    
    return Math.min(recentSessions.length / 10, 1.0);
  }

  private static isInLuckyHour(): boolean {
    const hour = new Date().getHours();
    return hour >= 19 && hour <= 21;
  }

  private static generatePersonalizedMessage(behaviorData: AIPersonalizationData): string {
    const messages = [
      `We noticed you love ${behaviorData.preferredThemes[0]} themes!`,
      `Your ${behaviorData.sessionCount} sessions show real dedication!`,
      `Time to beat your best win streak!`,
      `Special offer just for you!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  static async trackAIEvent(eventType: string, userId: string, data: any): Promise<void> {
    await AnalyticsService.trackEvent(`ai_${eventType}`, {
      userId,
      timestamp: Date.now(),
      ...data
    });
  }
}
