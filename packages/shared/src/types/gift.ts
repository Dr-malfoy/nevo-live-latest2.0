export interface IGift {
  _id: string;
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  animation?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
}

export interface CreateGiftInput {
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  animation?: string;
  order?: number;
}
