import { mongoose, waitForConnection } from '../mongoose'
import myConsole from '../../utils/myConsole';
import { DonorFactory } from './factories/donorFactory';
import { DESIGNATIONS_INDEX } from '../../constants';
import { IDonor } from '../models/Donor';

const clearDatabase = async (): Promise<void> => {
    const SUPERADMIN_PHONE_NUMBER: number = 8801500000000;
    const SUPERADMIN_PASSWORD: string = 'badhandev';

    try {
        await waitForConnection();
        const db: any = mongoose.connection.db;
        if (!db) throw new Error('No MongoDB connection available');

        myConsole.log(`Dropping database "${db.databaseName}"…`);
        await db.dropDatabase();
        myConsole.log('Database dropped successfully.');

        // Re-create essential seed data (Super Admin)
        const donorFactory: DonorFactory = new DonorFactory();
        const superAdmin: IDonor = donorFactory.createData({
            phone: SUPERADMIN_PHONE_NUMBER,
            designation: DESIGNATIONS_INDEX.SUPER_ADMIN,
            password: SUPERADMIN_PASSWORD
        });
        await superAdmin.save();
        myConsole.log('Super Admin user created.');
    } catch (error: unknown) {
        myConsole.error('Error clearing & seeding database:', error);
    } finally {
        process.exit(0);
    }
};

clearDatabase();