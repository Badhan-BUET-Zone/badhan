import '../mongoose'
import { IDonor } from '../models/Donor'
import { DonorFactory } from './factories/donorFactory';
import myConsole from '../../utils/myConsole';
import { Progress } from '../../utils/progress';
import { DESIGNATIONS_INDEX, HALLS_INDEX } from '../../constants';

const generateFakeData = async ():Promise<void> => {

    const VOLUNTEER_COUNT_PER_HALL: number = 1
    const DONOR_COUNT_PER_HALL: number = 1

    const MAX_HALL_ADMIN_COUNT: number = 7
    const SUPERADMIN_PHONE_NUMBER: number = 8801500000000
    const SUPERADMIN_HALL: number = HALLS_INDEX.SUHRAWARDY
    const SUPERADMIN_PASSWORD: string = 'badhandev'

    try {
        // Create an array to store user IDs
        const userIds: string[] = []
        const donorFactory: DonorFactory = new DonorFactory()

        const progressBar: Progress = new Progress(MAX_HALL_ADMIN_COUNT)


        // // Generate fake donors and volunteers and save their IDs
        for (let i: number = 0; i < MAX_HALL_ADMIN_COUNT; i++) {
            const hallAdmin: IDonor = donorFactory.createData({
                hall: i,
                designation: DESIGNATIONS_INDEX.HALL_ADMIN
            });
            await hallAdmin.save();

            for (let j: number = 0; j < VOLUNTEER_COUNT_PER_HALL; j++) {
                const user: IDonor = donorFactory.createData({
                    hall: i,
                    designation: DESIGNATIONS_INDEX.VOLUNTEER
                });
                await user.save();
            }

            for (let j: number = 0; j < DONOR_COUNT_PER_HALL; j++) {
                const user: IDonor = donorFactory.createData({
                    designation: DESIGNATIONS_INDEX.DONOR,
                    hall: i
                });
                const savedUser: IDonor = await user.save();
                userIds.push(savedUser._id);
            }
            progressBar.tick()
        }

        // const superAdmin: IDonor = donorFactory.createData({
        //     phone: SUPERADMIN_PHONE_NUMBER,
        //     designation: DESIGNATIONS_INDEX.SUPER_ADMIN,
        //     password: SUPERADMIN_PASSWORD
        // });
        // await superAdmin.save();
        // myConsole.log('Created Super Admin')

        myConsole.log('Fake data generation completed!');
    } catch (error) {
        myConsole.error('Error generating fake data:', error);
    } finally {
        process.exit(0);
    }
};

generateFakeData();