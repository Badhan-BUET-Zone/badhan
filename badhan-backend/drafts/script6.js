const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
// const donorInterface = require('../db/interfaces/donorInterface');
// const donationInterface = require('../db/interfaces/donationInterface');

const test = async()=>{
    console.log("Started...")

    try{
        let donor = new Donor({
            studentId: "1605011",
            name: "demo donor",
            roomNumber: "nai",
            bloodGroup: 2,
            phone: 8801521438599,
            lastDonation: 0,
            donationCount: 7,
            comment: "(Unknown)",
            hall: 5,
            commentTime: 5,
            availableToAll: false,
            address: "(Unknown)"
        });
        await donor.save();
    }catch (e) {
        console.log(e.message);
    }
    await mongoose.disconnect();
}
test();
