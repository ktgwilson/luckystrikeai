import { PrizeTier } from '../types';

export const COLORS = {
  primary: '#FFD700',
  secondary: '#8A2BE2',
  accent: '#FF1493',
  electric: '#00FFFF',
  background: '#1a1a2e',
  surface: '#16213e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  success: '#00ff00',
  error: '#ff0000',
  warning: '#ffaa00'
};

export const PRIZE_TIERS = {
  [PrizeTier.COMMON]: {
    probability: 0.70,
    minValue: 1,
    maxValue: 10,
    color: COLORS.primary
  },
  [PrizeTier.RARE]: {
    probability: 0.25,
    minValue: 25,
    maxValue: 100,
    color: COLORS.secondary
  },
  [PrizeTier.JACKPOT]: {
    probability: 0.05,
    minValue: 500,
    maxValue: 10000,
    color: COLORS.accent
  }
};

export const PAYOUT_RATIO = 0.75;

export const DAILY_TICKET_RESET_HOURS = 24;

export const RNG_CONFIG = {
  seed: 'luckystrike_mvp_2025',
  iterations: 1000
};

export const ANALYTICS_EVENTS = {
  APP_OPENED: 'app_opened',
  SCRATCH_STARTED: 'scratch_started',
  SCRATCH_COMPLETED: 'scratch_completed',
  PRIZE_WON: 'prize_won',
  TICKET_CLAIMED: 'ticket_claimed',
  WALLET_UPDATED: 'wallet_updated',
  AGE_VERIFIED: 'age_verified',
  TERMS_ACCEPTED: 'terms_accepted',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_ERROR: 'payment_error',
  TICKET_PURCHASED: 'ticket_purchased',
  WALLET_FUNDED: 'wallet_funded'
};

export const COMPLIANCE = {
  MIN_AGE: 18,
  RESTRICTED_COUNTRIES: ['US-UT', 'US-WA'],
  TERMS_VERSION: '1.0',
  PRIVACY_VERSION: '1.0'
};

export const SCRATCH_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰', '🔔'];

export const WIN_CONDITIONS = {
  MATCH_THREE: 3,
  INSTANT_WIN_SYMBOLS: ['💎', '⭐']
};
