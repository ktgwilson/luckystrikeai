import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialService } from '../services/SocialService';
import { AnalyticsService } from '../services/AnalyticsService';
import { Club } from '../types';
import { COLORS } from '../constants';

interface ClubScreenProps {
  onBackPress: () => void;
  userId: string;
  username: string;
}

export const ClubScreen: React.FC<ClubScreenProps> = ({ 
  onBackPress, 
  userId, 
  username 
}) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'my_clubs'>('browse');
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const mockClubs: Club[] = [
        {
          id: 'club_1',
          name: 'Lucky Legends',
          description: 'Elite players who dominate the scratch cards',
          ownerId: 'owner_1',
          members: [
            {
              userId: 'owner_1',
              username: 'ClubOwner',
              role: 'owner',
              joinedAt: new Date(),
              contributedXP: 1500,
              lastActive: new Date()
            },
            {
              userId: 'member_1',
              username: 'ScratchMaster',
              role: 'member',
              joinedAt: new Date(),
              contributedXP: 800,
              lastActive: new Date()
            }
          ],
          maxMembers: 50,
          level: 5,
          totalXP: 2300,
          challenges: [
            {
              id: 'challenge_1',
              title: 'Weekly Scratch Goal',
              description: 'Complete 100 scratches this week',
              target: 100,
              progress: 67,
              reward: {
                tokens: 500,
                xp: 200,
                badges: ['weekly_warrior']
              },
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              isCompleted: false
            }
          ],
          createdAt: new Date(),
          isPublic: true,
          requirements: {
            minLevel: 3,
            minWins: 10
          }
        }
      ];

      setClubs(mockClubs);
      
      const userClubs = mockClubs.filter(club => 
        club.members.some(member => member.userId === userId)
      );
      setMyClubs(userClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    if (!clubDescription.trim()) {
      Alert.alert('Error', 'Please enter a club description');
      return;
    }

    setLoading(true);
    try {
      const club = await SocialService.createClub(
        userId,
        clubName.trim(),
        clubDescription.trim(),
        isPublic
      );

      await AnalyticsService.trackEvent('club_created_ui', {
        clubId: club.id,
        isPublic,
        nameLength: clubName.length,
        descriptionLength: clubDescription.length
      });

      setClubName('');
      setClubDescription('');
      setIsPublic(true);
      setShowCreateForm(false);
      loadClubs();
      
      Alert.alert('Success', 'Club created successfully!');
    } catch (error) {
      console.error('Error creating club:', error);
      Alert.alert('Error', 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    setLoading(true);
    try {
      const success = await SocialService.joinClub(clubId, userId, username);
      
      if (success) {
        await AnalyticsService.trackEvent('club_joined_ui', {
          clubId,
          userId
        });
        
        loadClubs();
        Alert.alert('Success', 'Joined club successfully!');
      } else {
        Alert.alert('Error', 'Unable to join club. It may be full or you may not meet requirements.');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      Alert.alert('Error', 'Failed to join club');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (clubId: string) => {
    Alert.prompt(
      'Create Challenge',
      'Enter challenge title:',
      async (title) => {
        if (title) {
          try {
            await SocialService.createClubChallenge(
              clubId,
              title,
              'Complete this challenge to earn rewards',
              50
            );
            
            await AnalyticsService.trackEvent('club_challenge_created', {
              clubId,
              title
            });
            
            loadClubs();
            Alert.alert('Success', 'Challenge created!');
          } catch (error) {
            console.error('Error creating challenge:', error);
            Alert.alert('Error', 'Failed to create challenge');
          }
        }
      }
    );
  };

  const renderClub = ({ item }: { item: Club }) => {
    const isMember = item.members.some(member => member.userId === userId);
    const isOwner = item.ownerId === userId;
    const canJoin = !isMember && item.members.length < item.maxMembers;

    return (
      <View style={styles.clubCard}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.background]}
          style={styles.clubGradient}
        >
          <View style={styles.clubHeader}>
            <View style={styles.clubInfo}>
              <Text style={styles.clubName}>{item.name}</Text>
              <Text style={styles.clubDescription}>{item.description}</Text>
            </View>
            <View style={styles.clubLevel}>
              <Text style={styles.levelText}>LVL {item.level}</Text>
            </View>
          </View>

          <View style={styles.clubStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.members.length}/{item.maxMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.challenges.length}</Text>
              <Text style={styles.statLabel}>Challenges</Text>
            </View>
          </View>

          {item.challenges.length > 0 && (
            <View style={styles.challengePreview}>
              <Text style={styles.challengeTitle}>Active Challenge:</Text>
              <Text style={styles.challengeName}>{item.challenges[0].title}</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(item.challenges[0].progress / item.challenges[0].target) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {item.challenges[0].progress}/{item.challenges[0].target}
              </Text>
            </View>
          )}

          <View style={styles.membersList}>
            <Text style={styles.membersTitle}>Members:</Text>
            <View style={styles.memberChips}>
              {item.members.slice(0, 3).map((member) => (
                <View key={member.userId} style={styles.memberChip}>
                  <Text style={styles.memberName}>{member.username}</Text>
                  {member.role === 'owner' && <Text style={styles.ownerBadge}>👑</Text>}
                </View>
              ))}
              {item.members.length > 3 && (
                <Text style={styles.moreMembers}>+{item.members.length - 3} more</Text>
              )}
            </View>
          </View>

          <View style={styles.clubActions}>
            {canJoin && (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton]}
                onPress={() => handleJoinClub(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Join Club</Text>
              </TouchableOpacity>
            )}
            
            {isOwner && (
              <TouchableOpacity
                style={[styles.actionButton, styles.manageButton]}
                onPress={() => handleCreateChallenge(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Add Challenge</Text>
              </TouchableOpacity>
            )}

            {isMember && !isOwner && (
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => Alert.alert('Club Details', 'Club details view would open here')}
              >
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Clubs & Guilds</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse Clubs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_clubs' && styles.activeTab]}
          onPress={() => setActiveTab('my_clubs')}
        >
          <Text style={[styles.tabText, activeTab === 'my_clubs' && styles.activeTabText]}>
            My Clubs ({myClubs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {showCreateForm && (
        <View style={styles.createForm}>
          <Text style={styles.formTitle}>Create New Club</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Club Name"
            placeholderTextColor={COLORS.textSecondary}
            value={clubName}
            onChangeText={setClubName}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Club Description"
            placeholderTextColor={COLORS.textSecondary}
            value={clubDescription}
            onChangeText={setClubDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Public Club</Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: COLORS.textSecondary, true: COLORS.primary }}
              thumbColor={COLORS.background}
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => setShowCreateForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton]}
              onPress={handleCreateClub}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>Create Club</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={activeTab === 'browse' ? clubs : myClubs}
        keyExtractor={(item) => item.id}
        renderItem={renderClub}
        contentContainerStyle={styles.clubsList}
        refreshing={loading}
        onRefresh={loadClubs}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'browse' ? 'No clubs available' : 'You haven\'t joined any clubs yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'browse' ? 'Check back later!' : 'Browse clubs to find one to join!'}
            </Text>
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: COLORS.background,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  clubsList: {
    padding: 20,
  },
  clubCard: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  clubGradient: {
    padding: 20,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  clubDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  clubLevel: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  levelText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  clubStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  challengePreview: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  challengeName: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  membersList: {
    marginBottom: 15,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
  },
  memberName: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownerBadge: {
    marginLeft: 5,
    fontSize: 10,
  },
  moreMembers: {
    color: COLORS.textSecondary,
    fontSize: 12,
    alignSelf: 'center',
  },
  clubActions: {
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
  manageButton: {
    backgroundColor: COLORS.warning,
  },
  viewButton: {
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
