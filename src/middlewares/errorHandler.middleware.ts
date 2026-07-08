import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: null,
    });
  }

  logger.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errors: null,
  });
};
