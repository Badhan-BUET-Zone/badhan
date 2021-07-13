const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');

const test = async()=>{
    let allDonors = await Donor.find({});


    for(let i =  0; i < allDonors.length; i++){
        let response = await Donation.find({date: allDonors[i].lastDonation,donorId: allDonors[i]._id});
        if(response.length===0){
            console.log(allDonors[i].name,allDonors[i].hall);
        }
    }




    await mongoose.disconnect()
}
test();
