const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
const util = require('util')

const test = async()=>{
    console.log("Started...")
    let results = await Donor.aggregate([
        {$group: {
                _id: {name: "$phone"},
                uniqueIds: {$addToSet: "$_id"},
                count: {$sum: 1}
            }
        },
        {$match: {
                count: {"$gt": 1}
            }
        },
        {$sort: {
                count: -1
            }
        }
    ]);

    for(let i = 0 ; i < results.length; i++){
        console.log("DUPLICATION NUMBER ",i,"/",results.length)
        console.log(results[i].uniqueIds);

        let duplicateDonors = await Donor.find({_id:results[i].uniqueIds}).populate('donationCountOptimized');
        console.log(duplicateDonors)

        let finalHall = 8;
        let finalDonorIndex = -1;
        let finalDonationCount = 0;
        let finalAvailableToAll = false;
        let finalName = "";
        let finalCommentTime = 0;
        let finalComment = "";
        let finalAddress = "merged: ";

        for(let j = 0 ; j < duplicateDonors.length; j++){
            if(duplicateDonors[j].hall <= finalHall){
                finalHall = duplicateDonors[j].hall;
            }

            if(duplicateDonors[j].address !== "(unknown)"){
                finalAddress += duplicateDonors[j].address+" ";
            }

            if(duplicateDonors[j].donationCountOptimized >= finalDonationCount){
                finalDonorIndex = j;
                finalDonationCount = duplicateDonors[j].donationCountOptimized;
            }

            if(duplicateDonors[j].availableToAll===true){
                finalAvailableToAll = true;
            }

            if(duplicateDonors[j].name.length >= finalName.length){
                finalName = duplicateDonors[j].name;
            }

            if(duplicateDonors[j].commentTime >= finalCommentTime){
                finalComment = duplicateDonors[j].comment;
                finalCommentTime = duplicateDonors[j].commentTime
            }
        }

        duplicateDonors[finalDonorIndex].hall = finalHall;
        duplicateDonors[finalDonorIndex].availableToAll = finalAvailableToAll;
        duplicateDonors[finalDonorIndex].name = finalName;
        duplicateDonors[finalDonorIndex].commmentTime = finalCommentTime;
        duplicateDonors[finalDonorIndex].comment = finalComment;
        duplicateDonors[finalDonorIndex].address = finalAddress;

        duplicateDonors[finalDonorIndex].save();
        console.log("final donor to be kept: ");
        console.log(duplicateDonors[finalDonorIndex]);

        for(let j = 0 ; j < duplicateDonors.length; j++){
            if(j===finalDonorIndex){
                continue;
            }

            await Donor.findByIdAndDelete(duplicateDonors[j]._id);
        }



        // break;
    }



    await mongoose.disconnect();
}
test();
