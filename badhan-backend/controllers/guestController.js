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
        name: "Guest Account",
        studentId: 1605011,
        lastDonation: 0,
        bloodGroup: 2,
        hall: 7,
        roomNumber: "3009",
        address: "Azimpur",
        comment: "This person has diabetes",
        designation: 3
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
            studentId: 1605011,
            lastDonation: 0,
            bloodGroup: 2,
            address: "Azimpur",
            donationCount: 2,
            roomNumber: "307",
            comment: "Developer of Badhan"
        }, {
            _id: "sgherjknfb",
            phone: 8801521444444,
            name: "Sumaiya Azad",
            studentId: 1705048,
            lastDonation: 1615507200000,
            bloodGroup: 0,
            address: "Banani",
            donationCount: 4,
            roomNumber: "E-892",
            comment: "Full Stack developer"
        }, {
            _id: "dfjhgotnkjgh",
            phone: 8801621478996,
            name: "Atiqur Rahman Shuvo",
            studentId: 1605041,
            lastDonation: 0,
            bloodGroup: 3,
            address: "Azimpur Colony",
            donationCount: 0,
            roomNumber: "E-206",
            comment: "Backend developer"
        }, {
            _id: "edswhweoirn",
            phone: 8801711111111,
            name: "Aniruddha GS",
            studentId: 1605031,
            lastDonation: 1615334400000,
            bloodGroup: 3,
            address: "Azimpur Colony",
            donationCount: 0,
            roomNumber: "E-206",
            comment: "Backend developer"
        }, {
            _id: "tgfdhklntlnb",
            phone: 8801452147889,
            name: "MH Rahat",
            studentId: 1806058,
            lastDonation: 1615334400000,
            bloodGroup: 3,
            address: "BUET Hall",
            donationCount: 3,
            roomNumber: "899",
            comment: "Tester"
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
        name: "Jhon Doe",
        studentId: 1605011,
        lastDonation: 0,
        bloodGroup: 2,
        hall: 3,
        roomNumber: "3009",
        address: "Azimpur Dhaka",
        comment: "Has high blood pressure",
        designation: 1
    }

    return res.status(200).send({
        status: 'OK',
        message: 'Successfully fetched donor details',
        donor: obj
    });
};

const handlePOSTViewVolunteers = async (req, res) => {
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

const handleGETSeeHistory = async (req, res) => {
    let donations = [1611100800000, 1558051200000, 1557964800000, 1546300800000];

    return res.status(200).send({
        status: 'OK',
        message: 'Donations queried successfully',
        donations
    });
}

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
    let object = [
        {
            "_id": "fdogirehognrebk",
            name: "Mit Majumder",
            hall: 2,
            date: 1622090693113,
            editedObject: {
                _id: "60af292680015defd72",
                address: "Mohammadpur ",
                bloodGroup: 2,
                comment: null,
                designation: 0,
                donationCount: 0,
                hall: 8,
                lastDonation: 1622073600000,
                name: "Md. Rafat Hossain ",
                phone: 8801521347889,
                roomNumber: "TH-3012",
                studentId: "1516256",
            },
            operation: "EDIT COMMENT"
        },
        {
            "_id": "fdogirehognfherhrerebk",
            name: "Sumit Haoladar",
            hall: 2,
            date: 1622090673113,
            editedObject: {
                _id: "60af2926580015defd72",
                address: "Azimpur ",
                bloodGroup: 4,
                comment: "Diabetes",
                designation: 1,
                donationCount: 2,
                hall: 8,
                lastDonation: 1622173600000,
                name: "Md. Rifat Hossain ",
                phone: 8801521789665,
                roomNumber: "12",
                studentId: "1517480",
            },
            operation: "EDIT DONOR"
        },
        {
            _id: "fdorehognrebk",
            name: "Mahir Majumder",
            hall: 3,
            date: 1627090693113,
            editedObject: {
                _id: "60af2926387858001d72",
                address: "Ramna ",
                bloodGroup: 4,
                comment: null,
                designation: 1,
                donationCount: 7,
                hall: 3,
                lastDonation: 1672073600000,
                name: "Md. Arafat Chowdhury ",
                phone: 8801521896554,
                roomNumber: "TH",
                studentId: "1716007",
            },
            operation: "DELETE DONATION"
        },
        {
            _id: "fdogirehognrebk",
            name: "Mir Maha",
            hall: 1,
            date: 1622090697113,
            editedObject: {
                _id: "ihuydtrxgfvjhb",
                address: "Gazimpur",
                bloodGroup: 2,
                comment: null,
                designation: 1,
                donationCount: 0,
                hall: 6,
                lastDonation: 1622073600000,
                name: "Hossain ",
                phone: 8801521471445,
                roomNumber: "3012",
                studentId: "1816007",
            },
            operation: "EDIT COMMENT"
        },
        {
            _id: "4987iugytfuhvhgc",
            name: "Sumit Majumder",
            hall: 3,
            date: 1622090693123,
            editedObject: {
                _id: "60af2926385defd72",
                address: "Mohammadpur Azimpur",
                bloodGroup: 7,
                comment: "HElloo",
                designation: 0,
                donationCount: 2,
                hall: 8,
                lastDonation: 1622173600000,
                name: "Abul Hossain ",
                phone: 8801521874558,
                roomNumber: "TH-12",
                studentId: "1506007",
            },
            operation: "EDIT PASSWORD"
        },
        {
            _id: "fdogirehognhmjy,u,rebk",
            name: "Saman Majumder",
            hall: 3,
            date: 1622090683113,
            editedObject: {
                _id: "lknuivgytctrfc",
                address: "Savar",
                bloodGroup: 5,
                comment: "Cancer",
                designation: 1,
                donationCount: 0,
                hall: 8,
                lastDonation: 1622073600000,
                name: "Md. Hossain ",
                phone: 8801521478996,
                roomNumber: "309",
                studentId: "1916007",
            },
            operation: "EDIT COMMENT"
        },
    ];
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
    handlePOSTViewVolunteers,
    handlePOSTShowHallAdmins,
    handleGETSeeHistory,
    handlePOSTInsertDonation,
    handlePOSTDeleteDonation,
    handleGETStatistics,
    handleGETLogs,
    handleDELETELogs,
    handleGETViewAllVolunteers
}
