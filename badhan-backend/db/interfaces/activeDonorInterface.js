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

module.exports = {
    add,
    remove,
    findByDonorId
}

