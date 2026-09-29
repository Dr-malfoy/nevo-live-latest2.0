export interface IComment {
  userId: string;
  text: string;
  createdAt: Date;
}

export interface IMoment {
  _id: string;
  userId: string;
  content?: string;
  media: string[];
  likes: string[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMomentInput {
  content?: string;
  media?: string[];
}
