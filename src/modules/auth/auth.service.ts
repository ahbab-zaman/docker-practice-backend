import bcrypt from 'bcrypt';
import { ApiError } from '@/utils/ApiError';
import { signToken } from '@/utils/jwt';
import { findUserByEmail, createUser } from './auth.repository';
import type { PublicUser } from './auth.types';

const SALT_ROUNDS = 12;

export const registerUser = async (
  email: string,
  password: string,
  name: string,
): Promise<{ user: PublicUser; token: string }> => {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser(email, password_hash, name);
  const token = signToken({ userId: user.id });
  return { user, token };
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ user: PublicUser; token: string }> => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user.id });
  return { user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at }, token };
};
