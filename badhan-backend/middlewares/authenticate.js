const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const donorInterface = require('../db/interfaces/donorInterface');


let handlePOSTLogIn = async (req, res) => {
    try {
        let donorPhone = req.body.phone;
        let password = req.body.password;
        let donorQueryResult = await donorInterface.findDonorByQuery({phone: donorPhone}, {});


        if (donorQueryResult.status !== 'OK') {
            return res.status(401).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let matched = await bcrypt.compare(password, donor.password);

        if (matched) {
            let access = 'auth';
            let token = await jwt.sign({
                _id: donor._id.toString(),
                access
            }, 'lekhaporaputkirmoddhebhoiradimu').toString();
            donor.tokens.push({access, token});
            await donor.save();
            return res.status(201).send({token});
        } else {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Incorrect phone / password'
            });
        }
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
};

let handleAuthentication = async (req, res, next) => {
    try {
        let token = req.header('x-auth');
        let decodedDonor = await jwt.verify(token, 'lekhaporaputkirmoddhebhoiradimu');
        let donorQueryResult = await donorInterface.findDonorByQuery({_id: decodedDonor._id}, {});

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;
            res.locals.middlewareResponse = {
                donor,
                token
            };
            return next();
        } else {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Authentication failed. Invalid authentication token.'
            });
        }

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
};

let handlePOSTLogOut = async (req, res) => {
    try {
        let donor = res.locals.middlewareResponse.donor;
        let token = res.locals.middlewareResponse.token;

        await donorInterface.findDonorByIDAndUpdate(donor._id, {
            $pull: {
                tokens: {token}
            }
        });

        return res.status(200).send({
            status: 'OK',
            message: 'Logged out successfully'
        });
    } catch (e) {
        return res.status(500).send({
            status: 'ERROR',
            message: e.message
        });
    }
};

module.exports = {
    handlePOSTLogIn,
    handleAuthentication,
    handlePOSTLogOut
}
