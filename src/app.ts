import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import routes from '@/routes';
import { notFound } from '@/middlewares/notFound.middleware';
import { errorHandler } from '@/middlewares/errorHandler.middleware';
import { requestLogger } from '@/middlewares/requestLogger.middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Backend API is running',
    endpoints: {
      health: '/api/health',
      auth: { register: '/api/auth/register', login: '/api/auth/login', logout: '/api/auth/logout' },
      user: '/api/user/me',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
