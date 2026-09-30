import winston from 'winston';
import { env } from '../config/env.js';

// Sensitive keys to scrub from logs
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'botToken',
  'jwt_secret',
  'session_secret',
  'ai_api_key',
  'authorization',
  'cookie',
  'secret',
];

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const sanitizedMeta = sanitizeObject(metadata);
  const metaString = Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'test' ? 'error' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      ),
    }),
  ],
});
