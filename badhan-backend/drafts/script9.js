const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');
const {Log} = require('../db/models/Log');
// const donorInterface = require('../db/interfaces/donorInterface');
// const donationInterface = require('../db/interfaces/donationInterface');

const test = async()=>{
    console.log("Started...")

    try{
        let count = await Log.find({
            date:{
                $gt: new Date().getTime(),
                $lt: new Date().getTime()+24*3600*1000
            },
            donorId:"5e901d56effc5900177ced73"
        }).countDocuments();

        console.log(count);

    }catch (e) {
        console.log(e.message);
    }
    await mongoose.disconnect();
}
test();
