const {Donor} = require('../models/Donor');
const {cacheExpiryTime} = require('../mongoose');

const insertDonor = async (donorObject) => {
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
};

const deleteDonor = async (donorID) => {
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
};

const deleteDonorByPhone = async (donorPhone) => {
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
};


const deleteDonorById = async (donorId) => {
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
};
const fineDonorById = async (id) => {
    let data = await Donor.findById(id).cache(0);
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
}


const findDonorByQuery = async (query, option) => {
    let data = await Donor.findOne(query, option)
    // let data = await Donor.findOne(query, option);
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
};

const findDonorByPhone = async (phoneNumber) => {
    let data = await Donor.findOne({
        phone: phoneNumber
    });

    if (data) {
        return {
            data: data,
            message: 'Donor fetched successfully',
            status: 'OK'
        }
    }

    return {
        data: data,
        message: 'Donor not found',
        status: 'ERROR'
    }
}

const findAllVolunteers = async () => {
    let data = await Donor.find({
        designation: 1
    }, {
        name: 1,
        hall: 1,
        studentId: 1,
    }).populate({path: 'logCount'});
    return {
        data,
        message: 'Volunteers fetched successfully',
        status: 'OK'
    }
}


const findDonorsByQuery = async (query) => {
    let data = await Donor.find(query).populate({
        path: 'callRecords',
        select: {'_id': 1, 'date': 1, 'callerId': 1}
    }).populate({path: 'donationCountOptimized'}).sort({lastDonation: -1});
    let message = data.length > 0 ? 'Donor(s) found' : 'Donor not found';
    return {
        data,
        message,
        status: 'OK'
    };
};
const findDonorByIDAndUpdateCommentTime = async (id, commentTime) => {
    let data = await Donor.findByIdAndUpdate(id, {
        $set: {
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
}

const findDonorByIDAndUpdate = async (id, update) => {
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
};

const findDonorAndUpdate = async (query, donorUpdate) => {
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
}

const getCount = async () => {
    let donorCount = await Donor.countDocuments();
    return {
        message: "Fetched donor count",
        status: 'OK',
        data: donorCount
    }
}

const getVolunteerCount = async () => {
    let volunteerCount = await Donor.find({designation: 1}).countDocuments();
    return {
        message: "Fetched volunteer count",
        status: 'OK',
        data: volunteerCount
    }
}

const findAdmins = async (designation) => {
    let data = await Donor.find({designation}, {
        studentId: 1,
        name: 1,
        phone: 1,
        hall: 1,
    });
    let message = data.length > 0 ? 'Donor(s) found' : 'Donor not found';
    return {
        data,
        message,
        status: 'OK'
    };
}

const findVolunteersOfHall = async (hall) => {
    let data = await Donor.find({designation: 1, hall: hall}, {
        studentId: 1,
        name: 1,
        roomNumber: 1,
        bloodGroup: 1,
        phone: 1,
    });
    let message = data.length > 0 ? 'Donor(s) found' : 'Donor not found';
    return {
        data,
        message,
        status: 'OK'
    };
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
    findDonorByPhone,
    findDonorByIDAndUpdateCommentTime,
    fineDonorById,
    findAdmins,
    findVolunteersOfHall
}
