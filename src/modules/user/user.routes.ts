import { Router } from 'express';
import { me } from './user.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

router.get('/me', authenticate, asyncHandler(me));

export default router;
