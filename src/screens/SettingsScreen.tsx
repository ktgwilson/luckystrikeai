import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';
import { NotificationService } from '../services/NotificationService';
import { UserSettings } from '../types';

interface SettingsScreenProps {
  onBackPress: () => void;
  userId: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBackPress, userId }) => {
  const [settings, setSettings] = useState<UserSettings>({
    aiPersonalizationEnabled: true,
    notificationsEnabled: true,
    dataCollectionOptOut: false,
    analyticsOptOut: false,
    marketingOptOut: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await StorageService.getUserSettings(userId);
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await StorageService.saveUserSettings(userId, newSettings);

      await AnalyticsService.trackEvent('user_setting_changed', {
        userId,
        setting: key,
        value,
        timestamp: Date.now()
      });

      if (key === 'notificationsEnabled' && value) {
        await NotificationService.requestPermissions();
      }

      if (key === 'aiPersonalizationEnabled' && !value) {
        Alert.alert(
          'AI Personalization Disabled',
          'You will no longer receive personalized offers and recommendations. You can re-enable this at any time.',
          [{ text: 'OK' }]
        );
      }

      if (key === 'dataCollectionOptOut' && value) {
        Alert.alert(
          'Data Collection Opt-Out',
          'We will stop collecting behavioral data for AI personalization. This may reduce the quality of your experience.',
          [{ text: 'Understood' }]
        );
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      setSettings(settings);
    }
  };

  const showAITransparencyInfo = () => {
    Alert.alert(
      'AI Transparency',
      'LuckyStrike uses AI to:\n\n• Predict when you might stop playing and offer comeback bonuses\n• Analyze your play patterns to suggest optimal play times\n• Personalize rewards based on your preferences\n• Optimize game difficulty and prize distribution\n\nYour data is processed securely and never shared with third parties. You can opt out of AI features at any time.',
      [{ text: 'Got it' }]
    );
  };

  const showDataUsageInfo = () => {
    Alert.alert(
      'Data Usage',
      'We collect:\n\n• Game session data (wins, losses, time played)\n• Device information (screen size, OS version)\n• Interaction patterns (taps, swipes, navigation)\n• Spending patterns (tokens purchased, rewards claimed)\n\nThis data helps us improve your gaming experience and is never sold to third parties.',
      [{ text: 'Understood' }]
    );
  };

  const exportUserData = async () => {
    try {
      Alert.alert(
        'Export Data',
        'Your data export will be prepared and made available for download. This may take a few minutes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Export', 
            onPress: async () => {
              await AnalyticsService.trackEvent('user_data_export_requested', {
                userId,
                timestamp: Date.now()
              });
              
              Alert.alert(
                'Export Requested',
                'Your data export has been requested. You will receive a notification when it\'s ready for download.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error requesting data export:', error);
    }
  };

  const deleteUserData = async () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your game data, progress, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteAllUserData(userId);
              await AnalyticsService.trackEvent('user_data_deleted', {
                userId,
                timestamp: Date.now()
              });
              
              Alert.alert(
                'Data Deleted',
                'All your data has been permanently deleted.',
                [{ text: 'OK', onPress: onBackPress }]
              );
            } catch (error) {
              console.error('Error deleting user data:', error);
              Alert.alert('Error', 'Failed to delete user data. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI & Personalization</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI Personalization</Text>
              <Text style={styles.settingDescription}>
                Get personalized offers and recommendations
              </Text>
            </View>
            <Switch
              value={settings.aiPersonalizationEnabled}
              onValueChange={(value) => updateSetting('aiPersonalizationEnabled', value)}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={showAITransparencyInfo}>
            <Text style={styles.infoButtonText}>ℹ️ How AI Works</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive personalized offers and reminders
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSetting('notificationsEnabled', value)}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Privacy & Data</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Opt-out of Data Collection</Text>
              <Text style={styles.settingDescription}>
                Stop collecting behavioral data for AI
              </Text>
            </View>
            <Switch
              value={settings.dataCollectionOptOut}
              onValueChange={(value) => updateSetting('dataCollectionOptOut', value)}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.warning }}
              thumbColor={COLORS.text}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Opt-out of Analytics</Text>
              <Text style={styles.settingDescription}>
                Stop sharing usage analytics
              </Text>
            </View>
            <Switch
              value={settings.analyticsOptOut}
              onValueChange={(value) => updateSetting('analyticsOptOut', value)}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.warning }}
              thumbColor={COLORS.text}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Opt-out of Marketing</Text>
              <Text style={styles.settingDescription}>
                Stop receiving promotional content
              </Text>
            </View>
            <Switch
              value={settings.marketingOptOut}
              onValueChange={(value) => updateSetting('marketingOptOut', value)}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.warning }}
              thumbColor={COLORS.text}
            />
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={showDataUsageInfo}>
            <Text style={styles.infoButtonText}>ℹ️ What Data We Collect</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📁 Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={exportUserData}>
            <Text style={styles.actionButtonText}>📤 Export My Data</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={deleteUserData}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              🗑️ Delete All Data
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Legal</Text>
          <Text style={styles.legalText}>
            By using LuckyStrike, you agree to our Terms of Service and Privacy Policy. 
            Our AI systems are designed to enhance your gaming experience while respecting 
            your privacy and giving you full control over your data.
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  infoButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 10,
  },
  infoButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: COLORS.error,
  },
  dangerButtonText: {
    color: COLORS.text,
  },
  legalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    textAlign: 'justify',
  },
});
