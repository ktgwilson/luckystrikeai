import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import { ABTestService, ABTest, ABTestVariant } from '../services/ABTestService';
import { StorageService } from '../services/StorageService';
import { AdminProfitData } from '../types';

interface AdminDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'abtests' | 'profits'>('analytics');
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [profitData, setProfitData] = useState<AdminProfitData | null>(null);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');

  useEffect(() => {
    if (visible) {
      loadDashboardData();
    }
  }, [visible, activeTab]);

  const loadDashboardData = async () => {
    try {
      if (activeTab === 'abtests') {
        const tests = await ABTestService.getActiveABTests();
        setAbTests(tests);
      } else if (activeTab === 'profits') {
        const profits = await StorageService.getAdminProfitData();
        setProfitData(profits);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const createSampleABTest = async () => {
    if (!newTestName.trim()) {
      Alert.alert('Error', 'Please enter a test name');
      return;
    }

    try {
      const variants: ABTestVariant[] = [
        {
          id: 'control',
          name: 'Control',
          description: 'Original version',
          config: { buttonColor: COLORS.primary },
          weight: 50,
          isControl: true
        },
        {
          id: 'variant_a',
          name: 'Variant A',
          description: 'New button color',
          config: { buttonColor: COLORS.accent },
          weight: 50,
          isControl: false
        }
      ];

      await ABTestService.createABTest({
        name: newTestName,
        description: newTestDescription || 'A/B test for user engagement',
        variants,
        isActive: true,
        startDate: new Date(),
        targetPercentage: 100
      });

      setNewTestName('');
      setNewTestDescription('');
      loadDashboardData();
      Alert.alert('Success', 'A/B test created successfully');
    } catch (error) {
      console.error('Error creating AB test:', error);
      Alert.alert('Error', 'Failed to create A/B test');
    }
  };

  const endABTest = async (testId: string) => {
    try {
      await ABTestService.endABTest(testId);
      loadDashboardData();
      Alert.alert('Success', 'A/B test ended successfully');
    } catch (error) {
      console.error('Error ending AB test:', error);
      Alert.alert('Error', 'Failed to end A/B test');
    }
  };

  const renderAnalyticsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>📊 Analytics Overview</Text>
      
      <View style={styles.analyticsGrid}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsValue}>1,247</Text>
          <Text style={styles.analyticsLabel}>Total Users</Text>
        </View>
        
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsValue}>3,891</Text>
          <Text style={styles.analyticsLabel}>Scratches Today</Text>
        </View>
        
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsValue}>$2,456</Text>
          <Text style={styles.analyticsLabel}>Revenue Today</Text>
        </View>
        
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsValue}>73%</Text>
          <Text style={styles.analyticsLabel}>Win Rate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 User Engagement</Text>
        <View style={styles.engagementMetrics}>
          <Text style={styles.metricText}>• Average Session: 8.5 minutes</Text>
          <Text style={styles.metricText}>• Daily Active Users: 892</Text>
          <Text style={styles.metricText}>• Retention Rate (7-day): 45%</Text>
          <Text style={styles.metricText}>• Churn Risk Users: 23</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Insights</Text>
        <View style={styles.aiInsights}>
          <Text style={styles.insightText}>• 15 users received comeback bonuses today</Text>
          <Text style={styles.insightText}>• Lucky hour events increased engagement by 34%</Text>
          <Text style={styles.insightText}>• Aurora Fortune theme has highest conversion</Text>
          <Text style={styles.insightText}>• Predicted churn prevention: 8 users retained</Text>
        </View>
      </View>
    </View>
  );

  const renderABTestsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🧪 A/B Tests</Text>
      
      <View style={styles.createTestSection}>
        <Text style={styles.subsectionTitle}>Create New Test</Text>
        <TextInput
          style={styles.input}
          placeholder="Test Name"
          placeholderTextColor={COLORS.textSecondary}
          value={newTestName}
          onChangeText={setNewTestName}
        />
        <TextInput
          style={styles.input}
          placeholder="Test Description (optional)"
          placeholderTextColor={COLORS.textSecondary}
          value={newTestDescription}
          onChangeText={setNewTestDescription}
          multiline
        />
        <TouchableOpacity style={styles.createButton} onPress={createSampleABTest}>
          <Text style={styles.createButtonText}>Create A/B Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testsContainer}>
        {abTests.length === 0 ? (
          <Text style={styles.emptyText}>No active A/B tests</Text>
        ) : (
          abTests.map(test => (
            <View key={test.id} style={styles.testCard}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{test.name}</Text>
                <TouchableOpacity 
                  style={styles.endTestButton}
                  onPress={() => endABTest(test.id)}
                >
                  <Text style={styles.endTestButtonText}>End Test</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.testDescription}>{test.description}</Text>
              
              <View style={styles.testMetrics}>
                <Text style={styles.metricText}>
                  Started: {test.startDate.toLocaleDateString()}
                </Text>
                <Text style={styles.metricText}>
                  Target: {test.targetPercentage}% of users
                </Text>
                <Text style={styles.metricText}>
                  Variants: {test.variants.length}
                </Text>
              </View>

              <View style={styles.variantsContainer}>
                {test.variants.map(variant => (
                  <View key={variant.id} style={styles.variantChip}>
                    <Text style={styles.variantText}>
                      {variant.name} ({variant.weight}%)
                      {variant.isControl && ' 🎯'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderProfitsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>💰 Revenue & Profits</Text>
      
      {profitData ? (
        <>
          <View style={styles.profitGrid}>
            <View style={styles.profitCard}>
              <Text style={styles.profitValue}>${profitData.totalRevenue.toFixed(2)}</Text>
              <Text style={styles.profitLabel}>Total Revenue</Text>
            </View>
            
            <View style={styles.profitCard}>
              <Text style={styles.profitValue}>${profitData.totalPayouts.toFixed(2)}</Text>
              <Text style={styles.profitLabel}>Total Payouts</Text>
            </View>
            
            <View style={styles.profitCard}>
              <Text style={styles.profitValue}>${profitData.netProfit.toFixed(2)}</Text>
              <Text style={styles.profitLabel}>Net Profit</Text>
            </View>
            
            <View style={styles.profitCard}>
              <Text style={styles.profitValue}>{profitData.transactionCount}</Text>
              <Text style={styles.profitLabel}>Transactions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Revenue by Payment Method</Text>
            {Object.entries(profitData.revenueByMethod).map(([method, revenue]) => (
              <View key={method} style={styles.revenueMethodRow}>
                <Text style={styles.methodName}>{method}</Text>
                <Text style={styles.methodRevenue}>${revenue.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>No profit data available</Text>
      )}
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.dashboardContainer}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.background]}
          style={styles.dashboardContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>🛠️ Admin Dashboard</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
              onPress={() => setActiveTab('analytics')}
            >
              <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
                Analytics
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'abtests' && styles.activeTab]}
              onPress={() => setActiveTab('abtests')}
            >
              <Text style={[styles.tabText, activeTab === 'abtests' && styles.activeTabText]}>
                A/B Tests
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profits' && styles.activeTab]}
              onPress={() => setActiveTab('profits')}
            >
              <Text style={[styles.tabText, activeTab === 'profits' && styles.activeTabText]}>
                Profits
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'abtests' && renderABTestsTab()}
            {activeTab === 'profits' && renderProfitsTab()}
          </ScrollView>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dashboardContainer: {
    width: '95%',
    height: '90%',
    maxWidth: 800,
  },
  dashboardContent: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyticsCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  analyticsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  engagementMetrics: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  metricText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 5,
  },
  aiInsights: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  insightText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 5,
  },
  createTestSection: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  testsContainer: {
    flex: 1,
  },
  testCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  endTestButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  endTestButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  testDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  testMetrics: {
    marginBottom: 10,
  },
  variantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    backgroundColor: COLORS.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  variantText: {
    color: COLORS.text,
    fontSize: 12,
  },
  profitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profitCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  profitValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  profitLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  revenueMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: COLORS.surface,
    marginBottom: 5,
    borderRadius: 8,
  },
  methodName: {
    color: COLORS.text,
    fontSize: 14,
  },
  methodRevenue: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
