let handlePOSTLogIn = async (req, res) => {
    return res.status(201).send({
        status: 'OK',
        message: "Guest sign in will not show actual nor accurate data",
        token: "sdghweignsdiugviub"
    });
}

const handlePOSTViewDonorDetailsSelf = async (req, res) => {
    let obj = {
        _id: "sgrngsrdiobvhnroilgn",
        phone: 8801521438557,
        name: "Mir Mahathir Mohammad",
        studentId: "1605011",
        bloodGroup: 2,
        hall: 5,
        roomNumber: "3009",
        address: "Azimpur",
        comment: "Severe allergies",
        commentTime: 1625755390858,
        designation: 3,
        "callRecords": [
            {
                "date": 1628685342498,
                "_id": "6113c41e0b04d011c1abd6b4",
                "callerId": "5e901d56effc5900177ced73",
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:35:42.499Z",
                "__v": 0
            },
            {
                "date": 1628685347683,
                "_id": "6113c4230b04d011c1abd6b6",
                "callerId": "5e901d56effc5900177ced73",
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:35:47.684Z",
                "__v": 0
            },
            {
                "date": 1628685362852,
                "_id": "6113c4320b04d011c1abd6b8",
                "callerId": "5e901d56effc5900177ced73",
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:36:02.852Z",
                "__v": 0
            }
        ],
        "donations": [
            {
                "date": 1611100800000,
                "_id": "6113c3bfd743b90015c59190",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            },
            {
                "date": 1611100800000,
                "_id": "6113c3c3d743b90015c59192",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            },
            {
                "date": 161110080000000,
                "_id": "6113c4100b04d011c1abd6b2",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            }
        ],
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
        "newDonor": {
            "address": "(Unknown)",
            "roomNumber": "(Unknown)",
            "designation": 0,
            "lastDonation": 0,
            "comment": "(Unknown)",
            "commentTime": 0,
            "donationCount": 4,
            "_id": "6113c49024a9b0122ed5f445",
            "phone": 8801711203677,
            "bloodGroup": 1,
            "hall": 8,
            "name": "Mir Mahathir",
            "studentId": "1705147",
            "availableToAll": true,
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
    const filteredDonors = [
        {
            _id: "shotgnelnblk",
            phone: 8801521111111,
            name: "Mir Mahathir Mohammad",
            studentId: "1605011",
            lastDonation: 0,
            bloodGroup: 2,
            address: "Azimpur",
            donationCount: 2,
            roomNumber: "307",
            comment: "Developer of Badhan",
            "donationCountOptimized": 1,
            commentTime: 1625755390858,
            "callRecords": [
                {
                    "date": 1627575310398,
                    "_id": "6102d40eabcb9e00153a6ad0",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                },
                {
                    "date": 1628501246158,
                    "_id": "6110f4fe622b670015c0a05e",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                }
            ],
        }, {
            _id: "sgherjknfb",
            phone: 8801521444444,
            name: "Sumaiya Azad",
            studentId: "1705048",
            lastDonation: 1615507200000,
            bloodGroup: 0,
            address: "Banani",
            donationCount: 4,
            roomNumber: "E-892",
            comment: "Full Stack developer",
            "donationCountOptimized": 2,
            commentTime: 1625755390858,
            "callRecords": [
                {
                    "date": 1627575310398,
                    "_id": "6102d40eabcb9e00153a6ad0",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                },
                {
                    "date": 1628501246158,
                    "_id": "6110f4fe622b670015c0a05e",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                }
            ],
        }, {
            _id: "dfjhgotnkjgh",
            phone: 8801621478996,
            name: "Atiqur Rahman Shuvo",
            studentId: "1605041",
            lastDonation: 0,
            bloodGroup: 3,
            address: "Azimpur Colony",
            donationCount: 0,
            roomNumber: "E-206",
            comment: "Backend developer",
            "donationCountOptimized": 3,
            commentTime: 1625755390858,
            "callRecords": [
                {
                    "date": 1627575310398,
                    "_id": "6102d40eabcb9e00153a6ad0",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                },
                {
                    "date": 1628501246158,
                    "_id": "6110f4fe622b670015c0a05e",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                }
            ],
        }, {
            _id: "edswhweoirn",
            phone: 8801711111111,
            name: "Aniruddha GS",
            studentId: "1605031",
            lastDonation: 1615334400000,
            bloodGroup: 3,
            address: "Azimpur Colony",
            donationCount: 0,
            roomNumber: "E-206",
            comment: "Backend developer",
            "donationCountOptimized": 4,
            commentTime: 1625755390858,
            "callRecords": [
                {
                    "date": 1627575310398,
                    "_id": "6102d40eabcb9e00153a6ad0",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                },
                {
                    "date": 1628501246158,
                    "_id": "6110f4fe622b670015c0a05e",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                }
            ],
        }, {
            _id: "tgfdhklntlnb",
            phone: 8801452147889,
            name: "MH Rahat",
            studentId: "1806058",
            lastDonation: 1615334400000,
            bloodGroup: 3,
            address: "BUET Hall",
            donationCount: 3,
            roomNumber: "899",
            comment: "Tester",
            "donationCountOptimized": 5,
            commentTime: 1625755390858,
            "callRecords": [
                {
                    "date": 1627575310398,
                    "_id": "6102d40eabcb9e00153a6ad0",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                },
                {
                    "date": 1628501246158,
                    "_id": "6110f4fe622b670015c0a05e",
                    "callerId": "5e68514995b0367d81546aa5",
                    "calleeId": "5e6781006ecd148aa8cc76f9"
                }
            ],
        },
    ];

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
        message: 'Password changed successfully'
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

    let obj = {
        _id: "dslgjerngkjdshkj",
        phone: 8801521478996,
        name: "Mir Mahathir Mohammad",
        studentId: "1605011",
        lastDonation: 1611100800000,
        bloodGroup: 2,
        hall: 3,
        roomNumber: "3009",
        address: "Azimpur Dhaka",
        comment: "Has high blood pressure",
        designation: 1,
        donationCount: 3,
        commentTime: 1625755390858,
        "callRecords": [
            {
                "date": 1628685362852,
                "_id": "6113c4320b04d011c1abd6b8",
                "callerId": {
                    "designation": 3,
                    "_id": "5e901d56effc5900177ced73",
                    "hall": 5,
                    "name": "Mir Mahathir Mohammad",
                    "id": "5e901d56effc5900177ced73"
                },
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:36:02.852Z",
                "__v": 0
            },
            {
                "date": 1628685347683,
                "_id": "6113c4230b04d011c1abd6b6",
                "callerId": {
                    "designation": 3,
                    "_id": "5e901d56effc5900177ced73",
                    "hall": 5,
                    "name": "Mir Mahathir Mohammad",
                    "id": "5e901d56effc5900177ced73"
                },
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:35:47.684Z",
                "__v": 0
            },
            {
                "date": 1628685342498,
                "_id": "6113c41e0b04d011c1abd6b4",
                "callerId": {
                    "designation": 3,
                    "_id": "5e901d56effc5900177ced73",
                    "hall": 5,
                    "name": "Mir Mahathir Mohammad",
                    "id": "5e901d56effc5900177ced73"
                },
                "calleeId": "5e901d56effc5900177ced73",
                "expireAt": "2021-09-10T12:35:42.499Z",
                "__v": 0
            }
        ],
        "donations": [
            {
                "date": 161110080000000,
                "_id": "6113c4100b04d011c1abd6b2",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            },
            {
                "date": 1611100800000,
                "_id": "6113c3bfd743b90015c59190",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            },
            {
                "date": 1611100800000,
                "_id": "6113c3c3d743b90015c59192",
                "phone": 8801521438557,
                "donorId": "5e901d56effc5900177ced73",
                "__v": 0
            }
        ],
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Successfully fetched donor details',
        donor: obj
    });
};

const handlePOSTViewVolunteersOfOwnHall = async (req, res) => {
    let volunteerList = [
        {
            _id: "dskgjhwebkjsdbd",
            bloodGroup: 2,
            name: "John Doe",
            phone: 8801456987445,
            roomNumber: "409",
            studentId: "1610000",
        },
        {
            _id: "5e68514995b0367d81546b1e",
            bloodGroup: 2,
            name: "Saad",
            phone: 8801478965441,
            roomNumber: "1009",
            studentId: "1712000",
        },
        {
            _id: "gaeyneryeym",
            bloodGroup: 2,
            name: "Rakibul Hasnat",
            phone: 8801456985223,
            roomNumber: "789",
            studentId: "1818050"
        },
        {
            _id: "erymyuy,u",
            bloodGroup: 3,
            name: "Shakib Khan",
            phone: 8896541235774,
            roomNumber: "741",
            studentId: "1806050"
        },
        {
            _id: "eryneyy",
            bloodGroup: 2,
            name: "Michael Angelo",
            phone: 8802587412589,
            roomNumber: "963",
            studentId: "1706050"
        },
        {
            _id: "eryneyem",
            bloodGroup: 0,
            name: "Mohammad Salman",
            phone: 8801782445538,
            roomNumber: "874",
            studentId: "1604050"
        }
    ]

    return res.status(200).send({
        status: 'OK',
        message: 'Volunteer list fetched successfully',
        volunteerList
    });

};

const handlePOSTShowHallAdmins = async (req, res) => {

    let admins = [
        {
            _id: "reohrewoihgfsdn",
            hall: 0,
            name: "Salman Khan",
            phone: 8801521478996,
        },
        {
            _id: "5e6776c090b43cdb0ddf347a",
            hall: 1,
            name: "Md. Raihan",
            phone: 8805478965121,
        },
        {
            _id: "uthrgegef",
            hall: 2,
            name: "Ashraful Talukder",
            phone: 8802589632114,
        },
        {
            _id: "ukull",
            hall: 3,
            name: "Avijit",
            phone: 8801478547788,
        },
        {
            _id: "dwdgdhhhb",
            hall: 4,
            name: "Solaiman Talukder",
            phone: 8801235478547,
        },
        {
            _id: "uloyrgdfgdhery",
            hall: 5,
            name: "Podder Chakladar",
            phone: 8801254785669,
        },
        {
            _id: "trjutyiyjgdfer",
            hall: 6,
            name: "Oyshee Hasan",
            phone: 8801475869552,
        },
        {
            _id: "hdfxvcngjg",
            hall: 7,
            name: "Salman Chowdhury",
            phone: 8801459875412,
        },
        {
            _id: "fgewewqeqdsf",
            hall: 8,
            name: "Sakib Chowdhury",
            phone: 88547512547856,
        },
    ];

    return res.status(200).send({
        status: 'OK',
        message: 'Hall admin list fetched successfully',
        admins
    });
};

// const handleGETSeeHistory = async (req, res) => {
//     let donations = [1611100800000, 1558051200000, 1557964800000, 1546300800000];
//
//     return res.status(200).send({
//         status: 'OK',
//         message: 'Donations queried successfully',
//         donations
//     });
// }

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
            donorCount: 2600,
            donationCount: 1200,
            volunteerCount: 130
        }
    });

}

const handleGETLogs = async (req, res) => {
    let object = [];
    return res.status(201).send({
        status: 'OK',
        message: 'All logs fetched successfully',
        logs: object
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
    let object = [
        {
            name: "Maksudur Rahman",
            hall: 0,
            studentId: 1605011,
        },
        {
            name: "Rahman",
            hall: 0,
            studentId: 1605123,
        },
        {
            name: "Maksudur",
            hall: 0,
            studentId: 1606789,
        },
        {
            name: "Madhusudan Rahman",
            hall: 1,
            studentId: 1705757,
        },
        {
            name: "Maksudur Jalal",
            hall: 1,
            studentId: 1806753,
        },
        {
            name: "Hasan Rahman",
            hall: 2,
            studentId: 1905888,
        },
        {
            name: "Mahin Ahmed",
            hall: 2,
            studentId: 1806852,
        },
        {
            name: "Jalil Khan",
            hall: 2,
            studentId: 1705871,
        },
        {
            name: "Begum Rahman",
            hall: 2,
            studentId: 1606888,
        },
        {
            name: "Salli Rehma",
            hall: 3,
            studentId: 1505016,
        },
        {
            name: "Salman Khan",
            hall: 3,
            studentId: 1406711,
        },
        {
            name: "Makdur Rahan",
            hall: 3,
            studentId: 1506018,
        },
        {
            name: "Maksu Rahm",
            hall: 4,
            studentId: 1606881,
        },
        {
            name: "Masum Billa Rahman",
            hall: 4,
            studentId: 1705011,
        },
        {
            name: "Sayeed Rahman",
            hall: 4,
            studentId: 1805211,
        },
        {
            name: "Mahin Azad",
            hall: 4,
            studentId: 1905081,
        },
    ]
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
            date: 1625755390858,
            _id: '60e70f42055a83d88',
            callerId: "5e901d567ced73",
            calleeId: "5e68514546b0e",
        }
    })
};
//
// const handleGETCallRecords = async (req, res) => {
//     return res.status(200).send({
//         status: "OK",
//         message: "Call record fetch successful",
//         callRecord: [
//             {
//                 "date": 1625754390478,
//                 "_id": "60e76906b",
//                 "callerId": {
//                     _id:"5e901d56e0177ced73",
//                     name: "Mir Mahathir Mohammad",
//                     designation: 3,
//                     hall: 4
//                 },
//                 "calleeId": "5e6851546b0e",
//             },
//         ]
//
//     })
// };

const handleDELETESingleCallRecord = async (req, res) => {
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
    // handleGETSeeHistory,
    handlePOSTInsertDonation,
    handlePOSTDeleteDonation,
    handleGETStatistics,
    handleGETLogs,
    handleDELETELogs,
    handleGETViewAllVolunteers,
    handlePOSTCallRecord,
    // handleGETCallRecords,
    handleDELETESingleCallRecord,
    handleGETDonorsDuplicate
}
