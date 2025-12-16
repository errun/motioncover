/**
 * 统一日志工具
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = 
  (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, error?: unknown, context?: LogContext) {
    if (shouldLog('error')) {
      const errorDetails = error instanceof Error 
        ? { errorMessage: error.message, stack: error.stack }
        : { error };
      console.error(formatMessage('error', message, { ...context, ...errorDetails }));
    }
  },

  /**
   * 创建带前缀的 logger 实例
   */
  withPrefix(prefix: string) {
    return {
      debug: (message: string, context?: LogContext) => 
        logger.debug(`[${prefix}] ${message}`, context),
      info: (message: string, context?: LogContext) => 
        logger.info(`[${prefix}] ${message}`, context),
      warn: (message: string, context?: LogContext) => 
        logger.warn(`[${prefix}] ${message}`, context),
      error: (message: string, error?: unknown, context?: LogContext) => 
        logger.error(`[${prefix}] ${message}`, error, context),
    };
  },
};

export default logger;

