import { pool } from '@/config/db';
import type { PublicUser } from './user.types';

export const findUserById = async (id: string): Promise<PublicUser | undefined> => {
  const { rows } = await pool.query<PublicUser>(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0];
};
