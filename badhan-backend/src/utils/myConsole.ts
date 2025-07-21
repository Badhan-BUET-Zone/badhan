import winston from 'winston';
import { TransformableInfo, Format } from 'logform';   // ← import Format

/* ── single formatter (pretty console output) ──────────────── */
const commonFormat: Format = winston.format.combine(          // ← type added
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY‑MM‑DD HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }: TransformableInfo): string =>
      `${timestamp}  ${level.padEnd(5)}  ${message}${
        Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : ''
      }`,
  ),
);

/* ── logger and wrapper (unchanged) ────────────────────────── */
const logger: winston.Logger = winston.createLogger({
  level: 'debug',
  format: commonFormat,
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
