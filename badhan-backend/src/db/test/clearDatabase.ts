import { mongoose, waitForConnection } from '../mongoose'
import myConsole from '../../utils/myConsole'
import { DonorFactory } from './factories/donorFactory'
import { DESIGNATIONS_INDEX, HALLS_INDEX } from '../../constants'
import { IDonor } from '../models/Donor'
import { DonorModel } from '../models/Donor'
import * as faker from '../../doc/faker'


/**
 * Clears the active MongoDB database and re-seeds required initial data.
 * When imported and called from within the running server it will NOT exit the process.
 * When executed directly via `node dist/db/test/clearDatabase.js` it will still perform the
 * operation and then exit (mirroring the previous behaviour).
 */
export const clearDatabase = async (): Promise<{ ok: boolean, error?: unknown }> => {
    const SUPERADMIN_PHONE_NUMBER: number = 8801500000000
    const SUPERADMIN_PASSWORD: string = 'badhandev'
    try {
        await waitForConnection()
        const db: any = mongoose.connection.db
        if (!db) throw new Error('No MongoDB connection available')
        myConsole.log(`Dropping database "${db.databaseName}"…`)
        await db.dropDatabase()
        myConsole.log('Database dropped successfully.')
        // Re-create essential seed data (Super Admin)
        const currentBatchString: string = String(new Date().getFullYear() % 100).padStart(2, '0')
        const randomStudentIdTail: string = faker.getStudentId().slice(2)
        const superAdminStudentId: string = currentBatchString + randomStudentIdTail
        const superAdmin: IDonor = new DonorModel({
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
            designation: 3,
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
