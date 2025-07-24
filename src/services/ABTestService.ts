import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsService } from './AnalyticsService';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetPercentage: number;
  createdAt: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  weight: number;
  isControl: boolean;
}

export interface UserABTestAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: Date;
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
}

class ABTestServiceClass {
  private readonly STORAGE_KEY_PREFIX = 'ab_test_';
  private readonly USER_ASSIGNMENTS_KEY = 'user_ab_assignments';
  private readonly TEST_RESULTS_KEY = 'ab_test_results';

  async createABTest(test: Omit<ABTest, 'id' | 'createdAt'>): Promise<ABTest> {
    const newTest: ABTest = {
      ...test,
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    await this.saveABTest(newTest);
    
    await AnalyticsService.trackEvent('ab_test_created', {
      testId: newTest.id,
      testName: newTest.name,
      variantCount: newTest.variants.length,
      targetPercentage: newTest.targetPercentage
    });

    return newTest;
  }

  async getActiveABTests(): Promise<ABTest[]> {
    try {
      const allTests = await this.getAllABTests();
      const now = new Date();
      
      return allTests.filter(test => 
        test.isActive && 
        test.startDate <= now && 
        (!test.endDate || test.endDate >= now)
      );
    } catch (error) {
      console.error('Error getting active AB tests:', error);
      return [];
    }
  }

  async assignUserToTest(userId: string, testId: string): Promise<ABTestVariant | null> {
    try {
      const existingAssignment = await this.getUserTestAssignment(userId, testId);
      if (existingAssignment) {
        const test = await this.getABTest(testId);
        return test?.variants.find(v => v.id === existingAssignment.variantId) || null;
      }

      const test = await this.getABTest(testId);
      if (!test || !test.isActive) {
        return null;
      }

      const userHash = this.hashUserId(userId);
      const userPercentile = (userHash % 100) + 1;
      
      if (userPercentile > test.targetPercentage) {
        return null; // User not in test group
      }

      const selectedVariant = this.selectVariantByWeight(test.variants, userHash);
      
      if (selectedVariant) {
        const assignment: UserABTestAssignment = {
          userId,
          testId,
          variantId: selectedVariant.id,
          assignedAt: new Date()
        };

        await this.saveUserAssignment(assignment);
        
        await AnalyticsService.trackEvent('ab_test_user_assigned', {
          userId,
          testId,
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          isControl: selectedVariant.isControl
        });
      }

      return selectedVariant;
    } catch (error) {
      console.error('Error assigning user to AB test:', error);
      return null;
    }
  }

  async getUserVariant(userId: string, testId: string): Promise<ABTestVariant | null> {
    try {
      const assignment = await this.getUserTestAssignment(userId, testId);
      if (!assignment) {
        return await this.assignUserToTest(userId, testId);
      }

      const test = await this.getABTest(testId);
      return test?.variants.find(v => v.id === assignment.variantId) || null;
    } catch (error) {
      console.error('Error getting user variant:', error);
      return null;
    }
  }

  async trackABTestEvent(
    userId: string, 
    testId: string, 
    eventType: string, 
    eventData: Record<string, any> = {}
  ): Promise<void> {
    try {
      const assignment = await this.getUserTestAssignment(userId, testId);
      if (!assignment) {
        return; // User not in test
      }

      const result: ABTestResult = {
        testId,
        variantId: assignment.variantId,
        userId,
        eventType,
        eventData,
        timestamp: new Date()
      };

      await this.saveTestResult(result);
      
      await AnalyticsService.trackEvent('ab_test_event', {
        userId,
        testId,
        variantId: assignment.variantId,
        eventType,
        ...eventData
      });
    } catch (error) {
      console.error('Error tracking AB test event:', error);
    }
  }

  async getTestResults(testId: string): Promise<{
    totalParticipants: number;
    variantResults: Array<{
      variantId: string;
      variantName: string;
      participants: number;
      events: Record<string, number>;
      conversionRate: number;
    }>;
  }> {
    try {
      const test = await this.getABTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const assignments = await this.getTestAssignments(testId);
      const results = await this.getTestResultsData(testId);

      const variantResults = test.variants.map(variant => {
        const variantAssignments = assignments.filter(a => a.variantId === variant.id);
        const variantResults = results.filter(r => r.variantId === variant.id);
        
        const eventCounts: Record<string, number> = {};
        variantResults.forEach(result => {
          eventCounts[result.eventType] = (eventCounts[result.eventType] || 0) + 1;
        });

        const conversions = eventCounts['conversion'] || 0;
        const conversionRate = variantAssignments.length > 0 ? 
          (conversions / variantAssignments.length) * 100 : 0;

        return {
          variantId: variant.id,
          variantName: variant.name,
          participants: variantAssignments.length,
          events: eventCounts,
          conversionRate
        };
      });

      return {
        totalParticipants: assignments.length,
        variantResults
      };
    } catch (error) {
      console.error('Error getting test results:', error);
      return {
        totalParticipants: 0,
        variantResults: []
      };
    }
  }

  async endABTest(testId: string): Promise<void> {
    try {
      const test = await this.getABTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const updatedTest: ABTest = {
        ...test,
        isActive: false,
        endDate: new Date()
      };

      await this.saveABTest(updatedTest);
      
      await AnalyticsService.trackEvent('ab_test_ended', {
        testId,
        testName: test.name,
        duration: updatedTest.endDate ? updatedTest.endDate.getTime() - test.startDate.getTime() : 0
      });
    } catch (error) {
      console.error('Error ending AB test:', error);
      throw error;
    }
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private selectVariantByWeight(variants: ABTestVariant[], userHash: number): ABTestVariant | null {
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (totalWeight === 0) return null;

    const randomValue = (userHash % totalWeight);
    let currentWeight = 0;

    for (const variant of variants) {
      currentWeight += variant.weight;
      if (randomValue < currentWeight) {
        return variant;
      }
    }

    return variants[variants.length - 1]; // Fallback to last variant
  }

  private async saveABTest(test: ABTest): Promise<void> {
    const key = `${this.STORAGE_KEY_PREFIX}${test.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(test));
  }

  private async getABTest(testId: string): Promise<ABTest | null> {
    const key = `${this.STORAGE_KEY_PREFIX}${testId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private async getAllABTests(): Promise<ABTest[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const testKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY_PREFIX));
      
      const tests: ABTest[] = [];
      for (const key of testKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const test = JSON.parse(data);
          tests.push(test);
        }
      }
      
      return tests;
    } catch (error) {
      console.error('Error getting all AB tests:', error);
      return [];
    }
  }

  private async saveUserAssignment(assignment: UserABTestAssignment): Promise<void> {
    const assignments = await this.getUserAssignments(assignment.userId);
    const updatedAssignments = assignments.filter(a => a.testId !== assignment.testId);
    updatedAssignments.push(assignment);
    
    const key = `${this.USER_ASSIGNMENTS_KEY}_${assignment.userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updatedAssignments));
  }

  private async getUserTestAssignment(userId: string, testId: string): Promise<UserABTestAssignment | null> {
    const assignments = await this.getUserAssignments(userId);
    return assignments.find(a => a.testId === testId) || null;
  }

  private async getUserAssignments(userId: string): Promise<UserABTestAssignment[]> {
    const key = `${this.USER_ASSIGNMENTS_KEY}_${userId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private async getTestAssignments(testId: string): Promise<UserABTestAssignment[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const assignmentKeys = keys.filter(key => key.startsWith(this.USER_ASSIGNMENTS_KEY));
      
      const allAssignments: UserABTestAssignment[] = [];
      for (const key of assignmentKeys) {
        const data = await AsyncStorage.getItem(key);
        const userAssignments = data ? JSON.parse(data) : [];
        const testAssignments = userAssignments.filter((a: UserABTestAssignment) => a.testId === testId);
        allAssignments.push(...testAssignments);
      }
      
      return allAssignments;
    } catch (error) {
      console.error('Error getting test assignments:', error);
      return [];
    }
  }

  private async saveTestResult(result: ABTestResult): Promise<void> {
    const results = await this.getTestResultsData(result.testId);
    results.push(result);
    
    const key = `${this.TEST_RESULTS_KEY}_${result.testId}`;
    await AsyncStorage.setItem(key, JSON.stringify(results));
  }

  private async getTestResultsData(testId: string): Promise<ABTestResult[]> {
    const key = `${this.TEST_RESULTS_KEY}_${testId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
}

export const ABTestService = new ABTestServiceClass();
