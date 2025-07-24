import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { User } from '../types';
import { COLORS, COMPLIANCE } from '../constants';
import { AnalyticsService } from '../services/AnalyticsService';

interface AgeGateScreenProps {
  onAgeVerified: (user: User) => void;
}

export const AgeGateScreen: React.FC<AgeGateScreenProps> = ({ onAgeVerified }) => {
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleVerifyAge = async () => {
    setIsLoading(true);
    
    try {
      const age = calculateAge(dateOfBirth);
      const isVerified = age >= COMPLIANCE.MIN_AGE;
      
      AnalyticsService.trackAgeVerification(isVerified, age);
      
      if (!isVerified) {
        Alert.alert(
          'Age Verification Failed',
          `You must be at least ${COMPLIANCE.MIN_AGE} years old to use this app.`,
          [{ text: 'OK', onPress: () => {} }]
        );
        setIsLoading(false);
        return;
      }

      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateOfBirth,
        isAgeVerified: true,
        hasAcceptedTerms: false,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      onAgeVerified(user);
      
    } catch (error) {
      console.error('Error verifying age:', error);
      Alert.alert('Error', 'Failed to verify age. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎰 Welcome to LuckyStrike</Text>
          <Text style={styles.subtitle}>Age Verification Required</Text>
        </View>

        <View style={styles.verificationContainer}>
          <Text style={styles.description}>
            To comply with legal requirements, we need to verify that you are at least {COMPLIANCE.MIN_AGE} years old.
          </Text>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Select your date of birth:</Text>
            
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.webDateInput}
                value={dateOfBirth.toISOString().split('T')[0]}
                onChangeText={(text) => {
                  const newDate = new Date(text);
                  if (!isNaN(newDate.getTime())) {
                    setDateOfBirth(newDate);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {dateOfBirth.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.disabledButton]}
            onPress={handleVerifyAge}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify Age'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your privacy is important to us. We only use this information for age verification purposes.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  verificationContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 15,
  },
  dateButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dateButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  webDateInput: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 200,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
