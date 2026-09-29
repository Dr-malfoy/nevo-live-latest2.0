export interface IAdminPaymentInfo {
  _id?: string;
  bybit: { qrCode: string; walletAddress: string };
  binance: { qrCode: string; walletAddress: string };
}

export interface IUserPaymentInfo {
  bybit: { qrCode: string; walletAddress: string };
  binance: { qrCode: string; walletAddress: string };
}

export type PaymentMethod = string; // Relaxed to allow dynamic methods like 'bkash', 'binance', 'custom_123'

export interface IPaymentMethods {
  bybitEnabled: boolean;
  binanceEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  rocketEnabled: boolean;
  diamondRate: number;
  coinRate: number;
  withdrawalRate: number;
  rechargeRate: number;
  bonusRate: number;
  serviceCharge: number;
}

export interface IPurchaseOrder {
  _id: string;
  userId: string;
  agentId: string;
  paymentMethod: PaymentMethod;
  amountBdt: number;
  diamonds: number;
  coins: number;
  screenshot: string;
  transactionId: string;
  accountNumber?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  adminNote?: string;
  createdAt: Date;
}

export interface IAgentPurchaseOrder {
  _id: string;
  agentId: string;
  currency: 'diamond' | 'coin';
  amount: number;
  amountBdt: number;
  paymentMethod: string;
  screenshot: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Date;
}

export interface IWithdrawalRequest {
  _id: string;
  userId: string;
  agentId: string;
  currency: 'diamond' | 'coin';
  amount: number;
  amountBdt: number;
  method: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  agentNote?: string;
  adminNote?: string;
  createdAt: Date;
}

export interface IPlatformWallet {
  _id: string;
  diamonds: number;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
}
