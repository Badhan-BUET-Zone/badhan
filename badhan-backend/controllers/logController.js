const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
let gplay = require('google-play-scraper');

const handleGETOnlineCheck = async (req, res) => {
    return res.status(200).send("Badhan API is online")
}

const handleGETStatistics = async (req, res) => {
    try {
        let donorCount = await donorInterface.getCount();
        let donationCount = await donationInterface.getCount();
        let volunteerCount = await donorInterface.getVolunteerCount();
        return res.status(201).send({
            status: 'OK',
            message: 'Statistics fetched successfully',
            statistics: {
                donorCount: donorCount.data,
                donationCount: donationCount.data,
                volunteerCount: volunteerCount.data
            }
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

const handleGETAppVersion = (req, res, next) => {
    /*
    #swagger.description = 'Get app info deployed to play store' */
    gplay.app({appId: 'com.mmmbadhan'})
        .then((response) => {
            res.status(200).send(response)
        });
}

module.exports = {
    handleGETStatistics,
    handleGETOnlineCheck,
    handleGETAppVersion
}
