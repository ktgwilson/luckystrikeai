import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AIPersonalizationData } from '../types';
import { COLORS } from '../constants';
import { AIEngagementService } from '../services/AIEngagementService';

interface AIInsightsPanelProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  userId,
  visible,
  onClose
}) => {
  const [aiData, setAiData] = useState<AIPersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadAIInsights();
    }
  }, [visible, userId]);

  const loadAIInsights = async () => {
    try {
      setLoading(true);
      const behaviorData = await AIEngagementService.analyzeUserBehavior(userId);
      setAiData(behaviorData);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChurnRiskColor = (riskScore: number) => {
    if (riskScore < 0.3) return COLORS.success;
    if (riskScore < 0.7) return COLORS.warning;
    return COLORS.error;
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 0.8) return COLORS.success;
    if (score >= 0.5) return COLORS.warning;
    return COLORS.error;
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.background]}
        style={styles.panel}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🤖 AI Insights</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Analyzing your behavior...</Text>
            </View>
          ) : aiData ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Engagement Score</Text>
                <View style={styles.scoreContainer}>
                  <Text style={[styles.scoreValue, { color: getEngagementColor(aiData.engagementScore) }]}>
                    {Math.round(aiData.engagementScore * 100)}%
                  </Text>
                  <Text style={styles.scoreLabel}>
                    {getEngagementLevel(aiData.engagementScore)} Engagement
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ Churn Risk Analysis</Text>
                <View style={styles.churnContainer}>
                  <View style={styles.riskMeter}>
                    <View 
                      style={[
                        styles.riskFill, 
                        { 
                          width: `${aiData.churnRisk.riskScore * 100}%`,
                          backgroundColor: getChurnRiskColor(aiData.churnRisk.riskScore)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.riskScore}>
                    Risk: {Math.round(aiData.churnRisk.riskScore * 100)}%
                  </Text>
                  <Text style={styles.confidence}>
                    Confidence: {Math.round(aiData.churnRisk.confidence * 100)}%
                  </Text>
                </View>
                
                <Text style={styles.recommendation}>
                  💡 {aiData.churnRisk.recommendation}
                </Text>
                
                {aiData.churnRisk.factors.length > 0 && (
                  <View style={styles.factorsContainer}>
                    <Text style={styles.factorsTitle}>Risk Factors:</Text>
                    {aiData.churnRisk.factors.map((factor, index) => (
                      <Text key={index} style={styles.factor}>• {factor}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎮 Play Patterns</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{aiData.sessionCount}</Text>
                    <Text style={styles.statLabel}>Sessions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.round(aiData.avgSessionDuration / 60)}m
                    </Text>
                    <Text style={styles.statLabel}>Avg Duration</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.round(aiData.winRate * 100)}%
                    </Text>
                    <Text style={styles.statLabel}>Win Rate</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      ${aiData.spendingPattern.avgSpend.toFixed(2)}
                    </Text>
                    <Text style={styles.statLabel}>Avg Spend</Text>
                  </View>
                </View>
              </View>

              {aiData.preferredThemes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🎨 Favorite Themes</Text>
                  <View style={styles.themesContainer}>
                    {aiData.preferredThemes.map((theme, index) => (
                      <View key={index} style={styles.themeChip}>
                        <Text style={styles.themeText}>{theme}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Activity Pattern</Text>
                <Text style={styles.activityText}>
                  Most active hours: {getMostActiveHours(aiData.preferredPlayTimes)}
                </Text>
                <Text style={styles.lastActivityText}>
                  Last activity: {aiData.lastActivity.toLocaleDateString()}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load AI insights</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );

  function getMostActiveHours(hourCounts: number[]): string {
    const topHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .filter(item => item.count > 0)
      .map(item => `${item.hour}:00`);
    
    return topHours.length > 0 ? topHours.join(', ') : 'Not enough data';
  }
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
  },
  panel: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
  section: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  churnContainer: {
    alignItems: 'center',
  },
  riskMeter: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginBottom: 10,
  },
  riskFill: {
    height: '100%',
    borderRadius: 4,
  },
  riskScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  confidence: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recommendation: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  factorsContainer: {
    marginTop: 12,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  factor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  themeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  lastActivityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
