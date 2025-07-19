import winston from 'winston';
import { isEnvironmentProduction } from '../dotenv';
import { TransformableInfo } from 'logform';

const isProd: boolean = isEnvironmentProduction();               // ✅ typed

const logger: winston.Logger = winston.createLogger({            // ✅ typed
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY‑MM‑DD HH:mm:ss' }),
        winston.format.printf(
          (info: TransformableInfo): string => {                 // ✅ typed
            const { timestamp, level, message, ...meta } = info;
            return `${timestamp}  ${level.padEnd(5)}  ${message}${
              Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : ''
            }`;
          },
        ),
      ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/badhan.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

export default {
  log: (...args: unknown[]): void => {
    logger.info(args.map(String).join(' '));
  },
  error: (...args: unknown[]): void => {
    const [first, ...rest] = args;
    if (first instanceof Error) {
      logger.error(first.message, { stack: first.stack, meta: rest });
    } else {
      logger.error(args.map(String).join(' '));
    }
  },
};
