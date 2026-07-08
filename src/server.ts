import app from '@/app';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

const start = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection OK');
  } catch (err) {
    logger.error('Database connection failed', err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

start();
