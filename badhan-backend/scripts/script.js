const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
const util = require('util')

const test = async()=>{
    let reqQuery = {
        bloodGroup: 2,//can be null, but must be number of one digit
        hall: 8,// cannot be null and must be number of one digit
        isNotAvailable: true, // cannot be null and must be boolean
        isAvailable: true, // cannot be null and must be boolean
        name: 'm', // can be null
        address: 'mirpur', //can be null
        availableToAll: true, // cannot be null and must be boolean
        batch: "", // cannot be null and must be "" or "16"
    };

    //MAJOR BUG NOT RESOLVED: SOME STUDENT IDS ARE STILL NUMBER
    //NEET TO MAKE THEM STRING

    let queryBuilder = {}

    //process blood group
    if(reqQuery.bloodGroup){
        queryBuilder.bloodGroup = reqQuery.bloodGroup;
    }


    //process hall
    queryBuilder.hall= reqQuery.hall;

    //process availableToAll
    queryBuilder.availableToAll= reqQuery.availableToAll;

    //process batch
    let batchRegex="......."
    if(reqQuery.batch!==""){
        batchRegex = reqQuery.batch+".....";
    }
    queryBuilder.studentId= { $regex: batchRegex, $options: 'ix' };

    //process name
    let nameRegex = ".*";
    if(reqQuery.name){
        reqQuery.name = String(reqQuery.name).toLowerCase();
        for (let i = 0; i < reqQuery.name.length; i++) {
            nameRegex += (reqQuery.name.charAt(i)+".*");
        }
    }
    queryBuilder.name= { $regex: nameRegex, $options: 'ix' };

    //process address
    let addressRegex = ".*";
    if(reqQuery.address){
        reqQuery.address = String(reqQuery.address).toLowerCase();
        for (let i = 0; i < reqQuery.address.length; i++) {
            addressRegex += (reqQuery.address.charAt(i)+".*");
        }
    }
    queryBuilder.$and = [{$or:[
            {comment: { $regex: addressRegex, $options: 'ix' }},
            {address: { $regex: addressRegex, $options: 'ix' }}]},
    ];

    let availableLimit = new Date().getTime()-120*24*3600*1000;

    let lastDonationAvailability=[];

    if(reqQuery.isAvailable){
        lastDonationAvailability.push({
            lastDonation: { $lt: availableLimit }
        })
    }

    if(reqQuery.isNotAvailable){
        lastDonationAvailability.push({
            lastDonation: { $gt: availableLimit }
        })
    }

    if(reqQuery.isNotAvailable || reqQuery.isAvailable){
        queryBuilder.$and.push({$or:lastDonationAvailability});
    }


    // console.log(queryBuilder)

    console.log(util.inspect(queryBuilder, false, null, true /* enable colors */))

    let result = await Donor.find(queryBuilder).populate({path:'callRecords',select:{'_id':1,'date':1,'callerId':1}});

    console.log(result.length);

    result.forEach((data)=>{
        console.log(data);
    })

    await mongoose.disconnect();
}
test();
