import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  openid: string;
  tokenId: string;
  type: 'access' | 'refresh';
}

export interface AuthUser {
  userId: number;
  openid: string;
  tokenId: string;
}

export interface RequestWithContext extends Request {
  requestId?: string;
  user?: AuthUser;
}
