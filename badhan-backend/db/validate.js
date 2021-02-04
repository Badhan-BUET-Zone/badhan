const mongoose = require('mongoose');
const urlRegex = require('url-regex-safe');

const moment = require('moment');
moment().format();

const {isEmail, isMobilePhone} = require('validator');

const validateURL = (url) => {
    if (!urlRegex({exact: true}).test(url)) {
        throw new mongoose.Error('Invalid Image Url');
    }
}

const validateEmail = (email) => {
    if (!isEmail(email)) {
        throw new mongoose.Error('Invalid Email');
    }
}

const validatePhone = (phone) => {
    if (!isMobilePhone(phone)) {
        throw new mongoose.Error('Invalid Phone Number');
    }
}

const validateAge = (date) => {
    let now = moment();
    let birthDate = moment(date);
    let age = moment.duration(now.diff(birthDate)).asYears();

    if (age < 18) {
        throw new mongoose.Error('User must be at least 18 year old');
    }
}

const validateCoords = (coordinates) => {
    // longitude must be within bounds
    if (coordinates.lng > 180 || coordinates.lng < -180) {
        throw new mongoose.Error('Invalid longitude');
    }
    // latitude must be within bounds
    if (coordinates.lat > 90 || coordinates.lat < -90) {
        throw new mongoose.Error('Invalid latitude');
    }
}

const validateMinMax = (object) => {
    if (object.min > object.max) {
        throw new mongoose.Error('Invalid Min Max Value');
    }
}

const validateString  = (string) => {
    if (string.trim().length === 0) {
        throw new mongoose.Error('String can not be empty');
    }
}

module.exports = {
    validateAge,
    validateEmail,
    validatePhone,
    validateURL,
    validateCoords,
    validateMinMax,
    validateString
}