import { Router } from 'express';
import { register, login, logout } from './auth.controller';
import { validate } from '@/middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';
import { authLimiter } from '@/middlewares/rateLimiter.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', asyncHandler(logout));

export default router;
