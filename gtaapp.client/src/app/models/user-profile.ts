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

export interface AuthRequest {
  gamertag: string;
  pin: string;
  currentProfile?: UserProfile;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  gamertag?: string;
  isNewAccount?: boolean;
  profile?: UserProfile;
}

export interface SaveProfileRequest {
  gamertag: string;
  pin: string;
  profile: UserProfile;
}
