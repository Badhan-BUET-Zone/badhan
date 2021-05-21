const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');

const handleGETStatistics = async (req, res) => {

    try {
        let donorCount = await donorInterface.getCount();
        let donationCount = await donationInterface.getCount();
        let volunteerCount = await donorInterface.getVolunteerCount();

            return res.status(201).send({
                status: 'OK',
                message: 'Statistics fetched successfully',
                statistics:{
                    donorCount: donorCount.data,
                    donationCount: donationCount.data,
                    volunteerCount: volunteerCount.data
                }
            });

        //     return res.status(201).send({
        //         status: 'OK',
        //         message: 'New donor inserted successfully',
        //         newDonor: donorInsertionResult.data
        //     });
        // } else {
        //     return res.status(400).send({
        //         status: 'ERROR',
        //         message: 'New donor insertion unsuccessful'
        //     });
        // }
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

module.exports = {
    handleGETStatistics
}
