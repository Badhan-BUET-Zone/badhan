import { DonorModel, IDonor } from '../../models/Donor';
import {DataFactory} from './dataFactory'
import * as faker from "../../../doc/faker";
export class DonorFactory extends DataFactory {
    createData(partialDonor: Partial<IDonor>): IDonor {
        return new DonorModel({
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
