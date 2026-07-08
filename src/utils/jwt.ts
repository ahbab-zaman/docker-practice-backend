import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

interface TokenPayload {
  userId: string;
}

const parseSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 86400;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1 };
  return value * (multipliers[unit] ?? 86400);
};

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: parseSeconds(env.JWT_EXPIRES_IN) });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};
