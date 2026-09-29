export interface IAuditLog {
  _id: string;
  actorId: string | { _id: string; uid: string; nickname: string; role: string };
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
  createdAt: Date;
}
