import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScratchScreen } from './src/screens/ScratchScreen';
import { AgeGateScreen } from './src/screens/AgeGateScreen';
import { ComplianceScreen } from './src/screens/ComplianceScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { StorageService } from './src/services/StorageService';
import { AnalyticsService } from './src/services/AnalyticsService';
import { NotificationService } from './src/services/NotificationService';
import { WalletManager } from './src/utils/WalletManager';
import { User, Wallet } from './src/types';
import { COLORS, ANALYTICS_EVENTS } from './src/constants';

type AppScreen = 'loading' | 'ageGate' | 'compliance' | 'home' | 'scratch' | 'account';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet>({
    tokens: 0,
    coins: 0,
    tickets: 1,
    totalWinnings: 0,
    totalSpent: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await NotificationService.initialize();
      
      const isFirstLaunch = await StorageService.isFirstLaunch();
      const existingUser = await StorageService.getUser();
      const currentWallet = await WalletManager.getWallet();
      
      setWallet(currentWallet);

      if (isFirstLaunch || !existingUser) {
        setCurrentScreen('ageGate');
      } else if (!existingUser.hasAcceptedTerms) {
        setUser(existingUser);
        setCurrentScreen('compliance');
      } else {
        setUser(existingUser);
        AnalyticsService.initialize(existingUser);
        AnalyticsService.trackEvent(ANALYTICS_EVENTS.APP_OPENED);
        setCurrentScreen('home');
      }
      
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
    }
  };

  const handleAgeVerified = async (verifiedUser: User) => {
    try {
      await StorageService.saveUser(verifiedUser);
      setUser(verifiedUser);
      setCurrentScreen('compliance');
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user data. Please try again.');
    }
  };

  const handleTermsAccepted = async (updatedUser: User) => {
    try {
      await StorageService.saveUser(updatedUser);
      await StorageService.setFirstLaunchCompleted();
      setUser(updatedUser);
      
      AnalyticsService.initialize(updatedUser);
      AnalyticsService.trackEvent(ANALYTICS_EVENTS.APP_OPENED);
      
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const handleScratchPress = () => {
    if (wallet.tickets <= 0) {
      Alert.alert('No Tickets', 'You need tickets to play. Claim your daily free ticket!');
      return;
    }
    setCurrentScreen('scratch');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleWalletUpdate = async (newWallet: Wallet) => {
    setWallet(newWallet);
  };

  const handleAccountPress = () => {
    setCurrentScreen('account');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'loading':
        return <View style={styles.container} />;
        
      case 'ageGate':
        return <AgeGateScreen onAgeVerified={handleAgeVerified} />;
        
      case 'compliance':
        return user ? (
          <ComplianceScreen user={user} onTermsAccepted={handleTermsAccepted} />
        ) : <View style={styles.container} />;
        
      case 'home':
        return (
          <HomeScreen
            onScratchPress={handleScratchPress}
            onAccountPress={handleAccountPress}
            wallet={wallet}
            onWalletUpdate={handleWalletUpdate}
          />
        );
        
      case 'scratch':
        return (
          <ScratchScreen
            onBackPress={handleBackToHome}
            onWalletUpdate={handleWalletUpdate}
          />
        );
        
      case 'account':
        return (
          <AccountScreen
            userId={user?.id || 'anonymous'}
            onBack={handleBackToHome}
          />
        );
        
      default:
        return <View style={styles.container} />;
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {renderCurrentScreen()}
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
