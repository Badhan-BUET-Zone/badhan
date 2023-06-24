// tslint:disable:no-console
import '../mongoose'
import {DonorModel, IDonor} from '../models/Donor'
import * as faker from "../../doc/faker";
import bcrypt from 'bcryptjs'
const generateFakeData = async ():Promise<void> => {
    try {
        // Create an array to store user IDs
        const userIds: string[] = []
        // Generate fake users and save their IDs
        for (let i: number = 0; i < 1000; i++) {
            const user: IDonor = new DonorModel({
                name: faker.getName(),
                bloodGroup: faker.getBloodGroup(),
                hall: faker.getHall(),
                studentId: faker.getStudentId(),
                email: faker.getEmail(),
                phone: faker.getPhone(),
                address: faker.getAddress(),
                roomNumber: faker.getRoom(),
                lastDonation: faker.getTimestamp(365),
                comment: faker.getComment(),
                availableToAll: faker.getBoolean()
            });
            const savedUser: IDonor = await user.save();
            userIds.push(savedUser._id);
        }
        console.log('Created Random Donors')
        // Generate fake posts with user IDs
        // for (let i = 0; i < 10; i++) {
        //     const post = new Post({
        //         title: faker.lorem.sentence(),
        //         content: faker.lorem.paragraph(),
        //         user: faker.random.arrayElement(userIds),
        //     });
        //     await post.save();
        // }
        // create hall admins
        for (let i: number = 0; i < 7; i++) {
            const hallAdmin: IDonor = new DonorModel({
                name: faker.getName(),
                bloodGroup: faker.getBloodGroup(),
                hall: i,
                studentId: faker.getStudentId(),
                email: faker.getEmail(),
                phone: faker.getPhone(),
                address: faker.getAddress(),
                roomNumber: faker.getRoom(),
                lastDonation: faker.getTimestamp(365),
                comment: faker.getComment(),
                availableToAll: faker.getBoolean(),
                designation: 2
            });
            const savedHallAdmin: IDonor = await hallAdmin.save();
        }

        const superAdmin: IDonor = new DonorModel({
            name: faker.getName(),
            bloodGroup: faker.getBloodGroup(),
            hall: 5,
            studentId: faker.getStudentId(),
            email: faker.getEmail(),
            phone: 8801500000000,
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            lastDonation: faker.getTimestamp(365),
            comment: faker.getComment(),
            availableToAll: faker.getBoolean(),
            designation: 3,
            password: 'badhandev'
        });
        await superAdmin.save();
        console.log('Created Super Admin')

        console.log('Fake data generation completed!');
    } catch (error) {
        console.error('Error generating fake data:', error);
    } finally {
        process.exit(0);
    }
};

generateFakeData();