import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Alert, Platform } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { RNGService } from '../services/RNGService';
import { WalletManager } from '../utils/WalletManager';
import { AnalyticsService } from '../services/AnalyticsService';
import { Prize, ScratchResult, TicketType } from '../types';
import { COLORS } from '../constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isPhone = screenWidth < 768;
const CARD_WIDTH = isTablet ? Math.min(screenWidth * 0.5, 350) : Math.min(screenWidth * 0.85, 280);
const CARD_HEIGHT = CARD_WIDTH * 0.65;

interface ScratchCardProps {
  onScratchComplete: (result: ScratchResult) => void;
  ticketType: TicketType;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ onScratchComplete, ticketType }) => {
  const [scratchedAreas, setScratchedAreas] = useState<{ x: number; y: number }[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [isScratching, setIsScratching] = useState(false);

  const initializeCard = async () => {
    const generatedSymbols = await RNGService.generateScratchSymbols();
    setSymbols(generatedSymbols);
    
    const shouldWin = await RNGService.shouldWin();
    if (shouldWin) {
      const generatedPrize = await RNGService.generatePrize();
      setPrize(generatedPrize);
    }
  };

  React.useEffect(() => {
    initializeCard();
  }, []);

  const handleGestureEvent = (event: any) => {
    if (!isScratching) {
      setIsScratching(true);
      AnalyticsService.trackScratchStarted(ticketType);
    }

    const { x, y } = event.nativeEvent;
    setScratchedAreas(prev => [...prev, { x: x - 50, y: y - 100 }]);

    if (scratchedAreas.length > 20 && !isRevealed) {
      revealCard();
    }
  };


  const revealCard = async () => {
    setIsRevealed(true);
    
    try {
      await WalletManager.burnTicket();
      
      const isWin = prize !== null && RNGService.checkWinCondition(symbols);
      
      if (isWin && prize) {
        await WalletManager.addPrize(prize);
      }

      const result: ScratchResult = {
        prize,
        isWin,
        revealedSymbols: symbols,
        timestamp: new Date()
      };

      AnalyticsService.trackScratchCompleted(isWin, prize?.value || 0, symbols);
      onScratchComplete(result);
      
    } catch (error) {
      console.error('Error completing scratch:', error);
      Alert.alert('Error', 'Failed to complete scratch. Please try again.');
    }
  };

  const renderSymbolGrid = () => {
    const symbolSize = isTablet ? 24 : 18;
    const gridSpacing = isTablet ? 70 : 55;
    const startX = isTablet ? 50 : 35;
    const startY = isTablet ? 60 : 45;

    return symbols.map((symbol, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = startX + col * gridSpacing;
      const y = startY + row * (gridSpacing * 0.7);

      return (
        <SvgText
          key={index}
          x={x}
          y={y}
          fontSize={symbolSize}
          fill={COLORS.primary}
          textAnchor="middle"
          opacity={isRevealed ? 1 : 0}
          fontWeight="bold"
        >
          {symbol}
        </SvgText>
      );
    });
  };

  const renderScratchSurface = () => {
    if (isRevealed) return null;

    const scratchProgress = Math.min(scratchedAreas.length / 10, 1);
    const shouldAutoReveal = scratchProgress >= 1;

    if (shouldAutoReveal && !isRevealed) {
      setTimeout(() => revealCard(), 100);
      return null;
    }

    return (
      <View style={styles.scratchSurface}>
        <View style={[
          styles.scratchOverlay,
          { 
            opacity: Math.max(0.1, 1 - scratchProgress),
            backgroundColor: scratchProgress > 0.3 ? 'rgba(138, 43, 226, 0.7)' : 'transparent'
          }
        ]}>
          <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
            <Defs>
              <LinearGradient id="metallic" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="1" />
                <Stop offset="50%" stopColor={COLORS.secondary} stopOpacity="1" />
                <Stop offset="100%" stopColor={COLORS.accent} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            
            <Rect
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              fill="url(#metallic)"
              rx="15"
            />
            
            <SvgText
              x={CARD_WIDTH / 2}
              y={CARD_HEIGHT / 2 - (isTablet ? 12 : 8)}
              fontSize={isTablet ? 16 : 12}
              fill={COLORS.background}
              textAnchor="middle"
              fontWeight="bold"
            >
              🎰 SCRATCH 🎰
            </SvgText>
            <SvgText
              x={CARD_WIDTH / 2}
              y={CARD_HEIGHT / 2 + (isTablet ? 12 : 8)}
              fontSize={isTablet ? 14 : 10}
              fill={COLORS.background}
              textAnchor="middle"
            >
              Match 3 to Win!
            </SvgText>
          </Svg>
        </View>
        
        {/* Visual scratch indicators */}
        {scratchedAreas.map((area, index) => (
          <View
            key={index}
            style={[
              styles.scratchHole,
              {
                left: Math.max(10, Math.min(CARD_WIDTH - 30, area.x - 15)),
                top: Math.max(10, Math.min(CARD_HEIGHT - 30, area.y - 15)),
              }
            ]}
          />
        ))}
        
        {scratchProgress > 0 && (
          <View style={styles.scratchProgress}>
            <Text style={styles.scratchProgressText}>
              {Math.round(scratchProgress * 100)}% Scratched
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCard = () => (
    <View style={styles.container}>
      <View style={styles.card}>
        <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
          <Defs>
            <LinearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.surface} stopOpacity="1" />
              <Stop offset="100%" stopColor={COLORS.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          <Rect
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            fill="url(#cardBg)"
            rx="15"
            stroke={COLORS.primary}
            strokeWidth="2"
          />
          
          {renderSymbolGrid()}
        </Svg>
        
        {renderScratchSurface()}
      </View>
      
      {isRevealed && prize && (
        <View style={styles.prizeDisplay}>
          <Text style={styles.prizeText}>🎉 {prize.name} 🎉</Text>
          <Text style={styles.prizeDescription}>{prize.description}</Text>
        </View>
      )}
      
      {isRevealed && !prize && (
        <View style={styles.prizeDisplay}>
          <Text style={styles.noWinText}>Better luck next time!</Text>
        </View>
      )}
    </View>
  );

  const handleScratch = (x: number, y: number) => {
    console.log('Scratch at:', x, y, 'Current areas:', scratchedAreas.length);
    setScratchedAreas(prev => {
      const newAreas = [...prev, { x, y }];
      console.log('New scratch areas count:', newAreas.length);
      
      if (newAreas.length > 12 && !isRevealed) {
        console.log('Revealing card due to sufficient scratching');
        setTimeout(() => revealCard(), 200);
      }
      
      return newAreas;
    });
  };

  const webEventHandlers = Platform.OS === 'web' ? {
    onMouseDown: (event: any) => {
      console.log('Mouse down detected');
      if (!isScratching) {
        setIsScratching(true);
        AnalyticsService.trackScratchStarted(ticketType);
      }
      const nativeEvent = event.nativeEvent;
      const rect = nativeEvent.target.getBoundingClientRect();
      const x = nativeEvent.clientX - rect.left;
      const y = nativeEvent.clientY - rect.top;
      handleScratch(x, y);
    },
    onMouseMove: (event: any) => {
      if (isScratching) {
        console.log('Mouse move detected');
        const nativeEvent = event.nativeEvent;
        if (nativeEvent.buttons === 1) {
          const rect = nativeEvent.target.getBoundingClientRect();
          const x = nativeEvent.clientX - rect.left;
          const y = nativeEvent.clientY - rect.top;
          handleScratch(x, y);
        }
      }
    },
    onMouseUp: () => {
      console.log('Mouse up detected');
      setIsScratching(false);
    }
  } : {};

  const cardComponent = (
    <View style={styles.container}>
      <View 
        style={[
          styles.card, 
          Platform.OS === 'web' && { cursor: 'pointer' }
        ]}
        {...webEventHandlers}
      >
        <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
          <Defs>
            <LinearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.surface} stopOpacity="1" />
              <Stop offset="100%" stopColor={COLORS.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          <Rect
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            fill="url(#cardBg)"
            rx="15"
            stroke={COLORS.primary}
            strokeWidth="2"
          />
          
          {renderSymbolGrid()}
        </Svg>
        
        {renderScratchSurface()}
      </View>
      
      {isRevealed && prize && (
        <View style={styles.prizeDisplay}>
          <Text style={styles.prizeText}>🎉 {prize.name} 🎉</Text>
          <Text style={styles.prizeDescription}>{prize.description}</Text>
        </View>
      )}
      
      {isRevealed && !prize && (
        <View style={styles.prizeDisplay}>
          <Text style={styles.noWinText}>Better luck next time!</Text>
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return cardComponent;
  }

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={(event) => {
        if (event.nativeEvent.state === State.END) {
          setIsScratching(false);
        }
      }}
    >
      {renderCard()}
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  webContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  webInteractionLayer: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  scratchSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  scratchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 15,
  },
  scratchHole: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  scratchProgress: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scratchProgressText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  prizeDisplay: {
    marginTop: 15,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  prizeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  prizeDescription: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 3,
  },
  noWinText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
