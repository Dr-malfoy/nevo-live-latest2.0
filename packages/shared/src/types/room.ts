export interface ISeat {
  index: number;
  userId?: string;
  isLocked?: boolean;
}

export interface IRoom {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  seats: ISeat[];
  isPrivate: boolean;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomInput {
  name: string;
  description?: string;
  seatCount?: number;
  isPrivate?: boolean;
  password?: string;
}
