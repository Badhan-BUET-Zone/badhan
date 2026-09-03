import { Model } from 'mongoose';
import { DonorModel, IDonor } from '../../models/Donor';
import {DataFactory} from './dataFactory'
import * as faker from "../../../doc/faker";
export class DonorFactory extends DataFactory {
    // The model decides which database a donor is saved to, so a reset aimed at another
    // environment passes that environment's model (see `donorModelOn`). Defaults to the
    // process's own.
    constructor (private readonly donorModel: Model<IDonor> = DonorModel) {
        super()
    }

    createData(partialDonor: Partial<IDonor>): IDonor {
        return new this.donorModel({
            name: faker.getName(),
            fatherName: faker.getName(),
            motherName: faker.getName(),
            bloodGroup: faker.getBloodGroup(),
            hall: faker.getHall(),
            studentId: faker.getStudentId(),
            email: faker.getEmail(),
            phone: faker.getPhone(),
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            comment: faker.getComment(),
            availableToAll: faker.getBoolean(),
            archiveFlag: false,
            isCertificateEnabled: false,
            designation: faker.getDesignation(),
            ...partialDonor
        })
    }
}
