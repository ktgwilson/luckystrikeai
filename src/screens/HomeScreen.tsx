import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, DailyTicketStatus } from '../types';
import { WalletManager } from '../utils/WalletManager';
import { COLORS } from '../constants';

interface HomeScreenProps {
  onScratchPress: () => void;
  onAccountPress: () => void;
  wallet: Wallet;
  onWalletUpdate: (wallet: Wallet) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onScratchPress, onAccountPress, wallet, onWalletUpdate }) => {
  const [dailyTicketStatus, setDailyTicketStatus] = useState<DailyTicketStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDailyTicketStatus();
  }, []);

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
    } catch (error) {
      console.error('Error claiming daily ticket:', error);
      Alert.alert('Error', 'Failed to claim daily ticket. Please try again.');
    } finally {
      setIsLoading(false);
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
          <TouchableOpacity style={styles.accountButton} onPress={onAccountPress}>
            <Text style={styles.accountButtonText}>👤 Account</Text>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={[styles.scratchButton, wallet.tickets === 0 && styles.disabledButton]}
          onPress={onScratchPress}
          disabled={wallet.tickets === 0}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
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
  accountButton: {
    position: 'absolute',
    top: 0,
    right: 0,
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
});
