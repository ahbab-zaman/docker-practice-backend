import { pool } from '@/config/db';
import type { PublicUser } from './auth.types';

export interface UserRow extends PublicUser {
  password_hash: string;
}

export const findUserByEmail = async (email: string): Promise<UserRow | undefined> => {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  return rows[0];
};

export const createUser = async (email: string, password_hash: string): Promise<PublicUser> => {
  const { rows } = await pool.query<PublicUser>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, password_hash],
  );
  return rows[0]!;
};
