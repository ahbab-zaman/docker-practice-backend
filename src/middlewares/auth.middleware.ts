import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId };
    next();
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
};
