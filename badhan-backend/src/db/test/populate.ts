import { Connection } from 'mongoose'
import { mongoose } from '../mongoose'
import { IDonor } from '../models/Donor'
import { DonorFactory } from './factories/donorFactory'
import { donorModelOn } from './modelsOn'
import myConsole from '../../utils/myConsole'
import { Progress } from '../../utils/progress'
import { DESIGNATIONS_INDEX, HALLS_INDEX } from '../../constants'

/**
 * Populates a database with synthetic data for local development / tests.
 * Returns status and any error encountered. Does NOT exit when imported.
 *
 * Defaults to the process's own connection — the local database. Pass a connection to seed a
 * different environment's database.
 */
export const generateFakeData = async (
    connection: Connection = mongoose.connection
): Promise<{ ok: boolean, error?: unknown }> => {
    const VOLUNTEER_COUNT_PER_HALL: number = 1
    const DONOR_COUNT_PER_HALL: number = 1
    const MAX_HALL_ADMIN_COUNT: number = 7
    try {
        const userIds: string[] = [] // retained for possible future usage
        const donorFactory: DonorFactory = new DonorFactory(donorModelOn(connection))
        const progressBar: Progress = new Progress(MAX_HALL_ADMIN_COUNT)
        for (let i: number = 0; i < MAX_HALL_ADMIN_COUNT; i++) {
            const hallAdmin: IDonor = donorFactory.createData({
                hall: i,
                designation: DESIGNATIONS_INDEX.HALL_ADMIN
            })
            await hallAdmin.save()
            for (let j: number = 0; j < VOLUNTEER_COUNT_PER_HALL; j++) {
                const user: IDonor = donorFactory.createData({
                    hall: i,
                    designation: DESIGNATIONS_INDEX.VOLUNTEER
                })
                await user.save()
            }
            for (let j: number = 0; j < DONOR_COUNT_PER_HALL; j++) {
                const user: IDonor = donorFactory.createData({
                    designation: DESIGNATIONS_INDEX.DONOR,
                    hall: i
                })
                const savedUser: IDonor = await user.save()
                userIds.push(savedUser._id)
            }
            progressBar.tick()
        }
        myConsole.log('Fake data generation completed!')
        return { ok: true }
    } catch (error) {
        myConsole.error('Error generating fake data:', error)
        return { ok: false, error }
    }
}
