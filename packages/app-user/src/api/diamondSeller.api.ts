import client from './client';

export interface DiamondSellerEligibility {
  isEligible: boolean;
  currentDiamonds: number;
  requiredDiamonds: number;
  progressPercent: number;
  isDiamondSeller: boolean;
  hasPendingApplication: boolean;
  latestApplication?: any;
  user?: any;
}

export const diamondSellerApi = {
  getEligibility: () => client.get<{ success: boolean; data: DiamondSellerEligibility }>('/diamond-seller/eligibility'),
  submitApplication: (data: {
    realName: string;
    phone: string;
    whatsapp?: string;
    notes?: string;
    paymentMethods?: {
      bkash?: string;
      nagad?: string;
      rocket?: string;
      binance?: string;
      bybit?: string;
    };
  }) => client.post('/diamond-seller/apply', data),
  getMyApplication: () => client.get<{ success: boolean; data: DiamondSellerEligibility }>('/diamond-seller/my-application'),
};
