import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { ScratchParty, PartyParticipant, Club, ClubMember, ClubChallenge, SocialShare, ReferralProgram } from '../types';

export class SocialService {
  private static readonly MAX_PARTY_SIZE = 10;
  private static readonly MAX_CLUB_SIZE = 50;
  private static readonly PARTY_DURATION_MINUTES = 30;

  static async createScratchParty(hostId: string, name: string, theme: string, entryFee: number = 0): Promise<ScratchParty> {
    const party: ScratchParty = {
      id: `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      hostId,
      participants: [],
      maxParticipants: this.MAX_PARTY_SIZE,
      startTime: new Date(Date.now() + 5 * 60 * 1000), // Start in 5 minutes
      endTime: new Date(Date.now() + (this.PARTY_DURATION_MINUTES + 5) * 60 * 1000),
      prizePool: 0,
      status: 'waiting',
      theme,
      entryFee
    };

    await this.saveScratchParty(party);
    
    await AnalyticsService.trackEvent('party_created', {
      partyId: party.id,
      hostId,
      theme,
      entryFee
    });

    return party;
  }

  static async joinScratchParty(partyId: string, userId: string, username: string): Promise<boolean> {
    try {
      const party = await this.getScratchParty(partyId);
      if (!party || party.status !== 'waiting' || party.participants.length >= party.maxParticipants) {
        return false;
      }

      const participant: PartyParticipant = {
        userId,
        username,
        joinedAt: new Date(),
        score: 0,
        wins: 0,
        isReady: false
      };

      party.participants.push(participant);
      party.prizePool += party.entryFee;

      await this.saveScratchParty(party);

      await AnalyticsService.trackEvent('party_joined', {
        partyId,
        userId,
        participantCount: party.participants.length
      });

      return true;
    } catch (error) {
      console.error('Error joining scratch party:', error);
      return false;
    }
  }

  static async startScratchParty(partyId: string): Promise<boolean> {
    try {
      const party = await this.getScratchParty(partyId);
      if (!party || party.status !== 'waiting' || party.participants.length < 2) {
        return false;
      }

      party.status = 'active';
      party.startTime = new Date();
      await this.saveScratchParty(party);

      await AnalyticsService.trackEvent('party_started', {
        partyId,
        participantCount: party.participants.length,
        prizePool: party.prizePool
      });

      return true;
    } catch (error) {
      console.error('Error starting scratch party:', error);
      return false;
    }
  }

  static async updatePartyScore(partyId: string, userId: string, score: number, isWin: boolean): Promise<void> {
    try {
      const party = await this.getScratchParty(partyId);
      if (!party || party.status !== 'active') return;

      const participant = party.participants.find(p => p.userId === userId);
      if (participant) {
        participant.score += score;
        if (isWin) participant.wins++;
        await this.saveScratchParty(party);
      }
    } catch (error) {
      console.error('Error updating party score:', error);
    }
  }

  static async createClub(ownerId: string, name: string, description: string, isPublic: boolean = true): Promise<Club> {
    const club: Club = {
      id: `club_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      ownerId,
      members: [{
        userId: ownerId,
        username: 'Owner', // This should be fetched from user data
        role: 'owner',
        joinedAt: new Date(),
        contributedXP: 0,
        lastActive: new Date()
      }],
      maxMembers: this.MAX_CLUB_SIZE,
      level: 1,
      totalXP: 0,
      challenges: [],
      createdAt: new Date(),
      isPublic,
      requirements: {
        minLevel: 1,
        minWins: 0
      }
    };

    await this.saveClub(club);

    await AnalyticsService.trackEvent('club_created', {
      clubId: club.id,
      ownerId,
      isPublic
    });

    return club;
  }

  static async joinClub(clubId: string, userId: string, username: string): Promise<boolean> {
    try {
      const club = await this.getClub(clubId);
      if (!club || club.members.length >= club.maxMembers) {
        return false;
      }

      const member: ClubMember = {
        userId,
        username,
        role: 'member',
        joinedAt: new Date(),
        contributedXP: 0,
        lastActive: new Date()
      };

      club.members.push(member);
      await this.saveClub(club);

      await AnalyticsService.trackEvent('club_joined', {
        clubId,
        userId,
        memberCount: club.members.length
      });

      return true;
    } catch (error) {
      console.error('Error joining club:', error);
      return false;
    }
  }

  static async createClubChallenge(clubId: string, title: string, description: string, target: number): Promise<ClubChallenge> {
    const challenge: ClubChallenge = {
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      target,
      progress: 0,
      reward: {
        tokens: target * 10,
        xp: target * 5,
        badges: []
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isCompleted: false
    };

    const club = await this.getClub(clubId);
    if (club) {
      club.challenges.push(challenge);
      await this.saveClub(club);
    }

    return challenge;
  }

  static async createSocialShare(
    userId: string,
    platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook',
    content: { text: string; image?: string; hashtags: string[] },
    winAmount?: number,
    theme: string = 'default'
  ): Promise<SocialShare> {
    const share: SocialShare = {
      id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform,
      content,
      winAmount,
      theme,
      sharedAt: new Date(),
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0
      }
    };

    await this.saveSocialShare(share);

    await AnalyticsService.trackEvent('social_share_created', {
      shareId: share.id,
      userId,
      platform,
      winAmount,
      theme
    });

    return share;
  }

  static async createReferralCode(referrerId: string): Promise<string> {
    const code = `LUCKY${referrerId.slice(-4).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    await AnalyticsService.trackEvent('referral_code_created', {
      referrerId,
      code
    });

    return code;
  }

  static async processReferral(code: string, refereeId: string): Promise<ReferralProgram | null> {
    try {
      const referrerId = await this.getReferrerIdFromCode(code);
      if (!referrerId || referrerId === refereeId) return null;

      const referral: ReferralProgram = {
        id: `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerId,
        refereeId,
        code,
        status: 'completed',
        reward: {
          referrerTokens: 100,
          refereeTokens: 50,
          bonusTickets: 1
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      await this.saveReferral(referral);

      await AnalyticsService.trackEvent('referral_completed', {
        referralId: referral.id,
        referrerId,
        refereeId,
        code
      });

      return referral;
    } catch (error) {
      console.error('Error processing referral:', error);
      return null;
    }
  }

  private static async saveScratchParty(party: ScratchParty): Promise<void> {
    const parties = await this.getAllScratchParties();
    const index = parties.findIndex(p => p.id === party.id);
    if (index >= 0) {
      parties[index] = party;
    } else {
      parties.push(party);
    }
    await StorageService.saveUserSettings('scratch_parties', parties);
  }

  private static async getScratchParty(partyId: string): Promise<ScratchParty | null> {
    const parties = await this.getAllScratchParties();
    return parties.find(p => p.id === partyId) || null;
  }

  private static async getAllScratchParties(): Promise<ScratchParty[]> {
    const data = await StorageService.getUserSettings('scratch_parties');
    return Array.isArray(data) ? data : [];
  }

  private static async saveClub(club: Club): Promise<void> {
    const clubs = await this.getAllClubs();
    const index = clubs.findIndex(c => c.id === club.id);
    if (index >= 0) {
      clubs[index] = club;
    } else {
      clubs.push(club);
    }
    await StorageService.saveUserSettings('clubs', clubs);
  }

  private static async getClub(clubId: string): Promise<Club | null> {
    const clubs = await this.getAllClubs();
    return clubs.find(c => c.id === clubId) || null;
  }

  private static async getAllClubs(): Promise<Club[]> {
    const data = await StorageService.getUserSettings('clubs');
    return Array.isArray(data) ? data : [];
  }

  private static async saveSocialShare(share: SocialShare): Promise<void> {
    const shares = await this.getAllSocialShares();
    shares.push(share);
    await StorageService.saveUserSettings('social_shares', shares);
  }

  private static async getAllSocialShares(): Promise<SocialShare[]> {
    const data = await StorageService.getUserSettings('social_shares');
    return Array.isArray(data) ? data : [];
  }

  private static async saveReferral(referral: ReferralProgram): Promise<void> {
    const referrals = await this.getAllReferrals();
    referrals.push(referral);
    await StorageService.saveUserSettings('referrals', referrals);
  }

  private static async getAllReferrals(): Promise<ReferralProgram[]> {
    const data = await StorageService.getUserSettings('referrals');
    return Array.isArray(data) ? data : [];
  }

  private static async getReferrerIdFromCode(code: string): Promise<string | null> {
    const referrals = await this.getAllReferrals();
    const referral = referrals.find(r => r.code === code);
    return referral?.referrerId || null;
  }
}
