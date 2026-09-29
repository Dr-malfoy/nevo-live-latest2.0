import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  uid: string;
  role: 'admin' | 'agent' | 'host' | 'user';
  isAgent: boolean;
  isAdmin: boolean;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
};
