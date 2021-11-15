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
        const orphanDonations = await Donation.aggregate([
            {
                "$project": {
                    "donorId": {
                        "$toObjectId": "$donorId"
                    }
                }
            },
            {
                $lookup: {
                    from: "donors",
                    localField: "donorId",
                    foreignField: "_id",
                    as: "donor"
                }
            },
            // filter users without authority (means authority_id doesn't exist)
            { $match: { donor: [] } },

            { $project: { _id: "$_id" } }
        ]);

        await Donation.deleteMany({
            _id: { $in: orphanDonations.map(({ _id }) => _id) }
        });
    }catch (e) {
        console.log(e.message);
    }
    await mongoose.disconnect();
}
test();
