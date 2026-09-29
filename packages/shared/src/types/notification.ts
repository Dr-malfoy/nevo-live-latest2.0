export interface INotification {
  _id: string;
  userId: string;
  type: 'rate_updated' | 'order' | 'withdrawal' | 'agent_linked' | 'recharge' | 'system' | 'gift';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}
