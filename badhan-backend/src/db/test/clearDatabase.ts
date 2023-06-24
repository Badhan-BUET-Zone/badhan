import '../mongoose'
import { DonorModel} from '../models/Donor'
import { DonationModel } from '../models/Donation';
import { ActiveDonorModel } from '../models/ActiveDonor';
import { CallRecordModel } from '../models/CallRecord';
import { LogModel } from '../models/Log';
import { PublicContactModel } from '../models/PublicContact';
import { TokenModel } from '../models/Token';

const clearDatabase = async ():Promise<void> => {
    try {
        await DonorModel.deleteMany({})
        await DonationModel.deleteMany({})
        await ActiveDonorModel.deleteMany({})
        await CallRecordModel.deleteMany({})
        await LogModel.deleteMany({})
        await PublicContactModel.deleteMany({})
        await TokenModel.deleteMany({})

        // tslint:disable-next-line:no-console
        console.log('Database clearing completed!');
    } catch (error) {
        // tslint:disable-next-line:no-console
        console.error('Error clearing data', error);
    } finally {
        // Close the database connection
        process.exit(0);
    }
};

clearDatabase();