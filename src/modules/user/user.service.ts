import { ApiError } from '@/utils/ApiError';
import { findUserById } from './user.repository';
import type { PublicUser } from './user.types';

export const getMe = async (userId: string): Promise<PublicUser> => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};
