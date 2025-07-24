import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScratchCard } from '../components/ScratchCard';
import { ScratchResult, TicketType, Wallet } from '../types';
import { COLORS } from '../constants';

interface ScratchScreenProps {
  onBackPress: () => void;
  onWalletUpdate: (wallet: Wallet) => void;
}

export const ScratchScreen: React.FC<ScratchScreenProps> = ({ onBackPress }) => {
  const [, setScratchResult] = useState<ScratchResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleScratchComplete = (result: ScratchResult) => {
    setScratchResult(result);
    setIsComplete(true);
    
    if (result.isWin && result.prize) {
      Alert.alert(
        '🎉 Congratulations!',
        `You won ${result.prize.name}!`,
        [{ text: 'Awesome!', onPress: () => {} }]
      );
    } else {
      Alert.alert(
        'Better luck next time!',
        'Keep playing for more chances to win!',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  const handlePlayAgain = () => {
    setScratchResult(null);
    setIsComplete(false);
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scratch Card</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cardContainer}>
        <ScratchCard
          onScratchComplete={handleScratchComplete}
          ticketType={TicketType.FREE_DAILY}
        />
      </View>

      {isComplete && (
        <View style={styles.resultContainer}>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.homeButton} onPress={onBackPress}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 60,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    padding: 20,
    alignItems: 'center',
  },
  playAgainButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  playAgainText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  homeButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
