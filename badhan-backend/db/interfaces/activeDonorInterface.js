const {ActiveDonor} = require('../models/ActiveDonor');

const add = async (donorId, markerId) => {
    let addedActiveDonor = new ActiveDonor({donorId, markerId});
    let data = await addedActiveDonor.save();
    if (data.nInserted === 0) {
        return {
            message: 'Active donor insertion failed',
            status: 'ERROR'
        }
    }
    return {
        data,
        message: 'Active donor insertion successful',
        status: 'OK'
    };
};

const remove = async(donorId)=>{
    let removedActiveDonor = await ActiveDonor.findOneAndDelete({donorId});
    if(removedActiveDonor){
        return{
            data:removedActiveDonor,
            message:'Active donor removed successfully',
            status: 'OK'
        }
    }

    return{
        message: 'Active donor not found',
        status: 'ERROR'
    }
}

const findByDonorId= async (donorId)=>{
    let activeDonors = await ActiveDonor.find({donorId});
    if(activeDonors.length===0){
        return {
            message: 'Active donor not found',
            status: 'ERROR',
        }
    }
    return{
        data:activeDonors,
        status:'OK',
        message:'Active donor found'
    }
}
const findByQueryAndPopulate = async(query)=>{
    let activeDonors = await ActiveDonor.aggregate([{
        $lookup: {
            from: 'donors',
            localField: 'donorId',
            foreignField: '_id',
            as: 'donorDetails'
        },
    },
        {
            $addFields: {
                donorDetails: {$first: "$donorDetails"},
            }
        },
        {
            $project: {
                markerId: 1,
                _id: "$donorDetails._id",
                hall: "$donorDetails.hall",
                name: "$donorDetails.name",
                address: "$donorDetails.address",
                comment: "$donorDetails.comment",
                lastDonation: "$donorDetails.lastDonation",
                availableToAll: "$donorDetails.availableToAll",
                bloodGroup: "$donorDetails.bloodGroup",
                studentId: "$donorDetails.studentId",
                phone: "$donorDetails.phone",
                markedTime: "$time",
            }
        },
        {
            $match: query
        },
        {
            $lookup: {
                from: 'donors',
                localField: 'markerId',
                foreignField: '_id',
                as: 'markerDetails'
            }
        },
        {
            $addFields: {
                "markerName": {$first: "$markerDetails.name"},
            }
        },
        {
            $lookup: {
                from: 'donations',
                localField: '_id',
                foreignField: 'donorId',
                as: 'donations'
            },
        },
        {
            $lookup: {
                from: 'callrecords',
                localField: '_id',
                foreignField: 'calleeId',
                as: 'callRecords'
            }
        },
        {
            $addFields: {
                donationCount: {$size: "$donations"},
            }
        },
        {
            $addFields:{
                callRecordCount: {$size: "$callRecords"}
            }
        },
        {
            $project:{
                markerDetails: 0,
                markerId:0,
                donations: 0,
                callRecords: 0,
            }
        }
    ]);
    return{
        message: 'Active donors fetched with details',
        status:'OK',
        data: activeDonors
    }
}

module.exports = {
    add,
    remove,
    findByDonorId,
    findByQueryAndPopulate
}

