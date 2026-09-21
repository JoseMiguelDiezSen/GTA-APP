export interface UserProfile {
  rockstarId?: string;
  nickname: string;
  avatarUrl?: string;
  platform: 'pc' | 'ps5' | 'xboxsx';
  characterSlot: number;
  isSyncedWithSocialClub: boolean;
  lastSyncDate?: string;
  rank?: number;
  cash?: number;
  bank?: number;
  ownedPropertyIds: string[];
  collectedItemIds: string[];
  highlightOwnedProperties: boolean;
  hideCollectedItems: boolean;
}

export interface SocialClubSyncPayload {
  rockstarId?: string;
  nickname?: string;
  avatarUrl?: string;
  platform?: string;
  characterSlot?: number;
  rank?: number;
  cash?: number;
  bank?: number;
  ownedPropertyIds?: string[];
  collectedItemIds?: string[];
  rawScapiData?: any;
}
