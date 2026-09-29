import { Schema, model, Document } from 'mongoose';

export interface INoble {
  type: 'silver' | 'gold' | 'platinum' | 'diamond';
  expiry: Date;
}

/** #44 — the settings screen's single JSON blob. */
export interface IUserSettings {
  notifications: {
    system: boolean;
    follow: boolean;
    gift: boolean;
    live: boolean;
  };
  privacy: {
    whoCanMessage: 'everyone' | 'followers' | 'friends' | 'none';
    showVisitors: boolean;
    showOnlineStatus: boolean;
  };
  playback: {
    defaultQuality: 'low' | 'medium' | 'high';
    animationOn: boolean;
  };
  privilege: {
    showWealthBadge: boolean;
    showEntryEffect: boolean;
  };
}

export const DEFAULT_USER_SETTINGS: IUserSettings = {
  notifications: { system: true, follow: true, gift: true, live: true },
  privacy: { whoCanMessage: 'everyone', showVisitors: true, showOnlineStatus: true },
  playback: { defaultQuality: 'high', animationOn: true },
  privilege: { showWealthBadge: true, showEntryEffect: true },
};

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

export interface IUserDocument extends Document {
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
  /** ISO 3166-1 alpha-2, uppercase (BD, IN, PK…). Drives the country filter. */
  country: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  birthday?: Date;
  bio: string;
  /** Free-form interest tags shown on the details page (#Friendly, #Singer). */
  tags: string[];
  /** Touched on every authenticated request — drives the online/offline dot. */
  lastActiveAt: Date;
  level: number;
  wealthLevel?: number;
  liveLevel?: number;
  exp: number;
  diamonds: number;
  coins: number;
  /**
   * Second store currency (#45–49). The store's bottom bar shows coins *and*
   * tickets, and some items are priced only in tickets (12 / 30 / 140).
   */
  tickets: number;
  /** #51 — honor level gates the store's Honor tab via `StoreItem.requiredHonorLevel`. */
  honorLevel: number;
  /** #6 — bcrypt hash of the 4-digit asset password. Never selected by default. */
  assetPassword?: string;
  /** #6 — wrong-attempt counter; 3 failures lock the password for 30 minutes. */
  assetPasswordFailCount: number;
  assetPasswordLockedUntil?: Date;
  /** #72 — 1-to-1 call price in coins per minute (minimum 10,000). */
  callPricePerMinute: number;
  /** #58 — who invited this user. Set once at registration, never editable. */
  invitedBy?: Schema.Types.ObjectId;
  /** #44 — notifications / privacy / playback / privilege. */
  settings: IUserSettings;
  /** #44 — users this account has blocked (blacklist). */
  blockedUsers: Schema.Types.ObjectId[];
  /** #29 — people I protect / people protecting me. */
  guardians: Schema.Types.ObjectId[];
  guardedBy: Schema.Types.ObjectId[];
  /** Equipped store items by category (§4.0), mirrored from UserInventory for cheap reads. */
  equipped: Record<string, Schema.Types.ObjectId | string>;
  noble?: INoble;
  isVip?: boolean;
  hasPurchasedDiamonds?: boolean;
  role: 'admin' | 'agent' | 'host' | 'user';
  isAgent: boolean;
  isAdmin: boolean;
  agencyId?: Schema.Types.ObjectId;
  sellerType: 'none' | 'official' | 'paylor';
  verification: IVerificationState;
  isBanned: boolean;
  paymentInfo?: {
    bybit: { qrCode: string; walletAddress: string };
    binance: { qrCode: string; walletAddress: string };
  };
  following: Schema.Types.ObjectId[];
  followers: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, trim: true, default: '' },
    username: { type: String, trim: true, sparse: true, index: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    password: { type: String, select: false },
    googleId: { type: String, sparse: true, index: true },
    nickname: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' },
    country: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
      maxlength: 2,
      index: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unspecified'],
      default: 'unspecified',
    },
    birthday: { type: Date },
    bio: { type: String, default: '', trim: true, maxlength: 200 },
    tags: { type: [String], default: [] },
    lastActiveAt: { type: Date, default: Date.now, index: true },
    level: { type: Number, default: 1 },
    wealthLevel: { type: Number, default: 1, min: 1, max: 100 },
    liveLevel: { type: Number, default: 1, min: 1, max: 100 },
    exp: { type: Number, default: 0 },
    diamonds: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    tickets: { type: Number, default: 0, min: 0 },
    honorLevel: { type: Number, default: 0, min: 0 },
    // `select: false` so the hash can never leak through a populated user.
    assetPassword: { type: String, select: false },
    assetPasswordFailCount: { type: Number, default: 0 },
    assetPasswordLockedUntil: { type: Date },
    callPricePerMinute: { type: Number, default: 10000, min: 10000 },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    settings: {
      notifications: {
        system: { type: Boolean, default: true },
        follow: { type: Boolean, default: true },
        gift: { type: Boolean, default: true },
        live: { type: Boolean, default: true },
      },
      privacy: {
        whoCanMessage: {
          type: String,
          enum: ['everyone', 'followers', 'friends', 'none'],
          default: 'everyone',
        },
        showVisitors: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
      },
      playback: {
        defaultQuality: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
        animationOn: { type: Boolean, default: true },
      },
      privilege: {
        showWealthBadge: { type: Boolean, default: true },
        showEntryEffect: { type: Boolean, default: true },
      },
    },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guardians: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guardedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    equipped: { type: Schema.Types.Mixed, default: {} },
    noble: {
      type: { type: String, enum: ['silver', 'gold', 'platinum', 'diamond'] },
      expiry: Date,
    },
    role: {
      type: String,
      enum: ['admin', 'agent', 'host', 'user'],
      default: 'user',
      index: true,
    },
    isAgent: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    hasPurchasedDiamonds: { type: Boolean, default: false },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', index: true },
    sellerType: {
      type: String,
      enum: ['none', 'official', 'paylor'],
      default: 'none',
    },
    verification: {
      status: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
        default: 'NOT_SUBMITTED',
      },
      type: { type: String, enum: ['host', 'agency'] },
      verified: { type: Boolean, default: false },
      faceVerified: { type: Boolean, default: false },
      faceVerifiedAt: { type: Date },
      facePhotoUrl: { type: String },
      nidVerified: { type: Boolean, default: false },
      nidVerifiedAt: { type: Date },
      nidStatus: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
        default: 'NOT_SUBMITTED',
      },
      nidNumber: { type: String },
      verifiedAt: { type: Date },
      rejectionReason: { type: String },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
    },
    isBanned: { type: Boolean, default: false },
    paymentInfo: {
      bybit: {
        qrCode: { type: String, default: '' },
        walletAddress: { type: String, default: '' },
      },
      binance: {
        qrCode: { type: String, default: '' },
        walletAddress: { type: String, default: '' },
      },
    },
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Derive boolean flags from role and diamond holdings/purchases
userSchema.pre('save', function (next) {
  this.isAdmin = this.role === 'admin';
  this.isAgent = this.role === 'agent';
  if ((this.diamonds && this.diamonds > 0) || this.hasPurchasedDiamonds || this.noble) {
    this.isVip = true;
  }
  next();
});

export const User = model<IUserDocument>('User', userSchema);
