import '../mongoose'
import { IDonor } from '../models/Donor'
import { DonorFactory } from './factories/donorFactory';
import myConsole from '../../utils/myConsole';
import { Progress } from '../../utils/progress';

const generateFakeData = async ():Promise<void> => {
    try {
        // Create an array to store user IDs
        const userIds: string[] = []
        const donorFactory: DonorFactory = new DonorFactory()

        const progressBar: Progress = new Progress(7)

        // Generate fake donors and volunteers and save their IDs
        for (let i: number = 0; i < 7; i++) {
            const hallAdmin: IDonor = donorFactory.createData({
                hall: i,
                designation: 2
            });
            await hallAdmin.save();

            for (let j: number = 0; j < 15; j++) {
                const user: IDonor = donorFactory.createData({
                    hall: i,
                    designation: 1
                });
                await user.save();
            }

            for (let j: number = 0; j < 100; j++) {
                const user: IDonor = donorFactory.createData({
                    designation: 0,
                    hall: i
                });
                const savedUser: IDonor = await user.save();
                userIds.push(savedUser._id);
            }
            progressBar.tick()
        }

        const superAdmin: IDonor = donorFactory.createData({
            phone: 8801500000000,
            designation: 3,
            hall: 5,
            password: 'badhandev'
        });
        await superAdmin.save();
        myConsole.log('Created Super Admin')

        myConsole.log('Fake data generation completed!');
    } catch (error) {
        myConsole.error('Error generating fake data:', error);
    } finally {
        process.exit(0);
    }
};

generateFakeData();