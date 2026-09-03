import { Connection, Model } from 'mongoose'
import { mongoose, waitForConnection } from '../mongoose'
import myConsole from '../../utils/myConsole'
import { DESIGNATIONS_INDEX, HALLS_INDEX } from '../../constants'
import { IDonor } from '../models/Donor'
import { donorModelOn } from './modelsOn'
import { syncCollectionValidators } from '../syncIndexes'
import * as faker from '../../doc/faker'


/**
 * Clears a MongoDB database and re-seeds required initial data.
 * When imported and called from within the running server it will NOT exit the process.
 * When executed directly via `node dist/db/test/clearDatabase.js` it will still perform the
 * operation and then exit (mirroring the previous behaviour).
 *
 * Defaults to the process's own connection — the local database. Pass a connection to reset a
 * different environment's database; it drops whatever database that connection points at, so
 * the caller is responsible for pointing it somewhere it is allowed to destroy.
 */
export const clearDatabase = async (
    connection: Connection = mongoose.connection
): Promise<{ ok: boolean, error?: unknown }> => {
    const SUPERADMIN_PHONE_NUMBER: number = 8801500000000
    const SUPERADMIN_PASSWORD: string = 'badhandev'
    try {
        // Only the default connection may still be opening; a caller-supplied one is handed
        // over already connected.
        if (connection === mongoose.connection) await waitForConnection()
        const db: any = connection.db
        if (!db) throw new Error('No MongoDB connection available')
        myConsole.log(`Dropping database "${db.databaseName}"…`)
        await db.dropDatabase()
        myConsole.log('Database dropped successfully.')
        // Dropping the database takes the collection validators with it, and the server is already
        // up so the boot-time sync will not run again. Without this line every test run and every
        // local purge would proceed with no guard on donors.designation — which is precisely the
        // state that let the field go missing in production.
        await syncCollectionValidators(connection)
        // Re-create essential seed data (Super Admin)
        const currentBatchString: string = String(new Date().getFullYear() % 100).padStart(2, '0')
        const randomStudentIdTail: string = faker.getStudentId().slice(2)
        const superAdminStudentId: string = currentBatchString + randomStudentIdTail
        const DonorModelForConnection: Model<IDonor> = donorModelOn(connection)
        const superAdmin: IDonor = new DonorModelForConnection({
            name: "Mir Mahathir Mohammad",
            bloodGroup: 2,
            hall: HALLS_INDEX.SUHRAWARDY,
            studentId: superAdminStudentId,
            email: faker.getEmail(),
            phone: SUPERADMIN_PHONE_NUMBER,
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            comment: faker.getComment(),
            availableToAll: true,
            designation: DESIGNATIONS_INDEX.SUPER_ADMIN,
            password: SUPERADMIN_PASSWORD,
        })
        await superAdmin.save()
        myConsole.log('Super Admin user created.')
        return { ok: true }
    } catch (error: unknown) {
        myConsole.error('Error clearing & seeding database:', error)
        return { ok: false, error }
    }
}
