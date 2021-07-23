const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');

const test = async()=>{
    let reqBody = {
        bloodGroup: 2,
        hall: 8,
        batch: 16,
        name: 'm',
        address: 'dhan',
        isAvailable: true,
        isNotAvailable: true
    };
    let result = await Donor.find({hall: reqBody.hall, bloodGroup: reqBody.bloodGroup});

    console.log(result.length);

    await mongoose.disconnect();
}
test();
