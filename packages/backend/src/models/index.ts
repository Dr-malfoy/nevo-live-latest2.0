export { User, IUserDocument, IUserSettings, DEFAULT_USER_SETTINGS } from './User';
export { LiveStream, ILiveStreamDocument } from './LiveStream';
export { Room, IRoomDocument } from './Room';
export { Gift, IGiftDocument } from './Gift';
export { Transaction, ITransactionDocument, TransactionType } from './Transaction';
export { Agency, IAgencyDocument } from './Agency';
export { Moment, IMomentDocument } from './Moment';
export { LevelConfig, ILevelConfigDocument } from './LevelConfig';
export { NobleTier, INobleTierDocument } from './NobleTier';
export { PaymentConfig, IPaymentConfigDocument } from './PaymentConfig';
export { PurchaseOrder, IPurchaseOrderDocument } from './PurchaseOrder';
export { AdminPaymentInfo, IAdminPaymentInfoDocument } from './AdminPaymentInfo';
export * from './PaymentMethod';
export { SellRequest, ISellRequestDocument } from './SellRequest';
export { AgentPurchaseOrder, IAgentPurchaseOrderDocument } from './AgentPurchaseOrder';
export { WithdrawalRequest, IWithdrawalRequestDocument } from './WithdrawalRequest';
export { Notification, INotificationDocument } from './Notification';
export { OfficialNotification, IOfficialNotificationDocument } from './OfficialNotification';
export { AuditLog, IAuditLogDocument } from './AuditLog';
export { PlatformWallet, IPlatformWalletDocument } from './PlatformWallet';
export { Report, IReportDocument } from './Report';
export { Chat, IChatDocument } from './Chat';
export { ChatMessage, IChatMessageDocument } from './ChatMessage';
export { ContactMessage, IContactMessageDocument } from './ContactMessage';
export { Call, ICallDocument } from './Call';
export { TeenPattiRound, ITeenPattiRoundDocument } from './TeenPattiRound';
export { TeenPattiBet, ITeenPattiBetDocument } from './TeenPattiBet';
export { RouletteRound, IRouletteRoundDocument } from './RouletteRound';
export { RouletteBet, IRouletteBetDocument } from './RouletteBet';
export { AviatorRound, IAviatorRoundDocument } from './AviatorRound';
export { AviatorBet, IAviatorBetDocument } from './AviatorBet';
export { DailyRewardConfig, IDailyRewardConfigDocument, IRewardTier, DEFAULT_REWARD_TIERS } from './DailyRewardConfig';
export { DailyRewardClaim, IDailyRewardClaimDocument } from './DailyRewardClaim';
export { VerificationRequest, IVerificationRequestDocument, IVerificationAuditEntry } from './VerificationRequest';
export { ProfileVisit, IProfileVisitDocument, PROFILE_VISIT_WINDOW_DAYS } from './ProfileVisit';
export { RankingSnapshot, IRankingSnapshotDocument, IRankingRow } from './RankingSnapshot';
export { RankingConfig, IRankingConfigDocument } from './RankingConfig';
export { RankingAward, IRankingAwardDocument } from './RankingAward';

// ── Store & inventory (§4.0) ────────────────────────────────────────
export { StoreItem, IStoreItemDocument, StoreCategory } from './StoreItem';
export { UserInventory, IUserInventoryDocument } from './UserInventory';

// ── Task engine (§4.3) ──────────────────────────────────────────────
export { TaskProgress, ITaskProgressDocument } from './TaskProgress';
export { TaskConfig, ITaskConfigDocument, ITaskReward, TaskGroup } from './TaskConfig';

// ── Party room PK (§4.9) ────────────────────────────────────────────
export { PkBattle, IPkBattleDocument } from './PkBattle';

// ── Messaging & fan club (§4.10) ────────────────────────────────────
export { FanClub, IFanClubDocument } from './FanClub';
export { FanGroup, IFanGroupDocument } from './FanGroup';

// ── Payments & payouts (§4.2) ───────────────────────────────────────
export { WithdrawAccount, IWithdrawAccountDocument } from './WithdrawAccount';

// ── Referral (§4.4) ─────────────────────────────────────────────────
export { ReferralTemplate, IReferralTemplateDocument } from './ReferralTemplate';
export { ReferralClaim, IReferralClaimDocument } from './ReferralClaim';

// ── Agent analytics (§4.7) ──────────────────────────────────────────
export { HostApplication, IHostApplicationDocument } from './HostApplication';
export { HostGroup, IHostGroupDocument } from './HostGroup';

// ── Levels & achievements (§4.6) ────────────────────────────────────
export { LevelPrivilege, ILevelPrivilegeDocument } from './LevelPrivilege';
export { AchievementConfig, IAchievementConfigDocument, IAchievementPoster, AchievementCategory } from './AchievementConfig';

// ── Games hub (§4.13) ───────────────────────────────────────────────
export { Activity, IActivityDocument, IActivityPrize } from './Activity';
export { SpinResult, ISpinResultDocument } from './SpinResult';
export { SignInRecord, ISignInRecordDocument } from './SignInRecord';

// ── Profile, history, config (§4.12) ────────────────────────────────
export { WatchHistory, IWatchHistoryDocument } from './WatchHistory';
export { AppConfig, IAppConfigDocument } from './AppConfig';

// ── OTP verification ────────────────────────────────────────────────
export { OtpVerification, IOtpVerificationDocument, OtpChannel, OtpPurpose } from './OtpVerification';

