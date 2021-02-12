const {Donation} = require('../models/Donation');

const insertDonation = async (donationObject) => {
    try {
        let donation = new Donation(donationObject);
        let data = await donation.save();

        if (data.nInserted === 0){
            return {
                message: 'Donation insertion failed',
                status: 'ERROR'
            }
        } else {
            return {
                message: 'Donation insertion successful',
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


const deleteDonation = async (donationID) => {
    try {
        let data = await Donation.findOneAndDelete({_id: donationID});
        if (data){
            return {
                message: 'Donation removed successfully',
                status: 'OK'
            }
        } else {
            return {
                message: 'Could not remove donation',
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
const deleteDonationByQuery = async (query) => {
    try {
        let data = await Donation.findOneAndDelete(query);
        if (data){
            return {
                message: 'Donation removed successfully',
                status: 'OK'
            }
        } else {
            return {
                message: 'Could not remove donation',
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

const findDonationByQuery = async (query, option) => {
    try {
        let data = await Donation.findOne(query, option);
        if (data){
            return {
                data,
                message: 'Donation found',
                status: 'OK'
            }
        } else {
            return {
                data: null,
                message: 'Donation not found',
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

const findDonationsByQuery = async (query, option) => {
    try {
        let data = await Donation.find(query, option);
        let message = data.length > 0 ? 'Donation(s) found' : 'Donation not found';
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


module.exports = {
    insertDonation,
    deleteDonation,
    findDonationByQuery,
    findDonationsByQuery,
    deleteDonationByQuery
}