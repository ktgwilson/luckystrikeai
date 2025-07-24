import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '../types';
import { COLORS, COMPLIANCE } from '../constants';
import { AnalyticsService } from '../services/AnalyticsService';

interface ComplianceScreenProps {
  user: User;
  onTermsAccepted: (user: User) => void;
}

export const ComplianceScreen: React.FC<ComplianceScreenProps> = ({ user, onTermsAccepted }) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptTerms = async () => {
    if (!hasReadTerms || !hasReadPrivacy) {
      Alert.alert(
        'Please Review All Documents',
        'You must read both the Terms of Service and Privacy Policy before continuing.',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const updatedUser: User = {
        ...user,
        hasAcceptedTerms: true,
        lastActiveAt: new Date(),
      };

      AnalyticsService.trackTermsAccepted(COMPLIANCE.TERMS_VERSION);
      onTermsAccepted(updatedUser);
      
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to accept terms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Legal Agreement</Text>
        <Text style={styles.subtitle}>Please review and accept our terms</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.documentContainer}>
          <Text style={styles.documentTitle}>Terms of Service</Text>
          <ScrollView style={styles.documentScroll} nestedScrollEnabled={true}>
            <Text style={styles.documentText}>
              {`Welcome to LuckyStrike AI-Driven Scratch-Off Platform!

By using this application, you agree to the following terms:

1. ELIGIBILITY
You must be at least ${COMPLIANCE.MIN_AGE} years old to use this service. By using this app, you represent that you meet this age requirement.

2. GAME MECHANICS
- This is a digital scratch-off game platform
- Prizes are awarded based on random number generation
- All game outcomes are final
- We reserve the right to modify prize structures

3. VIRTUAL CURRENCY
- Tokens and coins are virtual currencies with no real-world value
- Virtual currency cannot be exchanged for real money
- We may adjust virtual currency balances for technical reasons

4. FAIR PLAY
- Use of bots, automation, or cheating is prohibited
- We employ AI systems to detect fraudulent activity
- Violations may result in account suspension

5. DATA COLLECTION
- We collect gameplay data to improve user experience
- AI systems analyze your behavior for personalization
- You may opt-out of AI personalization in settings

6. MODIFICATIONS
We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.

Version: ${COMPLIANCE.TERMS_VERSION}
Last Updated: January 2025`}
            </Text>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.checkboxContainer, hasReadTerms && styles.checkedContainer]}
            onPress={() => setHasReadTerms(!hasReadTerms)}
          >
            <Text style={styles.checkboxText}>
              {hasReadTerms ? '✓' : '○'} I have read and agree to the Terms of Service
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.documentContainer}>
          <Text style={styles.documentTitle}>Privacy Policy</Text>
          <ScrollView style={styles.documentScroll} nestedScrollEnabled={true}>
            <Text style={styles.documentText}>
              {`LuckyStrike Privacy Policy

We respect your privacy and are committed to protecting your personal data.

INFORMATION WE COLLECT:
- Age verification data (date of birth)
- Gameplay statistics and preferences
- Device information and usage patterns
- Location data for compliance purposes

HOW WE USE YOUR DATA:
- To provide and improve our services
- For age verification and legal compliance
- To personalize your gaming experience using AI
- To detect fraud and ensure fair play
- To send notifications about free tickets and updates

AI AND PERSONALIZATION:
- We use machine learning to analyze your gameplay
- AI systems predict when you might stop playing
- Personalized offers and notifications are generated
- You can opt-out of AI personalization at any time

DATA SHARING:
- We do not sell your personal data to third parties
- Anonymous analytics may be shared with partners
- Legal compliance may require data disclosure

YOUR RIGHTS:
- Access your personal data
- Request data deletion
- Opt-out of AI personalization
- Control notification preferences

SECURITY:
We implement industry-standard security measures to protect your data.

CONTACT:
For privacy questions, contact us at privacy@luckystrike.ai

Version: ${COMPLIANCE.PRIVACY_VERSION}
Last Updated: January 2025`}
            </Text>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.checkboxContainer, hasReadPrivacy && styles.checkedContainer]}
            onPress={() => setHasReadPrivacy(!hasReadPrivacy)}
          >
            <Text style={styles.checkboxText}>
              {hasReadPrivacy ? '✓' : '○'} I have read and agree to the Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!hasReadTerms || !hasReadPrivacy || isLoading) && styles.disabledButton
          ]}
          onPress={handleAcceptTerms}
          disabled={!hasReadTerms || !hasReadPrivacy || isLoading}
        >
          <Text style={styles.acceptButtonText}>
            {isLoading ? 'Processing...' : 'Accept and Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  documentContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  documentScroll: {
    maxHeight: 200,
    marginBottom: 15,
  },
  documentText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  checkedContainer: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  footer: {
    padding: 20,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
