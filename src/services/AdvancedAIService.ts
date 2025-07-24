import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { AIEngagementService } from './AIEngagementService';
import { BehavioralSegment, SegmentCriteria, FraudDetectionResult, FraudFlag, UserSession } from '../types';

export class AdvancedAIService {
  private static readonly FRAUD_THRESHOLD = 0.7;
  private static readonly VELOCITY_THRESHOLD = 10; // Max actions per minute
  private static readonly PATTERN_THRESHOLD = 0.8; // Similarity threshold for pattern detection

  static async segmentUser(userId: string): Promise<BehavioralSegment | null> {
    try {
      const behaviorData = await AIEngagementService.analyzeUserBehavior(userId);
      const segments = await this.getAllSegments();

      for (const segment of segments) {
        if (this.matchesSegmentCriteria(behaviorData, segment.criteria)) {
          await this.addUserToSegment(userId, segment.id);
          
          await AnalyticsService.trackEvent('user_segmented', {
            userId,
            segmentId: segment.id,
            segmentName: segment.name,
            engagementScore: behaviorData.engagementScore,
            churnRisk: behaviorData.churnRisk.riskScore
          });

          return segment;
        }
      }

      return await this.createDynamicSegment(behaviorData);
    } catch (error) {
      console.error('Error segmenting user:', error);
      return null;
    }
  }

  static async createBehavioralSegment(
    name: string,
    description: string,
    criteria: SegmentCriteria
  ): Promise<BehavioralSegment> {
    const segment: BehavioralSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      criteria,
      userCount: 0,
      avgLTV: 0,
      churnRate: 0,
      preferredOffers: []
    };

    await this.saveSegment(segment);

    await AnalyticsService.trackEvent('segment_created', {
      segmentId: segment.id,
      name,
      criteria
    });

    return segment;
  }

  static async adjustPrizeTable(segmentId: string, multiplier: number): Promise<void> {
    try {
      const segment = await this.getSegment(segmentId);
      if (!segment) return;

      const currentPrizes = await StorageService.getUserSettings('prize_config');
      
      const adjustedPrizes = this.calculateAdjustedPrizes(currentPrizes, multiplier, segment);
      
      await StorageService.saveUserSettings(`prize_config_${segmentId}`, adjustedPrizes);

      await AnalyticsService.trackEvent('prize_table_adjusted', {
        segmentId,
        multiplier,
        userCount: segment.userCount,
        avgLTV: segment.avgLTV
      });
    } catch (error) {
      console.error('Error adjusting prize table:', error);
    }
  }

  static async detectFraud(userId: string, sessionData: UserSession): Promise<FraudDetectionResult> {
    try {
      const flags: FraudFlag[] = [];
      let riskScore = 0;

      const velocityFlag = await this.checkVelocity(userId);
      if (velocityFlag) {
        flags.push(velocityFlag);
        riskScore += 0.3;
      }

      const patternFlag = await this.checkPatterns(userId);
      if (patternFlag) {
        flags.push(patternFlag);
        riskScore += 0.4;
      }

      const deviceFlag = await this.checkDevice();
      if (deviceFlag) {
        flags.push(deviceFlag);
        riskScore += 0.2;
      }

      const locationFlag = await this.checkLocation();
      if (locationFlag) {
        flags.push(locationFlag);
        riskScore += 0.1;
      }

      const behaviorFlag = await this.checkBehaviorAnomalies(userId, sessionData);
      if (behaviorFlag) {
        flags.push(behaviorFlag);
        riskScore += 0.3;
      }

      const confidence = Math.min(flags.length * 0.2 + 0.6, 1.0);
      const recommendation = this.getFraudRecommendation(riskScore, confidence);

      const result: FraudDetectionResult = {
        userId,
        riskScore: Math.min(riskScore, 1.0),
        confidence,
        flags,
        recommendation,
        timestamp: new Date()
      };

      await this.saveFraudResult(result);

      if (riskScore > this.FRAUD_THRESHOLD) {
        await AnalyticsService.trackEvent('fraud_detected', {
          userId,
          riskScore: result.riskScore,
          confidence: result.confidence,
          flagCount: flags.length,
          recommendation: result.recommendation
        });
      }

      return result;
    } catch (error) {
      console.error('Error detecting fraud:', error);
      return {
        userId,
        riskScore: 0,
        confidence: 0,
        flags: [],
        recommendation: 'allow',
        timestamp: new Date()
      };
    }
  }

  private static matchesSegmentCriteria(behaviorData: any, criteria: SegmentCriteria): boolean {
    const sessionCount = behaviorData.sessionCount || 0;
    const avgSpend = behaviorData.spendingPattern?.avgSpend || 0;
    const winRate = behaviorData.winRate || 0;
    const avgSessionDuration = behaviorData.avgSessionDuration || 0;
    const churnRisk = behaviorData.churnRisk?.riskScore || 0;

    return (
      sessionCount >= criteria.minSessions &&
      (!criteria.maxSessions || sessionCount <= criteria.maxSessions) &&
      avgSpend >= criteria.minSpend &&
      (!criteria.maxSpend || avgSpend <= criteria.maxSpend) &&
      winRate >= criteria.winRateRange[0] && winRate <= criteria.winRateRange[1] &&
      avgSessionDuration >= criteria.playTimeRange[0] && avgSessionDuration <= criteria.playTimeRange[1] &&
      churnRisk >= criteria.churnRiskRange[0] && churnRisk <= criteria.churnRiskRange[1]
    );
  }

  private static async createDynamicSegment(behaviorData: any): Promise<BehavioralSegment> {
    const segmentName = this.generateSegmentName(behaviorData);
    const criteria: SegmentCriteria = {
      minSessions: Math.max(0, behaviorData.sessionCount - 5),
      maxSessions: behaviorData.sessionCount + 5,
      minSpend: Math.max(0, behaviorData.spendingPattern?.avgSpend - 10),
      maxSpend: behaviorData.spendingPattern?.avgSpend + 10,
      winRateRange: [
        Math.max(0, behaviorData.winRate - 0.1),
        Math.min(1, behaviorData.winRate + 0.1)
      ],
      playTimeRange: [
        Math.max(0, behaviorData.avgSessionDuration - 300),
        behaviorData.avgSessionDuration + 300
      ],
      preferredThemes: behaviorData.preferredThemes || [],
      churnRiskRange: [
        Math.max(0, behaviorData.churnRisk?.riskScore - 0.2),
        Math.min(1, behaviorData.churnRisk?.riskScore + 0.2)
      ]
    };

    return await this.createBehavioralSegment(
      segmentName,
      `Auto-generated segment for ${segmentName} players`,
      criteria
    );
  }

  private static generateSegmentName(behaviorData: any): string {
    const winRate = behaviorData.winRate || 0;
    const churnRisk = behaviorData.churnRisk?.riskScore || 0;
    const engagementScore = behaviorData.engagementScore || 0;

    if (winRate > 0.7 && engagementScore > 0.8) return 'High Value Winners';
    if (churnRisk > 0.7) return 'At Risk Players';
    if (engagementScore > 0.8) return 'Highly Engaged';
    if (winRate < 0.3 && churnRisk < 0.3) return 'Casual Players';
    if (behaviorData.sessionCount > 50) return 'Veteran Players';
    if (behaviorData.sessionCount < 10) return 'New Players';
    return 'Standard Players';
  }

  private static async checkVelocity(userId: string): Promise<FraudFlag | null> {
    const recentSessions = await this.getRecentSessions(userId, 60000); // Last minute
    if (recentSessions.length > this.VELOCITY_THRESHOLD) {
      return {
        type: 'velocity',
        severity: 'high',
        description: `Excessive activity: ${recentSessions.length} actions in 1 minute`,
        evidence: { sessionCount: recentSessions.length, threshold: this.VELOCITY_THRESHOLD }
      };
    }
    return null;
  }

  private static async checkPatterns(userId: string): Promise<FraudFlag | null> {
    const userSessions = await StorageService.getUserSessions(userId);
    const patterns = this.analyzeSessionPatterns(userSessions);
    
    if (patterns.similarity > this.PATTERN_THRESHOLD) {
      return {
        type: 'pattern',
        severity: 'medium',
        description: 'Highly repetitive behavior patterns detected',
        evidence: { similarity: patterns.similarity, threshold: this.PATTERN_THRESHOLD }
      };
    }
    return null;
  }

  private static async checkDevice(): Promise<FraudFlag | null> {
    const deviceSessions = await this.getDeviceSessions();
    if (deviceSessions.length > 5) { // Multiple devices
      return {
        type: 'device',
        severity: 'low',
        description: 'Multiple devices detected for single user',
        evidence: { deviceCount: deviceSessions.length }
      };
    }
    return null;
  }

  private static async checkLocation(): Promise<FraudFlag | null> {
    return null; // No location flags for MVP
  }

  private static async checkBehaviorAnomalies(userId: string, sessionData: UserSession): Promise<FraudFlag | null> {
    const behaviorData = await AIEngagementService.analyzeUserBehavior(userId);
    const avgDuration = behaviorData.avgSessionDuration;
    
    if (sessionData.duration < avgDuration * 0.1 || sessionData.duration > avgDuration * 10) {
      return {
        type: 'behavior',
        severity: 'medium',
        description: 'Session duration anomaly detected',
        evidence: { 
          sessionDuration: sessionData.duration, 
          avgDuration,
          deviation: Math.abs(sessionData.duration - avgDuration) / avgDuration
        }
      };
    }
    return null;
  }

  private static getFraudRecommendation(riskScore: number, confidence: number): 'allow' | 'review' | 'block' {
    if (riskScore > 0.8 && confidence > 0.7) return 'block';
    if (riskScore > 0.5 && confidence > 0.5) return 'review';
    return 'allow';
  }

  private static async saveSegment(segment: BehavioralSegment): Promise<void> {
    const segments = await this.getAllSegments();
    const index = segments.findIndex(s => s.id === segment.id);
    if (index >= 0) {
      segments[index] = segment;
    } else {
      segments.push(segment);
    }
    await StorageService.saveUserSettings('behavioral_segments', segments);
  }

  private static async getSegment(segmentId: string): Promise<BehavioralSegment | null> {
    const segments = await this.getAllSegments();
    return segments.find(s => s.id === segmentId) || null;
  }

  private static async getAllSegments(): Promise<BehavioralSegment[]> {
    const data = await StorageService.getUserSettings('behavioral_segments');
    return Array.isArray(data) ? data : [];
  }

  private static async addUserToSegment(userId: string, segmentId: string): Promise<void> {
    const userSegments = await StorageService.getUserSettings(`user_segments_${userId}`);
    const segments = Array.isArray(userSegments) ? userSegments : [];
    if (!segments.includes(segmentId)) {
      segments.push(segmentId);
      await StorageService.saveUserSettings(`user_segments_${userId}`, segments);
    }
  }

  private static calculateAdjustedPrizes(currentPrizes: any, multiplier: number, segment: BehavioralSegment): any {
    return {
      ...currentPrizes,
      multiplier,
      segmentId: segment.id,
      adjustedAt: new Date().toISOString()
    };
  }

  private static async saveFraudResult(result: FraudDetectionResult): Promise<void> {
    const results = await this.getAllFraudResults();
    results.push(result);
    if (results.length > 1000) {
      results.splice(0, results.length - 1000);
    }
    await StorageService.saveUserSettings('fraud_results', results);
  }

  private static async getAllFraudResults(): Promise<FraudDetectionResult[]> {
    const data = await StorageService.getUserSettings('fraud_results');
    return Array.isArray(data) ? data.map(result => ({
      ...result,
      timestamp: new Date(result.timestamp)
    })) : [];
  }

  private static async getRecentSessions(userId: string, timeWindowMs: number): Promise<UserSession[]> {
    const sessions = await StorageService.getUserSessions(userId);
    const cutoff = Date.now() - timeWindowMs;
    return sessions.filter(session => session.timestamp > cutoff);
  }

  private static analyzeSessionPatterns(sessions: UserSession[]): { similarity: number } {
    if (sessions.length < 3) return { similarity: 0 };
    
    const durations = sessions.map(s => s.duration);
    const uniqueDurations = new Set(durations);
    const similarity = 1 - (uniqueDurations.size / durations.length);
    
    return { similarity };
  }

  private static async getDeviceSessions(): Promise<string[]> {
    return ['device1']; // Single device for MVP
  }
}
