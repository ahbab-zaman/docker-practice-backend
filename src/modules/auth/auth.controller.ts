import { Request, Response } from 'express';
import { registerUser, loginUser } from './auth.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { env } from '@/config/env';

const parseDurationMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 86400000;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return value * (multipliers[unit] ?? 86400000);
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await registerUser(email, password);
  res.status(201).json(ApiResponse.success(user, 'User registered successfully'));
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const { user, token } = await loginUser(email, password);

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
  });

  res.json(ApiResponse.success(user, 'Login successful'));
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json(ApiResponse.success(null, 'Logged out successfully'));
};
