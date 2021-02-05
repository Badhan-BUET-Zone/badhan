const Donor = require('../models/Donor');



const generateAuthToken = async function() {
    const user = this;

    const token = await jwt.sign({ _id: user._id.toString() }, 'secretkey');

    user.tokens = [{ token }];
    await user.save();

    return token;
}

const authenticate = async function(token) {

    const donor = this;

    if (!donor) {
        throw new Error('User does not exist.');
    }

    if (donor.tokens[0].token !== token) {
        throw new Error('User is not authenticated.')
    }

    return donor;

}

const findByCredentials = async function(phone, password) {

    const donor = await Donor.findOne({ phone });

    if (!donor) {
        throw new Error('Unable to find donor with this phone number.');
    }

    if (password.localeCompare(donor.password) !== 0) {
        throw new Error(`Incorrect password ${password}`);
    }

    return donor;
}