const {PublicBookmark} = require('../models/PublicBookmark');

const add = async (donorId, markerId) => {
    let addedBookmark = new PublicBookmark({donorId, markerId});
    let data = await addedBookmark.save();
    if (data.nInserted === 0) {
        return {
            message: 'Public bookmark insertion failed',
            status: 'ERROR'
        }
    }
    return {
        data,
        message: 'Public bookmark insertion successful',
        status: 'OK'
    };
};

const remove = async(donorId)=>{
    let removedPublicBookmark = await PublicBookmark.findOneAndDelete({donorId});
    if(removedPublicBookmark){
        return{
            data:removedPublicBookmark,
            message:'Public bookmark removed successfully',
            status: 'OK'
        }
    }

    return{
        message: 'Public bookmark not found',
        status: 'ERROR'
    }
}

const findByDonorId= async (donorId)=>{
    let publicBookmarks = await PublicBookmark.find({donorId});
    if(publicBookmarks.length===0){
        return {
            message: 'Public bookmark not found',
            status: 'ERROR',
        }
    }
    return{
        data:publicBookmarks,
        status:'OK',
        message:'Public bookmark found'
    }
}

module.exports = {
    add,
    remove,
    findByDonorId
}

