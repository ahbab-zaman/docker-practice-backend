import { Request, Response } from 'express';
import { getMe } from './user.service';
import { ApiResponse } from '@/utils/ApiResponse';

export const me = async (req: Request, res: Response) => {
  const user = await getMe(req.user!.id);
  res.json(ApiResponse.success(user));
};
