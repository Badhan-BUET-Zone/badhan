const {PublicContact} = require('../models/PublicContacts');

const insertPublicContact = async (donorId, bloodGroup) => {
    try {
        let publicContact = new PublicContact({donorId, bloodGroup});
        let data = await publicContact.save();

        if (data.nInserted === 0) {
            return {

                message: 'Public contact insertion failed',
                status: 'ERROR'
            }
        } else {
            return {
                data,
                message: 'Public contact insertion successful',
                status: 'OK'
            };
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'ERROR'
        }
    }
};

const deletePublicContactById = async (publicContactId) => {
    try {
        let data = await PublicContact.findByIdAndDelete(publicContactId);
        if (data) {
            return {
                message: 'Public contact removed successfully',
                status: 'OK',
                data
            }
        }
        return {
            message: 'Could not remove public contact',
            status: 'ERROR'
        }

    } catch (e) {
        return {
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};

const findPublicContactById = async (publicContactId) => {
    try {
        let data = await PublicContact.findOne({
            _id: publicContactId
        });
        if (data) {
            return {
                data: data,
                message: 'Contact fetched successfully',
                status: 'OK'
            }
        }
        return {
            data: data,
            message: 'Contact not found',
            status: 'ERROR'
        }
    } catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
}

const findAllPublicContacts = async ()=>{
    try{
        let data = await PublicContact.find({}).populate({path:'donorId',select:{'_id':1,'name':1,'hall':1,'phone':1,'availableToAll':1}});
        return {
            data: data,
            message: 'All public contacts fetched',
            status: 'ERROR'
        }
    }catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
}

module.exports = {
    insertPublicContact,
    deletePublicContactById,
    findPublicContactById,
    findAllPublicContacts
}
