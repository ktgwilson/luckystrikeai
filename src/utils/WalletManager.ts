import { Wallet, Prize, PrizeType, DailyTicketStatus, TicketType } from '../types';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';
import { DAILY_TICKET_RESET_HOURS } from '../constants';

export class WalletManager {
  static async getWallet(): Promise<Wallet> {
    return await StorageService.getWallet();
  }

  static async updateWallet(updates: Partial<Wallet>): Promise<Wallet> {
    const currentWallet = await this.getWallet();
    const oldWallet = { ...currentWallet };
    
    const newWallet: Wallet = {
      ...currentWallet,
      ...updates
    };

    await StorageService.saveWallet(newWallet);
    AnalyticsService.trackWalletUpdate(oldWallet, newWallet);
    
    return newWallet;
  }

  static async addPrize(prize: Prize): Promise<Wallet> {
    console.log('WalletManager: Adding prize:', prize);
    const currentWallet = await this.getWallet();
    console.log('WalletManager: Current wallet before prize:', currentWallet);
    
    const updates: Partial<Wallet> = {
      totalWinnings: currentWallet.totalWinnings + prize.value
    };

    switch (prize.type) {
      case PrizeType.TOKENS:
        updates.tokens = currentWallet.tokens + prize.value;
        break;
      case PrizeType.COINS:
        updates.coins = currentWallet.coins + prize.value;
        break;
      case PrizeType.TICKETS:
        updates.tickets = currentWallet.tickets + prize.value;
        break;
    }

    console.log('WalletManager: Wallet updates to apply:', updates);
    const updatedWallet = await this.updateWallet(updates);
    console.log('WalletManager: Final updated wallet:', updatedWallet);
    return updatedWallet;
  }

  static async burnTicket(): Promise<Wallet> {
    const currentWallet = await this.getWallet();
    if (currentWallet.tickets <= 0) {
      throw new Error('No tickets available to burn');
    }

    return await this.updateWallet({
      tickets: currentWallet.tickets - 1
    });
  }

  static async getDailyTicketStatus(): Promise<DailyTicketStatus> {
    const status = await StorageService.getDailyTicketStatus();
    const now = new Date();

    if (status.lastClaimedAt) {
      const timeSinceLastClaim = now.getTime() - status.lastClaimedAt.getTime();
      const hoursElapsed = timeSinceLastClaim / (1000 * 60 * 60);
      
      if (hoursElapsed >= DAILY_TICKET_RESET_HOURS) {
        status.canClaim = true;
        status.nextClaimAt = null;
      } else {
        status.canClaim = false;
        status.nextClaimAt = new Date(status.lastClaimedAt.getTime() + (DAILY_TICKET_RESET_HOURS * 60 * 60 * 1000));
      }
    } else {
      status.canClaim = true;
    }

    return status;
  }

  static async claimDailyTicket(): Promise<{ wallet: Wallet; status: DailyTicketStatus }> {
    const status = await this.getDailyTicketStatus();
    
    if (!status.canClaim) {
      throw new Error('Daily ticket not available yet');
    }

    const now = new Date();
    const newStatus: DailyTicketStatus = {
      lastClaimedAt: now,
      canClaim: false,
      nextClaimAt: new Date(now.getTime() + (DAILY_TICKET_RESET_HOURS * 60 * 60 * 1000))
    };

    await StorageService.saveDailyTicketStatus(newStatus);
    
    const wallet = await this.updateWallet({
      tickets: (await this.getWallet()).tickets + 1
    });

    AnalyticsService.trackTicketClaimed(TicketType.FREE_DAILY);

    return { wallet, status: newStatus };
  }

  static async canAffordTicket(price: number): Promise<boolean> {
    const wallet = await this.getWallet();
    return wallet.tokens >= price;
  }

  static async purchaseTicket(price: number): Promise<Wallet> {
    const wallet = await this.getWallet();
    
    if (!await this.canAffordTicket(price)) {
      throw new Error('Insufficient tokens');
    }

    return await this.updateWallet({
      tokens: wallet.tokens - price,
      tickets: wallet.tickets + 1,
      totalSpent: wallet.totalSpent + price
    });
  }
}
