const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const currentLevel: LogLevel =
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const levelWeight: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean =>
  levelWeight[level] >= levelWeight[currentLevel];

const timestamp = (): string => new Date().toISOString();

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(`[${timestamp()}] [DEBUG] ${msg}`, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (shouldLog('info')) console.info(`[${timestamp()}] [INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(`[${timestamp()}] [WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (shouldLog('error')) console.error(`[${timestamp()}] [ERROR] ${msg}`, ...args);
  },
};
