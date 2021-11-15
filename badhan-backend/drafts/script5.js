const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');

const test = async()=>{
    console.log("Started...")

    let allDonors = await Donor.find();

    let start = 0;
    for(let i = start ; i < allDonors.length; i++){
        console.log("Donor number: ",i);

        let maxDonationResult = await donationInterface.findMaxDonationByDonorId(allDonors[i]._id);

        let previousDate = allDonors[i].lastDonation;
        let newDate;

        if(maxDonationResult.status==="OK"){
            newDate = maxDonationResult.data[0].date;
        }else{
            newDate = 0;
        }

        if(previousDate===newDate){
            console.log("skipping correction")
            continue;
        }

        allDonors[i].lastDonation = newDate;
        await allDonors[i].save();
    }


    await mongoose.disconnect();
}
test();
