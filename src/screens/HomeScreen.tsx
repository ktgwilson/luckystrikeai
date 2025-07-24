import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, DailyTicketStatus, SmartReward } from '../types';
import { WalletManager } from '../utils/WalletManager';
import { COLORS, SCRATCH_THEMES } from '../constants';
import { AIEngagementService } from '../services/AIEngagementService';
import { StorageService } from '../services/StorageService';
import { SmartRewardModal } from '../components/SmartRewardModal';
import { AIInsightsPanel } from '../components/AIInsightsPanel';

interface HomeScreenProps {
  onScratchPress: () => void;
  onAccountPress: () => void;
  wallet: Wallet;
  onWalletUpdate: (wallet: Wallet) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onScratchPress, onAccountPress, wallet, onWalletUpdate }) => {
  const [dailyTicketStatus, setDailyTicketStatus] = useState<DailyTicketStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [featuredTheme, setFeaturedTheme] = useState(SCRATCH_THEMES.AURORA_FORTUNE);
  const [smartReward, setSmartReward] = useState<SmartReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}`);

  useEffect(() => {
    loadDailyTicketStatus();
    selectFeaturedTheme();
    checkForSmartRewards();
  }, []);

  const checkForSmartRewards = async () => {
    try {
      const reward = await AIEngagementService.generateSmartReward(userId);
      if (reward) {
        setSmartReward(reward);
        setShowRewardModal(true);
      }
    } catch (error) {
      console.error('Error checking for smart rewards:', error);
    }
  };

  const selectFeaturedTheme = () => {
    const themes = Object.values(SCRATCH_THEMES);
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    setFeaturedTheme(randomTheme);
  };

  const loadDailyTicketStatus = async () => {
    try {
      const status = await WalletManager.getDailyTicketStatus();
      setDailyTicketStatus(status);
    } catch (error) {
      console.error('Error loading daily ticket status:', error);
    }
  };

  const handleClaimDailyTicket = async () => {
    if (!dailyTicketStatus?.canClaim) return;

    setIsLoading(true);
    try {
      const { wallet: newWallet, status } = await WalletManager.claimDailyTicket();
      onWalletUpdate(newWallet);
      setDailyTicketStatus(status);
      Alert.alert('Success!', 'You claimed your daily free ticket!');

      await StorageService.updateLastActivity(userId);
      await StorageService.saveUserSession(userId, {
        id: `session_${Date.now()}`,
        userId,
        timestamp: Date.now(),
        duration: 0,
        won: false,
        tokensSpent: 0,
        theme: 'daily_claim',
        scratchCount: 0
      });
    } catch (error) {
      console.error('Error claiming daily ticket:', error);
      Alert.alert('Error', 'Failed to claim daily ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimSmartReward = async (reward: SmartReward) => {
    try {
      await AIEngagementService.trackAIEvent('reward_claimed', userId, {
        rewardId: reward.id,
        rewardType: reward.type,
        tokensAwarded: reward.reward.tokens,
        ticketsAwarded: reward.reward.freeTickets
      });
      
      const updatedWallet = await WalletManager.getWallet();
      onWalletUpdate(updatedWallet);
    } catch (error) {
      console.error('Error handling smart reward claim:', error);
    }
  };

  const formatTimeUntilNextTicket = (): string => {
    if (!dailyTicketStatus?.nextClaimAt) return '';
    
    const now = new Date();
    const diff = dailyTicketStatus.nextClaimAt.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🎰 LuckyStrike</Text>
          <Text style={styles.subtitle}>AI-Powered Scratch-Off</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.aiButton} onPress={() => setShowAIInsights(true)}>
              <Text style={styles.aiButtonText}>🤖 AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountButton} onPress={onAccountPress}>
              <Text style={styles.accountButtonText}>👤 Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.walletContainer}>
          <Text style={styles.walletTitle}>Your Wallet</Text>
          
          <View style={styles.walletGrid}>
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Tickets</Text>
              <Text style={styles.walletValue}>{wallet.tickets}</Text>
            </View>
            
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Tokens</Text>
              <Text style={styles.walletValue}>{wallet.tokens}</Text>
            </View>
            
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Coins</Text>
              <Text style={styles.walletValue}>{wallet.coins}</Text>
            </View>
            
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Total Won</Text>
              <Text style={styles.walletValue}>{wallet.totalWinnings}</Text>
            </View>
          </View>
        </View>

        <View style={styles.dailyTicketContainer}>
          <Text style={styles.dailyTicketTitle}>Daily Free Ticket</Text>
          
          {dailyTicketStatus?.canClaim ? (
            <TouchableOpacity
              style={[styles.claimButton, isLoading && styles.disabledButton]}
              onPress={handleClaimDailyTicket}
              disabled={isLoading}
            >
              <Text style={styles.claimButtonText}>
                {isLoading ? 'Claiming...' : '🎫 Claim Free Ticket'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.nextTicketContainer}>
              <Text style={styles.nextTicketText}>Next free ticket in:</Text>
              <Text style={styles.nextTicketTime}>{formatTimeUntilNextTicket()}</Text>
            </View>
          )}
        </View>

        <View style={styles.featuredGameContainer}>
          <Text style={styles.featuredGameTitle}>🎯 Featured Game</Text>
          <View style={styles.themePreview}>
            <LinearGradient
              colors={[featuredTheme.colors.primary, featuredTheme.colors.secondary]}
              style={styles.themeCard}
            >
              <Text style={styles.themeName}>{featuredTheme.name}</Text>
              <Text style={styles.themeDesc}>{featuredTheme.theme}</Text>
              <View style={styles.themeSymbols}>
                {featuredTheme.symbols.slice(0, 3).map((symbol: string, index: number) => (
                  <Text key={index} style={styles.themeSymbol}>{symbol}</Text>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.scratchButton, wallet.tickets === 0 && styles.disabledButton]}
          onPress={onScratchPress}
          disabled={wallet.tickets === 0}
        >
          <LinearGradient
            colors={[featuredTheme.colors.primary, featuredTheme.colors.accent]}
            style={styles.scratchButtonGradient}
          >
            <Text style={styles.scratchButtonText}>
              {wallet.tickets > 0 ? '✨ SCRATCH NOW ✨' : 'No Tickets Available'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{wallet.totalSpent}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statValue}>
                {wallet.totalSpent > 0 ? Math.round((wallet.totalWinnings / wallet.totalSpent) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SmartRewardModal
        reward={smartReward}
        visible={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        onClaim={handleClaimSmartReward}
        userId={userId}
      />

      <AIInsightsPanel
        userId={userId}
        visible={showAIInsights}
        onClose={() => setShowAIInsights(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
  },
  aiButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  aiButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  accountButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  accountButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  walletContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  walletItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  walletLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  walletValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dailyTicketContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    alignItems: 'center',
  },
  dailyTicketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  claimButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  claimButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextTicketContainer: {
    alignItems: 'center',
  },
  nextTicketText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  nextTicketTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  scratchButton: {
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  scratchButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  scratchButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  statsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  featuredGameContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  featuredGameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  themePreview: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  themeCard: {
    padding: 15,
    alignItems: 'center',
  },
  themeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  themeDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  themeSymbols: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  themeSymbol: {
    fontSize: 20,
    marginHorizontal: 5,
  },
});
