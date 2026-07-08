import { Pool } from 'pg';
import { env } from './env';
import { logger } from '@/utils/logger';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('acquire', (_client) => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', (_client) => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});
