export class NotificationService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('NotificationService: Initializing (OneSignal stub for MVP)');
    this.isInitialized = true;
  }

  static async requestPermissions(): Promise<boolean> {
    console.log('NotificationService: Requesting permissions (stub)');
    return true;
  }

  static async scheduleDailyReminder(): Promise<void> {
    console.log('NotificationService: Scheduling daily reminder (stub)');
  }

  static async sendTestNotification(): Promise<void> {
    console.log('NotificationService: Sending test notification (stub)');
  }

  static async cancelAllNotifications(): Promise<void> {
    console.log('NotificationService: Cancelling all notifications (stub)');
  }
}
