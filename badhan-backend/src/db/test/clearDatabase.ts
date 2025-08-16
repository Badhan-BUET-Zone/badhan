import { mongoose } from '../mongoose'
import myConsole from '../../utils/myConsole';

const waitForConnection = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) return; // already connected
    await new Promise<void>((resolve: () => void, reject: (err: Error) => void): void => {
        mongoose.connection.once('open', (): void => resolve());
        mongoose.connection.once('error', (err: Error): void => reject(err));
    });
};

const clearDatabase = async (): Promise<void> => {
        try {
        await waitForConnection();
        const db: any = mongoose.connection.db;
        if (!db) throw new Error('No MongoDB connection available');

        myConsole.log(`Dropping database "${db.databaseName}"…`);
        await db.dropDatabase();
        myConsole.log('Database dropped successfully.');
    } catch (error: unknown) {
        myConsole.error('Error dropping database:', error);
    } finally {
        process.exit(0);
    }
};

clearDatabase();