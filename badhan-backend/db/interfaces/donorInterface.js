const {Donor} = require('../models/Donor');

const insertDonor = async (donorObject) => {
    try {
        let donor = new Donor(donorObject);
        let data = await donor.save();

        if (data.nInserted === 0) {
            return {
                message: 'Donor insertion failed',
                status: 'ERROR',
                data: data,
            }
        } else {
            return {
                message: 'Donor insertion successful',
                status: 'OK',
                data: data,
            };
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
};


const deleteDonor = async (donorID) => {
    try {
        let data = await Donor.findOneAndDelete({_id: donorID});
        if (data) {
            return {
                message: 'Donor removed successfully',
                status: 'OK'
            }
        } else {
            return {
                message: 'Could not remove donor',
                status: 'ERROR'
            }
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};

const deleteDonorByPhone = async (donorPhone) => {
    try {
        let data = await Donor.findOneAndDelete({phone: donorPhone});
        if (data) {
            return {
                message: 'Donor removed successfully',
                status: 'OK'
            }
        } else {
            return {
                message: 'Could not remove donor',
                status: 'ERROR'
            }
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};

const deleteDonorById = async (donorId) => {
    try {
        let data = await Donor.findOneAndDelete({_id: donorId});
        if (data) {
            return {
                message: 'Donor removed successfully',
                status: 'OK'
            }
        } else {
            return {
                message: 'Could not remove donor',
                status: 'ERROR'
            }
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};

const findDonorByQuery = async (query, option) => {
    try {
        let data = await Donor.findOne(query, option);
        if (data) {
            return {
                data,
                message: 'Donor found',
                status: 'OK'
            }
        } else {
            return {
                data: null,
                message: 'Donor not found',
                status: 'ERROR'
            }
        }

    } catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};

const findDonorsByQuery = async (query, option) => {
    try {
        let data = await Donor.find(query, option);
        let message = data.length > 0 ? 'Donor(s) found' : 'Donor not found';
        return {
            data,
            message,
            status: 'OK'
        };
    } catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
};


const findDonorByIDAndUpdate = async (id, update) => {
    try {
        let data = await Donor.findByIdAndUpdate(id, update);

        if (data) {
            return {
                data,
                message: 'Donor updated successfully',
                status: 'OK'
            }
        } else {
            return {
                data: null,
                message: 'Donor update failed',
                status: 'ERROR'
            };
        }

    } catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'ERROR'
        };
    }
};

const findDonorAndUpdate = async (query, donorUpdate) => {
    try {
        let data = await Donor.findOneAndUpdate(query, donorUpdate, {
            returnOriginal: false
        });
        if (data) {
            return {
                data,
                status: 'OK',
                message: 'Donor updated successfully'
            };
        } else {
            return {
                status: 'ERROR',
                message: 'Donor not found'
            }
        }
    } catch (e) {
        return {
            status: 'EXCEPTION',
            message: e.message
        };
    }
}


module.exports = {
    insertDonor,
    deleteDonor,
    deleteDonorByPhone,
    deleteDonorById,
    findDonorByQuery,
    findDonorsByQuery,
    findDonorByIDAndUpdate,
    findDonorAndUpdate
}