export type ReportTargetType = 'user' | 'stream' | 'moment' | 'transaction';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export interface IReport {
  _id: string;
  reporterId: string | { _id: string; uid: string; nickname: string; avatar?: string };
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  adminNote?: string;
  reviewedBy?: string | { _id: string; uid: string; nickname: string };
  createdAt: Date;
  updatedAt: Date;
}
