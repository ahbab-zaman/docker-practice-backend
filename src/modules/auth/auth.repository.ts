import { pool } from '@/config/db';
import type { PublicUser } from './auth.types';

export interface UserRow extends PublicUser {
  password_hash: string;
}

export const findUserByEmail = async (email: string): Promise<UserRow | undefined> => {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  return rows[0];
};

export const createUser = async (email: string, password_hash: string, name: string): Promise<PublicUser> => {
  const { rows } = await pool.query<PublicUser>(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, password_hash, name],
  );
  return rows[0]!;
};
