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
                data,
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

const findDonorsByPhone = async (phoneNumber)=>{
    try{
        let data = await Donor.find({
            phone: phoneNumber
        });
        return {
            donors: data,
            message: 'Donor fetched successfully',
            status: 'OK'
        }
    }catch(e){
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
}

const findAllVolunteers = async () => {
    try {
        let data = await Donor.find({
            designation: 1
        },{
            name: 1,
            hall: 1,
            studentId: 1,
        });
        return {
            data,
            message: 'Volunteers fetched successfully',
            status: 'OK'
        }
    } catch (e) {
        return {
            data: null,
            message: e.message,
            status: 'EXCEPTION'
        }
    }
}


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
const findDonorByIDAndUpdateCommentTime = async (id, commentTime)=>{
    try {
        let data = await Donor.findByIdAndUpdate(id, {
            $set:{
                commentTime
            }
        });

        if (data) {
            return {
                data,
                message: 'Comment time updated successfully',
                status: 'OK'
            }
        } else {
            return {
                data: null,
                message: 'Comment time update failed',
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
}

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

const getCount = async () => {
    try {
        let donorCount = await Donor.count();
        return {
            message: "Fetched donor count",
            status: 'OK',
            data: donorCount
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}

const getVolunteerCount = async () => {
    try {
        let volunteerCount = await Donor.find({designation: 1}).count();
        return {
            message: "Fetched volunteer count",
            status: 'OK',
            data: volunteerCount
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
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
    findDonorAndUpdate,
    getCount,
    getVolunteerCount,
    findAllVolunteers,
    findDonorsByPhone,
    findDonorByIDAndUpdateCommentTime
}
