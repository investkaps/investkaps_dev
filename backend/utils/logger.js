import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Include structured metadata (requestId, pan, userId, etc.) alongside the
// message.  Previously the printf format silently discarded the second argument
// to logger.info/error calls, making requestId tracing useless.
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    // Collect any extra fields beyond the standard ones
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create logger - only console transport (no file transports)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

export default logger;
