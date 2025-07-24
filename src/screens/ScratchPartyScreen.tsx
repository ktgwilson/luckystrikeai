import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialService } from '../services/SocialService';
import { AnalyticsService } from '../services/AnalyticsService';
import { ScratchParty } from '../types';
import { COLORS, SCRATCH_THEMES } from '../constants';

interface ScratchPartyScreenProps {
  onBackPress: () => void;
  userId: string;
  username: string;
}

export const ScratchPartyScreen: React.FC<ScratchPartyScreenProps> = ({ 
  onBackPress, 
  userId, 
  username 
}) => {
  const [parties, setParties] = useState<ScratchParty[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('aurora_fortune');
  const [entryFee, setEntryFee] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadParties();
    const interval = setInterval(loadParties, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadParties = async () => {
    try {
      const mockParties: ScratchParty[] = [
        {
          id: 'party_1',
          name: 'Aurora Legends Party',
          hostId: 'host_1',
          participants: [
            {
              userId: 'host_1',
              username: 'PartyHost',
              joinedAt: new Date(),
              score: 0,
              wins: 0,
              isReady: true
            }
          ],
          maxParticipants: 10,
          startTime: new Date(Date.now() + 2 * 60 * 1000),
          endTime: new Date(Date.now() + 32 * 60 * 1000),
          prizePool: 100,
          status: 'waiting',
          theme: 'aurora_fortune',
          entryFee: 10
        }
      ];
      setParties(mockParties);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      Alert.alert('Error', 'Please enter a party name');
      return;
    }

    setLoading(true);
    try {
      const party = await SocialService.createScratchParty(
        userId,
        partyName.trim(),
        selectedTheme,
        parseInt(entryFee) || 0
      );

      await AnalyticsService.trackEvent('party_created_ui', {
        partyId: party.id,
        theme: selectedTheme,
        entryFee: parseInt(entryFee) || 0
      });

      setPartyName('');
      setEntryFee('0');
      setShowCreateForm(false);
      loadParties();
      
      Alert.alert('Success', 'Party created successfully!');
    } catch (error) {
      console.error('Error creating party:', error);
      Alert.alert('Error', 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async (partyId: string) => {
    setLoading(true);
    try {
      const success = await SocialService.joinScratchParty(partyId, userId, username);
      
      if (success) {
        await AnalyticsService.trackEvent('party_joined_ui', {
          partyId,
          userId
        });
        
        loadParties();
        Alert.alert('Success', 'Joined party successfully!');
      } else {
        Alert.alert('Error', 'Unable to join party. It may be full or already started.');
      }
    } catch (error) {
      console.error('Error joining party:', error);
      Alert.alert('Error', 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleStartParty = async (partyId: string) => {
    setLoading(true);
    try {
      const success = await SocialService.startScratchParty(partyId);
      
      if (success) {
        await AnalyticsService.trackEvent('party_started_ui', {
          partyId
        });
        
        loadParties();
        Alert.alert('Success', 'Party started! Let the scratching begin!');
      } else {
        Alert.alert('Error', 'Unable to start party. Need at least 2 participants.');
      }
    } catch (error) {
      console.error('Error starting party:', error);
      Alert.alert('Error', 'Failed to start party');
    } finally {
      setLoading(false);
    }
  };

  const renderParty = ({ item }: { item: ScratchParty }) => {
    const isHost = item.hostId === userId;
    const isParticipant = item.participants.some(p => p.userId === userId);
    const canJoin = !isParticipant && item.status === 'waiting' && item.participants.length < item.maxParticipants;
    const canStart = isHost && item.status === 'waiting' && item.participants.length >= 2;

    return (
      <View style={styles.partyCard}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.background]}
          style={styles.partyGradient}
        >
          <View style={styles.partyHeader}>
            <Text style={styles.partyName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.partyInfo}>
            <Text style={styles.infoText}>Theme: {SCRATCH_THEMES[item.theme as keyof typeof SCRATCH_THEMES]?.name || item.theme}</Text>
            <Text style={styles.infoText}>Participants: {item.participants.length}/{item.maxParticipants}</Text>
            <Text style={styles.infoText}>Prize Pool: {item.prizePool} tokens</Text>
            {item.entryFee > 0 && (
              <Text style={styles.infoText}>Entry Fee: {item.entryFee} tokens</Text>
            )}
          </View>

          <View style={styles.participantsList}>
            {item.participants.slice(0, 3).map((participant) => (
              <View key={participant.userId} style={styles.participantChip}>
                <Text style={styles.participantName}>{participant.username}</Text>
              </View>
            ))}
            {item.participants.length > 3 && (
              <Text style={styles.moreParticipants}>+{item.participants.length - 3} more</Text>
            )}
          </View>

          <View style={styles.partyActions}>
            {canJoin && (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton]}
                onPress={() => handleJoinParty(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Join Party</Text>
              </TouchableOpacity>
            )}
            
            {canStart && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => handleStartParty(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Start Party</Text>
              </TouchableOpacity>
            )}

            {isParticipant && item.status === 'active' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.playButton]}
                onPress={() => {
                  Alert.alert('Party Play', 'Party scratch mode would start here!');
                }}
              >
                <Text style={styles.actionButtonText}>Play Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return COLORS.warning;
      case 'active': return COLORS.success;
      case 'completed': return COLORS.textSecondary;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Scratch Parties</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {showCreateForm && (
        <View style={styles.createForm}>
          <Text style={styles.formTitle}>Create New Party</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Party Name"
            placeholderTextColor={COLORS.textSecondary}
            value={partyName}
            onChangeText={setPartyName}
          />

          <View style={styles.themeSelector}>
            <Text style={styles.label}>Theme:</Text>
            <FlatList
              horizontal
              data={Object.entries(SCRATCH_THEMES)}
              keyExtractor={([key]) => key}
              renderItem={({ item: [key, theme] }) => (
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    selectedTheme === key && styles.selectedTheme
                  ]}
                  onPress={() => setSelectedTheme(key)}
                >
                  <Text style={[
                    styles.themeText,
                    selectedTheme === key && styles.selectedThemeText
                  ]}>
                    {theme.name}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Entry Fee (tokens)"
            placeholderTextColor={COLORS.textSecondary}
            value={entryFee}
            onChangeText={setEntryFee}
            keyboardType="numeric"
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => setShowCreateForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton]}
              onPress={handleCreateParty}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>Create Party</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={parties}
        keyExtractor={(item) => item.id}
        renderItem={renderParty}
        contentContainerStyle={styles.partiesList}
        refreshing={loading}
        onRefresh={loadParties}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active parties</Text>
            <Text style={styles.emptySubtext}>Create one to get started!</Text>
          </View>
        }
      />
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
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  createForm: {
    backgroundColor: COLORS.surface,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: COLORS.text,
    fontSize: 16,
  },
  label: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  themeSelector: {
    marginBottom: 15,
  },
  themeOption: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  selectedTheme: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  themeText: {
    color: COLORS.text,
    fontSize: 14,
  },
  selectedThemeText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  formButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  cancelButtonText: {
    color: COLORS.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    color: COLORS.background,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partiesList: {
    padding: 20,
  },
  partyCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  partyGradient: {
    padding: 20,
  },
  partyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  partyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  partyInfo: {
    marginBottom: 15,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  participantChip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
  },
  participantName: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreParticipants: {
    color: COLORS.textSecondary,
    fontSize: 12,
    alignSelf: 'center',
  },
  partyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  joinButton: {
    backgroundColor: COLORS.success,
  },
  startButton: {
    backgroundColor: COLORS.warning,
  },
  playButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.background,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
