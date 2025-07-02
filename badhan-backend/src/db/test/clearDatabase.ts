import '../mongoose'
import { DonorModel} from '../models/Donor'
import { DonationModel } from '../models/Donation';
import { ActiveDonorModel } from '../models/ActiveDonor';
import { CallRecordModel } from '../models/CallRecord';
import { LogModel } from '../models/Log';
import { PublicContactModel } from '../models/PublicContact';
import { TokenModel } from '../models/Token';
import { Progress } from '../../utils/progress';
import myConsole from '../../utils/myConsole';

const clearDatabase = async ():Promise<void> => {
    const progressBar: Progress = new Progress(7)
    try {
        await DonorModel.deleteMany({})
        progressBar.tick()
        await DonationModel.deleteMany({})
        progressBar.tick()
        await ActiveDonorModel.deleteMany({})
        progressBar.tick()
        await CallRecordModel.deleteMany({})
        progressBar.tick()
        await LogModel.deleteMany({})
        progressBar.tick()
        await PublicContactModel.deleteMany({})
        progressBar.tick()
        await TokenModel.deleteMany({})
        progressBar.tick()

        myConsole.log('Database clearing completed!');
    } catch (error) {
        myConsole.error('Error clearing data', error);
    } finally {
        // Close the database connection
        process.exit(0);
    }
};

clearDatabase();