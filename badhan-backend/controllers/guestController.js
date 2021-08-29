const faker = require('../doc/faker');

let handlePOSTLogIn = async (req, res) => {
    return res.status(201).send({
        status: 'OK',
        message: "Guest sign in will not show actual nor accurate data",
        token: faker.getToken(),
    });
}

const handlePOSTViewDonorDetailsSelf = async (req, res) => {
    let callRecords = [];
    for (let i = 0; i < faker.getRandomIndex(1); i++) {
        callRecords.push({
                date: faker.getTimestamp(240),
                _id: faker.getId(),
                callerId: faker.getId(),
                calleeId: faker.getId(),
            }
        )
    }

    let obj = {
        _id: faker.getId(),
        phone: faker.getPhone(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        bloodGroup: faker.getBloodGroup(),
        hall: faker.getHall(),
        roomNumber: faker.getRoom(),
        address: faker.getAddress(),
        comment: faker.getComment(),
        commentTime: faker.getTimestamp(240),
        designation: 3,
        callRecords: callRecords,
        donations: faker.getDonations(),
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Successfully fetched donor details',
        donor: obj
    });
};

const handlePOSTInsertDonor = async (req, res) => {
    return res.status(201).send({
        status: 'OK',
        message: 'New donor inserted successfully',
        newDonor: {
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            designation: faker.getDesignation(),
            lastDonation: faker.getTimestamp(240),
            comment: faker.getComment(),
            commentTime: faker.getTimestamp(240),
            donationCount: faker.getDonationCount(),
            _id: faker.getId(),
            phone: faker.getPhone(),
            bloodGroup: faker.getBloodGroup(),
            hall: faker.getHall(),
            name: faker.getName(),
            studentId: faker.getStudentId(),
            availableToAll: faker.getBoolean(),
        }
    });

}

let handlePOSTLogOut = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Logged out successfully'
    });

};

let handlePOSTLogOutAll = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Logged out from all devices successfully'
    });

};

const handlePOSTSearchDonors = async (req, res) => {
    let filteredDonors = [];

    for (let i = 0; i < faker.getRandomIndex(50); i++) {
        let callRecords = [];
        for (let i = 0; i < faker.getRandomIndex(3); i++) {
            callRecords.push({
                    date: faker.getTimestamp(5),
                    _id: faker.getId(),
                    callerId: faker.getId(),
                    calleeId: faker.getId(),
                }
            )
        }

        filteredDonors.push({
            _id: faker.getId(),
            phone: faker.getPhone(),
            name: faker.getName(),
            studentId: faker.getStudentId(),
            hall: faker.getHall(),
            lastDonation: faker.getTimestamp(240),
            bloodGroup: faker.getBloodGroup(),
            address: faker.getAddress(),
            donationCount: faker.getDonationCount(),
            roomNumber: faker.getRoom(),
            comment: faker.getComment(),
            donationCountOptimized: faker.getDonationCount(),
            commentTime: faker.getTimestamp(240),
            callRecords: callRecords,
        })
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Donors queried successfully',
        filteredDonors
    });

};

const handlePOSTDeleteDonor = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Donor deleted successfully'
    });

}

const handlePOSTComment = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Comment posted successfully'
    });
}

const handlePOSTChangePassword = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: "Successfully created recovery link for user",
        token: faker.getToken(),
    });
};

const handlePOSTEditDonor = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Donor updated successfully'
    });
}

const handlePOSTPromote = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Target user promoted/demoted successfully'
    });
}

const handlePOSTChangeAdmin = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Successfully changed hall admin'
    });
};

const handleGETViewDonorDetails = async (req, res) => {

    let callRecords = [];
    for (let i = 0; i < faker.getRandomIndex(3); i++) {
        callRecords.push({
                date: faker.getTimestamp(240),
                _id: faker.getId(),
                callerId: {
                    designation: faker.getDesignation(),
                    _id: faker.getId(),
                    hall: faker.getHall(),
                    name: faker.getName(),
                },
                calleeId: faker.getId(),
            }
        )
    }
    let donations = [];
    for (let i = 0; i < faker.getRandomIndex(10); i++) {
        donations.push({
                date: faker.getTimestamp(240),
                _id: faker.getId(),
                phone: faker.getPhone(),
                donorId: faker.getId(),
            }
        )
    }
    let obj = {
        _id: faker.getId(),
        phone: faker.getPhone(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        lastDonation: faker.getTimestamp(240),
        bloodGroup: faker.getBloodGroup(),
        hall: faker.getHall(),
        roomNumber: faker.getRoom(),
        address: faker.getAddress(),
        comment: faker.getComment(),
        designation: faker.getDesignation(),
        donationCount: faker.getDonationCount(),
        commentTime: faker.getTimestamp(240),
        callRecords: callRecords,
        donations: donations,
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Successfully fetched donor details',
        donor: obj
    });
};

const handlePOSTViewVolunteersOfOwnHall = async (req, res) => {
    let volunteerList = [];
    for (let i = 0; i < faker.getRandomIndex(50); i++) {
        volunteerList.push({
            _id: faker.getId(),
            bloodGroup: faker.getBloodGroup(),
            name: faker.getName(),
            phone: faker.getPhone(),
            roomNumber: faker.getRoom(),
            studentId: faker.getStudentId(),
        })
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Volunteer list fetched successfully',
        volunteerList
    });

};

const handlePOSTShowHallAdmins = async (req, res) => {
    let admins = [];
    for (let i = 0; i <= 6; i++) {
        admins.push({
            _id: faker.getId(),
            hall: i,
            name: faker.getName(),
            phone: faker.getPhone(),
        })
    }
    return res.status(200).send({
        status: 'OK',
        message: 'Hall admin list fetched successfully',
        admins
    });
};

const handlePOSTInsertDonation = async (req, res) => {

    return res.status(200).send({
        status: 'OK',
        message: 'Donation inserted successfully'
    });
}

const handlePOSTDeleteDonation = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Successfully deleted donation'
    });
}

const handleGETStatistics = async (req, res) => {
    return res.status(201).send({
        status: 'OK',
        message: 'Statistics fetched successfully',
        statistics: {
            donorCount: faker.getRandomIndex(2600),
            donationCount: faker.getRandomIndex(1200),
            volunteerCount: faker.getRandomIndex(130)
        }
    });

}


const handleDELETELogs = async (req, res) => {
    return res.status(201).send({
        status: 'OK',
        message: 'All logs deleted successfully',
        logs: null
    });
}

const handleGETViewAllVolunteers = async (req, res) => {
    let object = [];
    for (let i = 0; i < faker.getRandomIndex(200); i++) {
        object.push({
            name: faker.getName(),
            hall: faker.getHall(),
            studentId: faker.getStudentId(),
            logCount: faker.getRandomIndex(20),
        })
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Successfully fetched donor details',
        data: object
    });
}

const handlePOSTCallRecord = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Call record insertion successful',
        callRecord: {
            date: faker.getTimestamp(),
            _id: faker.getId(),
            callerId: faker.getId(),
            calleeId: faker.getId(),
        }
    })
};

const handleDELETECallRecord = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'Call record deletion successful',
    });
};

const handleGETDonorsDuplicate = async (req, res) => {
    return res.status(200).send({
        status: 'OK',
        message: 'No duplicate donors found',
        found: false,
        donor: null,
    });
}

const handleGETLogs = async (req, res) => {
    let logs = [];
    for (let i = 0; i < faker.getRandomIndex(20); i++) {
        logs.push({
            dateString: faker.getFakeDateString(),
            count: faker.getRandomIndex(20)
        })
    }
    return res.status(200).send({
        status: 'OK',
        message: 'All logs fetched successfully',
        logs: logs
    });
}

const handleGETLogsByDateAndDonor = async (req, res) => {
    let logs = [];

    for(let i = 0 ; i < faker.getRandomIndex(20);i++){
        logs.push({
            _id: faker.getId(),
            date: faker.getTimestamp(2),
            operation: faker.getOperation(),
            details:{}
        })
    }

    return res.status(200).send({
        status: "OK",
        message: "Logs fetched by user and date",
        logs: logs
    })
}

const handleGETLogsByDate = async (req, res) => {
    let logs = [];
    for(let i = 0 ; i < faker.getRandomIndex(10);i++){
        logs.push({
            name: faker.getName(),
            donorId: faker.getId(),
            hall: faker.getHall(),
            count: faker.getRandomIndex(20)
        })
    }
    return res.status(200).send({
        status: "OK",
        message: "Logs fetched by date successfully",
        logs: logs
    });
}

const handlePATCHPassword = async (req,res)=>{
    return res.status(201).send({
        status: 'OK',
        message: 'Password changed successfully',
        token: faker.getToken(),
    });
}

module.exports = {
    handlePOSTLogIn,
    handlePOSTViewDonorDetailsSelf,
    handlePOSTSearchDonors,
    handlePOSTLogOut,
    handlePOSTLogOutAll,
    handlePOSTInsertDonor,
    handlePOSTDeleteDonor,
    handlePOSTComment,
    handlePOSTChangePassword,
    handlePOSTEditDonor,
    handlePOSTPromote,
    handlePOSTChangeAdmin,
    handleGETViewDonorDetails,
    handlePOSTViewVolunteersOfOwnHall,
    handlePOSTShowHallAdmins,
    handlePOSTInsertDonation,
    handlePOSTDeleteDonation,
    handleGETStatistics,
    handleGETLogs,
    handleDELETELogs,
    handleGETViewAllVolunteers,
    handlePOSTCallRecord,
    handleDELETECallRecord,
    handleGETDonorsDuplicate,
    handleGETLogsByDateAndDonor,
    handleGETLogsByDate,
    handlePATCHPassword

}
