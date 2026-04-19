// VaultFinance — Logger (Winston)
// © 2025 VaultFinance. All Rights Reserved.

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
  transports: [
    // Console
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat,
      ),
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Combined log
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(process.cwd(), 'logs', 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(process.cwd(), 'logs', 'rejections.log') }),
  ],
});
