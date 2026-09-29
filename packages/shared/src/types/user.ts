export interface INoble {
  type: 'silver' | 'gold' | 'platinum' | 'diamond';
  expiry: Date;
}

export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export interface IVerificationState {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  type?: 'host' | 'agency';
  verified: boolean;
  faceVerified?: boolean;
  faceVerifiedAt?: Date;
  facePhotoUrl?: string;
  nidVerified?: boolean;
  nidVerifiedAt?: Date;
  nidStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  nidNumber?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
}

export interface IUser {
  _id: string;
  uid: string;
  phone: string;
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  googleId?: string;
  nickname: string;
  avatar: string;
  cover: string;
  /** ISO 3166-1 alpha-2, uppercase. Empty when the user has not set one. */
  country: string;
  gender: Gender;
  birthday?: Date;
  bio: string;
  tags: string[];
  lastActiveAt: Date;
  level: number;
  exp: number;
  diamonds: number;
  coins: number;
  noble?: INoble;
  isVip?: boolean;
  hasPurchasedDiamonds?: boolean;
  role: 'admin' | 'agent' | 'host' | 'user';
  isAgent: boolean;
  isAdmin: boolean;
  agencyId?: string;
  sellerType?: 'none' | 'official' | 'paylor';
  verification?: IVerificationState;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPublic {
  _id: string;
  uid: string;
  nickname: string;
  avatar: string;
  cover?: string;
  level: number;
  isAgent: boolean;
  noble?: INoble;
  isVip?: boolean;
  hasPurchasedDiamonds?: boolean;
  role?: 'admin' | 'agent' | 'host' | 'user';
  sellerType?: 'none' | 'official' | 'paylor';
  verification?: IVerificationState;
  country?: string;
  gender?: Gender;
  bio?: string;
  tags?: string[];
  /** Derived server-side: active within the last 5 minutes. */
  online?: boolean;
  /** Derived server-side from `birthday`; null when no birthday is set. */
  age?: number | null;
  lastActiveAt?: Date;
}

/** Requirement #2 — the four counts shown on a profile. */
export interface IProfileStats {
  /** Mutual follows. */
  friends: number;
  following: number;
  followers: number;
  /** Distinct profile viewers in the last 7 days. */
  visitors: number;
}

export interface IUserPublicWithStats extends IUserPublic, IProfileStats {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  /** @deprecated use `following` */
  followingCount: number;
  /** @deprecated use `followers` */
  followerCount: number;
}

/** A visitor row — a public user plus when they last looked at the profile. */
export interface IProfileVisitor extends IUserPublic {
  visitTime: string;
  visitCount: number;
}

export interface UpdateUserInput {
  nickname?: string;
  avatar?: string;
  cover?: string;
  country?: string;
  gender?: Gender;
  birthday?: string;
  bio?: string;
  tags?: string[];
}
