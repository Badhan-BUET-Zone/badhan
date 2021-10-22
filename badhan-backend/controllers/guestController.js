const faker = require('../doc/faker');
const {OKResponse200, CreatedResponse201}= require('../response/successTypes');
const handlePOSTLogIn = async (req, res) => {
    return res.respond(new CreatedResponse201("Guest sign in will not show actual nor accurate data",{
        token: faker.getToken(),
    }))
}

const handlePOSTViewDonorDetailsSelf = async (req, res) => {
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
    }

    return res.respond(new OKResponse200('Successfully fetched donor details',{
        donor: obj
    }))
};

const handlePOSTInsertDonor = async (req, res) => {
    return res.respond(new CreatedResponse201('New donor inserted successfully',{
        newDonor: {
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            designation: faker.getDesignation(),
            lastDonation: faker.getTimestamp(240),
            comment: faker.getComment(),
            commentTime: faker.getTimestamp(240),
            _id: faker.getId(),
            phone: faker.getPhone(),
            bloodGroup: faker.getBloodGroup(),
            hall: faker.getHall(),
            name: faker.getName(),
            studentId: faker.getStudentId(),
            availableToAll: faker.getBoolean(),
        }
    }));
}

let handlePOSTLogOut = async (req, res) => {
    return res.respond(new OKResponse200('Logged out successfully'));
};

let handlePOSTLogOutAll = async (req, res) => {
    return res.respond(new OKResponse200('Logged out from all devices successfully'));
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
            roomNumber: faker.getRoom(),
            comment: faker.getComment(),
            donationCountOptimized: faker.getDonationCount(),
            commentTime: faker.getTimestamp(240),
            callRecords: callRecords,
        })
    }

    return res.respond(new OKResponse200('Donors queried successfully',{
        filteredDonors
    }));
};

const handlePOSTDeleteDonor = async (req, res) => {
    return res.respond(new OKResponse200('Donor deleted successfully'));
}

const handlePOSTComment = async (req, res) => {
    return res.respond(new OKResponse200('Comment posted successfully'));
}

const handlePOSTChangePassword = async (req, res) => {
    return res.respond(new OKResponse200("Successfully created recovery link for user",{
        token: faker.getToken(),
    }))
};

const handlePOSTEditDonor = async (req, res) => {
    return res.respond(new OKResponse200('Donor updated successfully'))
}

const handlePOSTPromote = async (req, res) => {
    return res.respond(new OKResponse200('Target user promoted/demoted successfully'));
}

const handlePOSTChangeAdmin = async (req, res) => {
    return res.respond(new OKResponse200('Successfully changed hall admin'));
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
    let publicContacts = [
        {
            bloodGroup: 2,
            _id: faker.getId(),
            donorId: faker.getId()
        },
        {
            bloodGroup: -1,
            _id: faker.getId(),
            donorId: faker.getId()
        }
    ];

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
        commentTime: faker.getTimestamp(240),
        callRecords: callRecords,
        donations: donations,
        publicContacts: publicContacts
    }

    return res.respond(new OKResponse200('Successfully fetched donor details',{
        donor: obj
    }));
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

    return res.respond(new OKResponse200('Volunteer list fetched successfully',{
        volunteerList
    }))

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
    return res.respond(new OKResponse200('Hall admin list fetched successfully',{
        admins
    }));
};

const handlePOSTInsertDonation = async (req, res) => {
    return res.respond(new CreatedResponse201('Donation inserted successfully',{
        newDonation: {
            "date": faker.getTimestamp(10),
            "_id": faker.getId(),
            "phone": faker.getPhone(),
            "donorId": faker.getId(),
        }
    }));
}

const handlePOSTDeleteDonation = async (req, res) => {
    return res.respond(new OKResponse200('Successfully deleted donation'));
}

const handleGETStatistics = async (req, res) => {
    return res.respond(new OKResponse200('Statistics fetched successfully',{
        statistics: {
            donorCount: faker.getRandomIndex(2600),
            donationCount: faker.getRandomIndex(1200),
            volunteerCount: faker.getRandomIndex(130)
        }
    }))
}


const handleDELETELogs = async (req, res) => {
    return res.respond(new OKResponse200('All logs deleted successfully'));
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

    return res.respond(new OKResponse200('Successfully fetched donor details',{
        data: object
    }))
}

const handlePOSTCallRecord = async (req, res) => {
    return res.respond(new OKResponse200('Call record insertion successful',{
        callRecord: {
            date: faker.getTimestamp(),
            _id: faker.getId(),
            callerId: faker.getId(),
            calleeId: faker.getId(),
            expireAt: "2021-11-21T09:28:52.764Z",
        }
    }))
};

const handleDELETECallRecord = async (req, res) => {
    return res.respond(new OKResponse200('Call record deletion successful',{
        deletedCallRecord: {
            date: faker.getTimestamp(10),
            _id: faker.getId(),
            callerId: faker.getId(),
            calleeId: faker.getId(),
            expireAt: "2021-11-21T09:28:52.764Z"
        }
    }));
};

const handleGETDonorsDuplicate = async (req, res) => {
    return res.respond(new OKResponse200('No duplicate donors found',{
        found: false,
        donor: null,
    }))
}

const handleGETLogs = async (req, res) => {
    let logs = [];
    for (let i = 0; i < faker.getRandomIndex(20); i++) {
        logs.push({
            dateString: faker.getFakeDateString(),
            count: faker.getRandomIndex(20)
        })
    }
    return res.respond(new OKResponse200('All logs fetched successfully',{
        logs
    }))
}

const handleGETLogsByDateAndDonor = async (req, res) => {
    let logs = [];

    for (let i = 0; i < faker.getRandomIndex(20); i++) {
        logs.push({
            _id: faker.getId(),
            date: faker.getTimestamp(2),
            operation: faker.getOperation(),
            details: {}
        })
    }
    return res.respond(new OKResponse200("Logs fetched by user and date",{
        logs
    }))
}

const handleGETLogsByDate = async (req, res) => {
    let logs = [];
    for (let i = 0; i < faker.getRandomIndex(10); i++) {
        logs.push({
            name: faker.getName(),
            donorId: faker.getId(),
            hall: faker.getHall(),
            count: faker.getRandomIndex(20)
        })
    }
    return res.respond(new OKResponse200("Logs fetched by date successfully",{
        logs
    }))
}

const handlePATCHPassword = async (req, res) => {
    return res.respond(new CreatedResponse201('Password changed successfully',{
        token: faker.getToken(),
    }))
}

const handlePOSTPublicContact = async (req, res) => {
    return res.respond(new CreatedResponse201('Public contact added successfully',{
        publicContact: {
            bloodGroup: 2,
            _id: faker.getId(),
            donorId: faker.getId(),
        }
    }))
}

const handleDELETEPublicContact = async (req, res) => {
    return res.respond(new OKResponse200('Public contact deleted successfully'));
}

const handleGETPublicContacts = async (req, res) => {
    let publicContacts = [];
    let contacts = [];

    for (let i = 0; i < 2; i++) {
        contacts.push({
            donorId: faker.getId(),
            phone: faker.getPhone(),
            name: faker.getName(),
            contactId: faker.getId()
        })
    }
    publicContacts.push({
        bloodGroup: -1,
        contacts: contacts
    });

    for (let i = 0; i < 4; i++) {
        contacts = [];
        for (let j = 0; j < 2; j++) {
            contacts.push({
                donorId: faker.getId(),
                phone: faker.getPhone(),
                name: faker.getName(),
                contactId: faker.getId()
            })
        }
        publicContacts.push({
            bloodGroup: i * 2,
            contacts: contacts
        })
    }

    return res.respond(new OKResponse200("All public contacts fetched successfully",{
        publicContacts
    }))
}

const handleGETDonorsDesignation = async (req, res) => {
    let volunteerList = [];
    let adminList = [];
    let superAdminList = [];

    for (let i = 0; i < 7; i++) {
        adminList.push({
            _id: faker.getId(),
            studentId: faker.getStudentId(),
            name: faker.getName(),
            phone: faker.getPhone(),
            hall: i,
        });
    }
    for (let i = 0; i < faker.getRandomIndex(50); i++) {
        volunteerList.push({
            roomNumber: faker.getRoom(),
            _id: faker.getId(),
            studentId: faker.getStudentId(),
            name: faker.getName(),
            bloodGroup: faker.getBloodGroup(),
            phone: faker.getPhone(),
        });
    }
    for (let i = 0; i < faker.getRandomIndex(20); i++) {
        superAdminList.push({
            _id: faker.getId(),
            studentId: faker.getStudentId(),
            name: faker.getName(),
            phone: faker.getPhone(),
            hall: faker.getHall(),
        });
    }

    return res.respond(new OKResponse200("All designated members fetched",{
        volunteerList,
        adminList,
        superAdminList
    }))
}

const handleGETLogins = (req, res) => {
    let logins = [
        {
            _id: faker.getId(),
            os: "Ubuntu 20.04.1",
            device: "Asus K550VX",
            browserFamily: "Firefox",
            ipAddress: "1.2.3.4"
        }, {
            _id: faker.getId(),
            os: "Windows 10",
            device: "Lenovo IP320S",
            browserFamily: "Chrome 98.2.5",
            ipAddress: "5.6.7.8",
        }, {
            _id: faker.getId(),
            os: "MacOS McMojave",
            device: "MacBook Pro",
            browserFamily: "Safari 100.2.3",
            ipAddress: "9.10.11.12"
        },
    ];

    let currentLogin = {
        _id: faker.getId(),
        os: "MacOS McMojave",
        device: "MacBook Pro",
        browserFamily: "Safari 100.2.3",
        ipAddress: "9.10.11.12"
    };

    return res.respond(new OKResponse200("Recent logins fetched successfully",{
        logins,
        currentLogin
    }))
}
const handleDELETELogins = (req, res) => {
    return res.respond(new OKResponse200('Logged out from specified device'));
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
    handlePATCHPassword,
    handleGETPublicContacts,
    handleDELETEPublicContact,
    handlePOSTPublicContact,
    handleGETDonorsDesignation,
    handleGETLogins,
    handleDELETELogins
}
