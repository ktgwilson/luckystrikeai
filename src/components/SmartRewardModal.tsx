import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartReward } from '../types';
import { COLORS } from '../constants';
import { WalletManager } from '../utils/WalletManager';
import { AnalyticsService } from '../services/AnalyticsService';

interface SmartRewardModalProps {
  reward: SmartReward | null;
  visible: boolean;
  onClose: () => void;
  onClaim: (reward: SmartReward) => void;
  userId: string;
}

export const SmartRewardModal: React.FC<SmartRewardModalProps> = ({
  reward,
  visible,
  onClose,
  onClaim,
  userId
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (visible && reward) {
      setClaimed(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      AnalyticsService.trackEvent('ai_reward_shown', {
        userId,
        rewardId: reward.id,
        rewardType: reward.type,
        triggerCondition: reward.triggerCondition
      });
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, reward]);

  const handleClaim = async () => {
    if (!reward || claimed) return;

    try {
      setClaimed(true);
      
      const wallet = await WalletManager.getWallet();
      const updatedWallet = {
        ...wallet,
        tokens: wallet.tokens + reward.reward.tokens,
        tickets: wallet.tickets + reward.reward.freeTickets
      };
      
      await WalletManager.updateWallet(updatedWallet);
      
      await AnalyticsService.trackEvent('ai_reward_claimed', {
        userId,
        rewardId: reward.id,
        rewardType: reward.type,
        tokensAwarded: reward.reward.tokens,
        ticketsAwarded: reward.reward.freeTickets,
        multiplier: reward.reward.multiplier
      });

      onClaim(reward);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error claiming smart reward:', error);
      setClaimed(false);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'comeback_bonus': return '🎁';
      case 'lucky_hour': return '🍀';
      case 'loyalty_reward': return '👑';
      case 'streak_bonus': return '🔥';
      default: return '⭐';
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'comeback_bonus': return COLORS.accent;
      case 'lucky_hour': return COLORS.success;
      case 'loyalty_reward': return COLORS.primary;
      case 'streak_bonus': return '#FF6B35';
      default: return COLORS.secondary;
    }
  };

  if (!reward) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={[COLORS.surface, COLORS.background]}
            style={styles.modalContent}
          >
            <View style={styles.header}>
              <Text style={styles.rewardIcon}>
                {getRewardIcon(reward.type)}
              </Text>
              <Text style={styles.title}>{reward.title}</Text>
            </View>

            <Text style={styles.description}>{reward.description}</Text>
            
            <Text style={styles.personalizedMessage}>
              {reward.personalizedMessage}
            </Text>

            <View style={styles.rewardDetails}>
              {reward.reward.tokens > 0 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>+{reward.reward.tokens}</Text>
                  <Text style={styles.rewardLabel}>Tokens</Text>
                </View>
              )}
              
              {reward.reward.freeTickets > 0 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>+{reward.reward.freeTickets}</Text>
                  <Text style={styles.rewardLabel}>Free Tickets</Text>
                </View>
              )}
              
              {reward.reward.multiplier > 1 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>{reward.reward.multiplier}x</Text>
                  <Text style={styles.rewardLabel}>Win Multiplier</Text>
                </View>
              )}
            </View>

            <View style={styles.expiryInfo}>
              <Text style={styles.expiryText}>
                Expires: {reward.expiresAt.toLocaleDateString()} at {reward.expiresAt.toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              {!claimed ? (
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: getRewardColor(reward.type) }]}
                  onPress={handleClaim}
                >
                  <Text style={styles.claimButtonText}>Claim Reward</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.claimedButton, { backgroundColor: COLORS.success }]}>
                  <Text style={styles.claimedButtonText}>✓ Claimed!</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  personalizedMessage: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  rewardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  rewardItem: {
    alignItems: 'center',
    flex: 1,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  rewardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  expiryInfo: {
    marginBottom: 25,
  },
  expiryText: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  claimButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  claimButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  claimedButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  claimedButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
