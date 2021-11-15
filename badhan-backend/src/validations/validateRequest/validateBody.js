const {body} = require('express-validator');
const mongoose = require('mongoose');
const {checkEmail} = require('./others')

const validateBODYPhone = body('phone')
    .exists().withMessage('Phone number is required')
    .isLength({min:13,max:13}).withMessage('Phone number must be of 13 digits')
    .isNumeric().isInt().toInt().withMessage('Phone number must be integer');

const validateBODYBloodGroup = body('bloodGroup')
    .exists().withMessage('bloodGroup is required')
    .isInt().toInt().withMessage('bloodGroup must be integer')
    .isIn([0,1,2,3,4,5,6,7]).withMessage('Please input valid blood group from 0 to 7')

const validateBODYPublicContactBloodGroup = body('bloodGroup')
    .exists().withMessage('bloodGroup is required')
    .isInt().toInt().withMessage('bloodGroup must be integer')
    .isIn([-1,0,2,4,6]).withMessage('Please input valid blood group (-1,0,2,4,6)')


const validateBODYHall = body('hall')
    .exists().withMessage('hall is required')
    .isInt().toInt().withMessage('hall must be integer')
    .isIn([0,1,2,3,4,5,6,8]).withMessage('Please input an allowed hall number')

const validateBODYName = body('name')
    .exists().withMessage('name is required')
    .customSanitizer(value => {return String(value)}).escape().trim()
    .isLength({min:3,max:100}).withMessage('name must be between 3 and 100 characters');

const validateBODYStudentId = body('studentId')
    .exists().withMessage('studentId is required')
    .customSanitizer(value => String(value)).escape().trim()
    .isLength({min:7,max:7}).withMessage('studentId must be of 7 digits')
    .custom(value => [0,1,2,4,5,6,8,10,11,12,15,16,18].includes(parseInt(value.substr(2,2)))).withMessage("Please input a valid department number")
    .custom(value => {
        let inputYear = parseInt("20"+value.substr(0,2));
        return inputYear <= new Date().getFullYear() && inputYear >=2001;
    }).withMessage("Please input a valid batch between 01 and last two digits of current year")
    .isInt().withMessage('studentId must be integer');

const validateBODYPassword = body('password')
    .exists().not().isEmpty().withMessage('Password is required').customSanitizer(value => String(value))
    .trim().isLength({min:4}).withMessage('Password length must be more than 4')

const validateBODYComment = body('comment')
    .exists().not().isEmpty().withMessage('comment is required')
    .customSanitizer(value => String(value))
    .escape().trim().isLength({min:2,max:500}).withMessage('Comment length must be between 2 and 500');

const validateBODYDonationCount = body('extraDonationCount')
    .exists().withMessage('extraDonationCount is required')
    .isInt().toInt().withMessage('extraDonationCount must be an integer')
    .custom(value=>value < 99 && value >= 0).withMessage('Max extra donation count must be between 0 and 99')

const validateBODYAvailableToAll = body('availableToAll')
    .exists().withMessage('availableToAll is required')
    .isBoolean().toBoolean().withMessage("availableToAll must be boolean");

const validateBODYAddress = body('address')
    .exists().not().isEmpty().withMessage('address is required')
    .customSanitizer(value => String(value))
    .escape().trim().isLength({min:2,max:500}).withMessage('Address length must be between 2 and 500');

const validateBODYRoomNumber = body('roomNumber')
    .exists().not().isEmpty().withMessage('roomNumber is required')
    .customSanitizer(value => String(value))
    .escape().trim().isLength({min:2,max:500}).withMessage('roomNumber length must be between 2 and 500');

const validateBODYDonorId = body('donorId')
    .exists().withMessage('donorId is required')
    .customSanitizer(value => String(value))
    .escape().trim().custom(donorId=>mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId');

const validateBODYPromoteFlag = body('promoteFlag')
    .exists().withMessage('promoteFlag is required')
    .isBoolean().toBoolean().withMessage("promoteFlag must be boolean");

const validateBODYDate = body('date')
    .exists().not().isEmpty().withMessage('date is required')
    .isInt().toInt().withMessage('date must be integer')

const validateBODYEmail = body('email')
    .exists().withMessage('email is required')
    .customSanitizer(value => String(value)).escape().trim()
    .custom((email)=>{
        if(email===""){
            return true;
        }
        return checkEmail(email);
    }).withMessage("email is not valid");

module.exports={
    validateBODYPhone,
    validateBODYHall,
    validateBODYBloodGroup,
    validateBODYName,
    validateBODYStudentId,
    validateBODYPassword,
    validateBODYComment,
    validateBODYDonationCount,
    validateBODYAvailableToAll,
    validateBODYAddress,
    validateBODYRoomNumber,
    validateBODYDonorId,
    validateBODYPromoteFlag,
    validateBODYDate,
    validateBODYEmail,
    validateBODYPublicContactBloodGroup
}
