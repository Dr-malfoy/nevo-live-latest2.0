export interface VerificationState {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  type?: 'host' | 'agency' | 'user';
  verified: boolean;
  faceVerified?: boolean;
  faceVerifiedAt?: string;
  facePhotoUrl?: string;
  nidVerified?: boolean;
  nidVerifiedAt?: string;
  nidStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  nidNumber?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface VerificationRequest {
  _id: string;
  userId: string;
  verificationType: 'face' | 'nid' | 'both';
  accountType?: 'host' | 'agency' | 'user';
  fullName?: string;
  olaId?: string;
  nidNumber?: string;
  dateOfBirth?: string;
  documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  facePhotoUrl?: string;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
}

export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export interface User {
  _id: string;
  uid: string;
  phone: string;
  nickname: string;
  avatar: string;
  cover?: string;
  /** ISO 3166-1 alpha-2, uppercase. Empty when not set. */
  country?: string;
  gender?: Gender;
  birthday?: string;
  bio?: string;
  tags?: string[];
  /** Derived server-side — active in the last 5 minutes. */
  online?: boolean;
  /** Derived server-side from `birthday`. */
  age?: number | null;
  lastActiveAt?: string;
  level: number;
  wealthLevel?: number;
  liveLevel?: number;
  wealthExp?: number;
  exp: number;
  diamonds: number;
  coins: number;
  noble?: { type: string; expiry: string };
  isVip?: boolean;
  hasPurchasedDiamonds?: boolean;
  role?: 'admin' | 'agent' | 'host' | 'user';
  isAgent: boolean;
  isAdmin: boolean;
  agencyId?: string;
  sellerType?: 'none' | 'official' | 'paylor';
  hostBadge?: 'alpha' | 'aurora' | 'none';
  hostBadgeType?: 'manual' | 'auto' | 'none';
  hostBadgeAssignedAt?: string;
  hostBadgeExpiresAt?: string;
  verification?: VerificationState;
  following: string[];
  followers: string[];
  createdAt: string;
}

export interface UserPublic {
  _id: string;
  uid: string;
  nickname: string;
  avatar: string;
  cover?: string;
  country?: string;
  gender?: Gender;
  bio?: string;
  tags?: string[];
  online?: boolean;
  age?: number | null;
  lastActiveAt?: string;
  level: number;
  wealthLevel?: number;
  liveLevel?: number;
  wealthExp?: number;
  isAgent: boolean;
  role?: 'admin' | 'agent' | 'host' | 'user';
  noble?: { type: string; expiry: string };
  isVip?: boolean;
  hasPurchasedDiamonds?: boolean;
  sellerType?: 'none' | 'official' | 'paylor';
  hostBadge?: 'alpha' | 'aurora' | 'none';
  hostBadgeType?: 'manual' | 'auto' | 'none';
  hostBadgeAssignedAt?: string;
  hostBadgeExpiresAt?: string;
  verification?: VerificationState;
  coins?: number;
  diamonds?: number;
}

/** Requirement #2 — the four counts shown on a profile. */
export interface ProfileStats {
  /** Mutual follows. */
  friends: number;
  following: number;
  followers: number;
  /** Distinct profile viewers in the last 7 days. */
  visitors: number;
}

export interface PublicProfile extends UserPublic, ProfileStats {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  /** @deprecated use `following` */
  followingCount: number;
  /** @deprecated use `followers` */
  followerCount: number;
}

/** A visitor row — a public user plus when they last viewed the profile. */
export interface ProfileVisitor extends UserPublic {
  visitTime: string;
  visitCount: number;
}

/** The four list tabs reachable from the profile counts. */
export type RelationListType = 'friends' | 'following' | 'followers' | 'visitors';

/** A country chip in the filter bar, with its live-host count. */
export interface LiveCountry {
  code: string;
  count: number;
}

export interface VerificationRequest {
  _id: string;
  userId: string | UserPublic;
  accountType: 'host' | 'agency';
  fullName: string;
  olaId: string;
  dateOfBirth: string;
  documentType: 'nid' | 'olaid';
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string | UserPublic;
  auditLog: {
    action: 'SUBMITTED' | 'OPENED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'REVOKED';
    adminId?: string;
    from: string;
    to: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface LiveStream {
  _id: string;
  // Populated user, raw id string, or null when the referenced user no longer exists
  hostId: UserPublic | string | null;
  title: string;
  cover: string;
  /** Server-derived thumbnail (cover → host avatar). */
  thumbnail?: string;
  type: 'video' | 'voice' | 'game';
  category: string;
  /** Host's country, denormalised server-side — drives the country filter. */
  country?: string;
  status: 'live' | 'ended';
  agoraChannel: string;
  viewerCount: number;
  totalViewers: number;
  startedAt: string;
  endedAt?: string;
  /** Last host heartbeat — used to drop stale streams client-side. */
  heartbeatAt?: string;
  isFeatured: boolean;
}

export interface Gift {
  _id: string;
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  animation?: string;
  isActive: boolean;
  order: number;
}

export interface Moment {
  _id: string;
  userId: UserPublic;
  content?: string;
  media: string[];
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  thumbnail?: string;
  durationSec?: number;
  hashtags?: string[];
  likes: string[];
  comments: Comment[];
  shares?: string[];
  shareCount?: number;
  viewCount?: number;
  giftCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  userId: UserPublic;
  text: string;
  createdAt: string;
}

export interface Room {
  _id: string;
  ownerId: UserPublic;
  name: string;
  description: string;
  seats: Seat[];
  isPrivate: boolean;
}

export interface Seat {
  index: number;
  userId?: UserPublic | string;
  isLocked: boolean;
}

export interface Transaction {
  _id: string;
  txId?: string;
  userId: any;
  type: string;
  amount: number;
  currency: 'diamond' | 'coin';
  targetId?: any;
  targetModel?: 'Gift' | 'User';
  giftId?: { name: string; icon: string };
  status: string;
  description?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface RewardTier {
  count: number;
  rewardCoins: number;
  requiredHours: number;
}

export interface RewardStatus {
  dateKey: string;
  cycleStart: string;
  cycleEnd: string;
  count: number;
  liveMinutes: number;
  endedToday: boolean;
  claimable: boolean;
  claimed: boolean;
  claimedTier: RewardTier | null;
  qualifiedTier: RewardTier | null;
  nextTier: RewardTier | null;
  tiers: RewardTier[];
  giftUserShare: number;
  giftAdminShare: number;
}
