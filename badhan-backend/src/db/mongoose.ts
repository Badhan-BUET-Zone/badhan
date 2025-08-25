import dotenv from '../dotenv';
import mongoose, { ConnectOptions } from 'mongoose';
import myConsole from '../utils/myConsole';
import { loadAndSyncIndexes } from './syncIndexes';

mongoose.Promise = global.Promise;

/* ────────────────────────────────────────────────────────────── */
/* Connect → load models → sync indexes                          */
/* ────────────────────────────────────────────────────────────── */
async function connectToDB(): Promise<void> {
  const flavour: 'Test' | 'Production' = String(dotenv.MONGODB_URI).includes('Test')
    ? 'Test'
    : 'Production';
  myConsole.log(`Connecting to ${flavour} database…`);

  try {
    const opts: ConnectOptions = {
      autoIndex: false,              // disable implicit builds
      serverSelectionTimeoutMS: 30_000,
      maxPoolSize: 10,
    };
    await mongoose.connect(dotenv.MONGODB_URI, opts);

    myConsole.log('✅  Connected to MongoDB.');

    await loadAndSyncIndexes();      // registers schemas + aligns indexes
  } catch (err: any) {
    myConsole.error('❌  Mongo connection failed:', err.message);
    process.exit(1);
  }
}

const waitForConnection = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) return; // already connected
    await new Promise<void>((resolve: () => void, reject: (err: Error) => void): void => {
        mongoose.connection.once('open', (): void => resolve());
        mongoose.connection.once('error', (err: Error): void => reject(err));
    });
};

// Keep a single promise representing full readiness (connected + models loaded + indexes synced)
const dbReady: Promise<void> = connectToDB();

/* ────────────────────────────────────────────────────────────── */
/* Graceful shutdown                                             */
/* ────────────────────────────────────────────────────────────── */
async function gracefulExit(signal: string): Promise<void> {
  myConsole.error(`${signal} received → closing MongoDB connection…`);
  await mongoose.disconnect();
  myConsole.error('MongoDB connection closed. Bye!');
  process.exit(0);
}

process.on('SIGINT', async (signal: string): Promise<void> =>
  gracefulExit(signal)
);
process.on('SIGTERM', async (signal: string): Promise<void> =>
  gracefulExit(signal)
);

/* ────────────────────────────────────────────────────────────── */
export { mongoose, waitForConnection, dbReady };
