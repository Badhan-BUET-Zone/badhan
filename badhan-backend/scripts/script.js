const dotenv = require('dotenv')

dotenv.config( { path : './config/config.env'} )
const { mongoose } = require('../db/mongoose');
const {Donor} = require('../db/models/Donor');
const {Donation} = require('../db/models/Donation');

const test = async()=>{
    let result = await Donor.aggregate([
        {$group: {
                _id: {name: "$phone"},
                uniqueIds: {$addToSet: "$_id"},
                count: {$sum: 1},
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

    console.log("total duplicates: ",result.length)

    for(let i = 0 ; i < result.length; i++){
        let _id = result[i]._id;
        let uniqueIds= result[i].uniqueIds;
        let count= result[i].count;

        let donors = await Donor.find({"_id" : {"$in" : uniqueIds}});
        console.log(_id)
        donors.forEach((donor)=>{
            console.log(donor.name,", Hall:",donor.hall);
        })
        console.log("_")
    }

    await mongoose.disconnect()
}
test();
