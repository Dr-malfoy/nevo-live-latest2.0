export interface ITransaction {
  _id: string;
  userId: string;
  type: 'recharge' | 'gift_send' | 'gift_receive' | 'gift_cut' | 'withdraw' | 'coin_purchase' | 'coin_sale' | 'agent_recharge' | 'agent_sale' | 'commission' | 'transfer' | 'game_bet' | 'game_win' | 'daily_reward';
  coinRate?: number;
  amount: number;
  currency: 'diamond' | 'coin';
  targetId?: string;
  targetModel?: 'Gift' | 'User';
  giftId?: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: Date;
}

export interface SendGiftInput {
  receiverId: string;
  giftId: string;
  quantity: number;
}

export interface RechargeInput {
  amount: number;
  paymentMethod: string;
}
