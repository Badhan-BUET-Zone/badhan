const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
const util = require('util')

const test = async()=>{
    console.log("Started...")
    let donors = await Donor.find();

    let start = 1360;
    for(let i = start ; i < donors.length; i++){
        console.log("DONOR NUMBER: ",i);
        console.log("DONOR PHONE: ",donors[i].phone);
        await donors[i].populate('donationCountOptimized').execPopulate();
        console.log("optimized: ",donors[i].donationCountOptimized)
        console.log("previous: ",donors[i].donationCount);
        if(donors[i].donationCount>donors[i].donationCountOptimized){
            let extraDonations = donors[i].donationCount-donors[i].donationCountOptimized;

            let dummyDonations = [];
            for (let j = 0; j < extraDonations; j++) {
                dummyDonations.push({
                    phone: donors[i].phone,
                    donorId: donors[i]._id,
                    date: 0
                })
            }


            console.log("extra donations needed: ",dummyDonations.length);
            console.log(dummyDonations)

            await Donation.insertMany(dummyDonations);
            console.log("dummy donation insertion done")
        }

        // break;
    }

    await mongoose.disconnect();
}
test();
