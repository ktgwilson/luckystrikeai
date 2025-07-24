import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { AIPersonalizationData, SmartReward } from '../types';

export class NotificationService {
  private static isInitialized = false;
  private static hasPermissions = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('NotificationService: Initializing personalized notifications');
      this.hasPermissions = await this.requestPermissions();
      this.isInitialized = true;
      
      await AnalyticsService.trackEvent('notification_service_initialized', {
        hasPermissions: this.hasPermissions,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Initialization failed:', error);
    }
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      console.log('NotificationService: Requesting notification permissions');
      
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        
        await AnalyticsService.trackEvent('notification_permission_requested', {
          granted,
          permission,
          timestamp: Date.now()
        });
        
        return granted;
      }
      
      return false;
    } catch (error) {
      console.error('NotificationService: Permission request failed:', error);
      return false;
    }
  }

  static async scheduleDailyReminder(userId: string): Promise<void> {
    if (!this.hasPermissions) return;
    
    try {
      const aiData = await StorageService.getAIPersonalizationData(userId);
      const message = this.generatePersonalizedReminderMessage(aiData);
      
      console.log('NotificationService: Scheduling daily reminder:', message);
      
      await AnalyticsService.trackEvent('daily_reminder_scheduled', {
        userId,
        message,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Failed to schedule daily reminder:', error);
    }
  }

  static async sendPersonalizedNotification(
    userId: string, 
    reward: SmartReward
  ): Promise<void> {
    if (!this.hasPermissions) return;
    
    try {
      const title = this.getNotificationTitle(reward.type);
      const body = reward.personalizedMessage || reward.description;
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `reward_${reward.id}`,
          requireInteraction: true,
          data: {
            rewardId: reward.id,
            userId,
            type: reward.type
          }
        });
      }
      
      await AnalyticsService.trackEvent('personalized_notification_sent', {
        userId,
        rewardId: reward.id,
        rewardType: reward.type,
        title,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Failed to send personalized notification:', error);
    }
  }

  static async sendChurnPreventionNotification(
    userId: string, 
    churnRisk: number
  ): Promise<void> {
    if (!this.hasPermissions || churnRisk < 0.7) return;
    
    try {
      const title = "We miss you! 🎁";
      const body = "Come back and claim your special comeback bonus - limited time offer!";
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `churn_prevention_${userId}`,
          requireInteraction: true,
          data: {
            userId,
            type: 'churn_prevention',
            churnRisk
          }
        });
      }
      
      await AnalyticsService.trackEvent('churn_prevention_notification_sent', {
        userId,
        churnRisk,
        title,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Failed to send churn prevention notification:', error);
    }
  }

  static async sendLuckyHourNotification(userId: string): Promise<void> {
    if (!this.hasPermissions) return;
    
    try {
      const title = "🍀 Lucky Hour is Active!";
      const body = "Double your chances of winning right now - don't miss out!";
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `lucky_hour_${userId}`,
          requireInteraction: true,
          data: {
            userId,
            type: 'lucky_hour'
          }
        });
      }
      
      await AnalyticsService.trackEvent('lucky_hour_notification_sent', {
        userId,
        title,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Failed to send lucky hour notification:', error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      console.log('NotificationService: Cancelling all notifications');
      
      await AnalyticsService.trackEvent('all_notifications_cancelled', {
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('NotificationService: Failed to cancel notifications:', error);
    }
  }

  private static generatePersonalizedReminderMessage(aiData: AIPersonalizationData | null): string {
    if (!aiData) return "Your daily scratch card is waiting! 🎫";
    
    const messages = [
      `Your favorite ${aiData.preferredThemes[0]} theme is back! 🎨`,
      `You're on a ${Math.round(aiData.winRate * 100)}% win streak - keep it going! 🔥`,
      `${aiData.sessionCount} sessions and counting - you're dedicated! 💪`,
      "Your lucky numbers are calling! 🍀"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private static getNotificationTitle(rewardType: string): string {
    switch (rewardType) {
      case 'comeback_bonus': return '🎁 Welcome Back Bonus!';
      case 'lucky_hour': return '🍀 Lucky Hour Active!';
      case 'loyalty_reward': return '👑 Loyalty Reward!';
      case 'streak_bonus': return '🔥 Streak Bonus!';
      default: return '⭐ Special Reward!';
    }
  }
}
