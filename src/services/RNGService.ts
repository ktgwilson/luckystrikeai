import * as Crypto from 'expo-crypto';
import { Prize, PrizeTier, PrizeType } from '../types';
import { PRIZE_TIERS, PAYOUT_RATIO, SCRATCH_SYMBOLS, WIN_CONDITIONS } from '../constants';

export class RNGService {
  private static async generateSecureRandom(): Promise<number> {
    const randomBytes = await Crypto.getRandomBytesAsync(4);
    const randomValue = new Uint32Array(randomBytes.buffer)[0];
    return randomValue / (0xFFFFFFFF + 1);
  }

  static async generatePrize(): Promise<Prize | null> {
    const random = await this.generateSecureRandom();
    
    let cumulativeProbability = 0;
    for (const [tier, config] of Object.entries(PRIZE_TIERS)) {
      cumulativeProbability += config.probability;
      if (random <= cumulativeProbability) {
        return this.createPrize(tier as PrizeTier, config);
      }
    }
    
    return null;
  }

  private static createPrize(tier: PrizeTier, config: { probability: number; minValue: number; maxValue: number; color: string }): Prize {
    const value = Math.floor(Math.random() * (config.maxValue - config.minValue + 1)) + config.minValue;
    
    return {
      id: `prize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier,
      type: this.determinePrizeType(tier),
      value,
      name: this.getPrizeName(tier, value),
      description: this.getPrizeDescription(tier, value),
      probability: config.probability
    };
  }

  private static determinePrizeType(tier: PrizeTier): PrizeType {
    switch (tier) {
      case PrizeTier.COMMON:
        return PrizeType.TOKENS;
      case PrizeTier.RARE:
        return PrizeType.COINS;
      case PrizeTier.JACKPOT:
        return PrizeType.TOKENS;
      default:
        return PrizeType.NONE;
    }
  }

  private static getPrizeName(tier: PrizeTier, value: number): string {
    switch (tier) {
      case PrizeTier.COMMON:
        return `${value} Tokens`;
      case PrizeTier.RARE:
        return `${value} Coins`;
      case PrizeTier.JACKPOT:
        return `JACKPOT! ${value} Tokens`;
      default:
        return 'No Prize';
    }
  }

  private static getPrizeDescription(tier: PrizeTier, value: number): string {
    switch (tier) {
      case PrizeTier.COMMON:
        return `You won ${value} tokens!`;
      case PrizeTier.RARE:
        return `Amazing! You won ${value} coins!`;
      case PrizeTier.JACKPOT:
        return `INCREDIBLE! You hit the jackpot with ${value} tokens!`;
      default:
        return 'Better luck next time!';
    }
  }

  static async generateScratchSymbols(): Promise<string[]> {
    const symbols: string[] = [];
    
    for (let i = 0; i < 9; i++) {
      const randomIndex = Math.floor(await this.generateSecureRandom() * SCRATCH_SYMBOLS.length);
      symbols.push(SCRATCH_SYMBOLS[randomIndex]);
    }
    
    return symbols;
  }

  static checkWinCondition(symbols: string[]): boolean {
    const symbolCounts: { [key: string]: number } = {};
    
    symbols.forEach(symbol => {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    });
    
    for (const symbol of WIN_CONDITIONS.INSTANT_WIN_SYMBOLS) {
      if (symbols.includes(symbol)) {
        return true;
      }
    }
    
    for (const count of Object.values(symbolCounts)) {
      if (count >= WIN_CONDITIONS.MATCH_THREE) {
        return true;
      }
    }
    
    return false;
  }

  static async shouldWin(): Promise<boolean> {
    const random = await this.generateSecureRandom();
    return random <= PAYOUT_RATIO;
  }
}
