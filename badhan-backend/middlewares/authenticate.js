const jwt = require('jsonwebtoken');
const donorInterface = require('../db/interfaces/donorInterface');
const tokenInterface = require('../db/interfaces/tokenInterface');


let handleAuthentication = async (req, res, next) => {
    /*
    #swagger.auto = false
     */
    try {
        let token = req.header('x-auth');

        let decodedDonor;

        try {
            decodedDonor = await jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Malformed authentication token'
            });
        }

        let tokenCheckResult = await tokenInterface.findTokenDataByToken(token);

        if (tokenCheckResult.status !== 'OK') {
            return res.status(401).send({
                status: 'ERROR',
                message: 'You have been logged out'
            });
        }

        let tokenData = tokenCheckResult.data;

        let findDonorResult = await donorInterface.findDonorByQuery({_id: tokenData.donorId});

        if (findDonorResult.status !== 'OK') {
            return res.status(401).send({
                status: 'ERROR',
                message: 'No user found associated with token'
            });
        }

        let donor = findDonorResult.data;

        if (!donor._id.equals(decodedDonor._id)) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Invalid token'
            });
        }

        res.locals.middlewareResponse = {
            donor,
            token
        };
        return next();
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
};


let handleSuperAdminCheck = async (req, res, next) => {
    if (res.locals.middlewareResponse.donor.designation === 3) {
        return next();
    } else {
        return res.status(401).send({
            status: 'ERROR',
            message: 'You are not permitted to access this route'
        });
    }
}

let handleHallAdminCheck = async (req, res, next) => {
    if (res.locals.middlewareResponse.donor.designation < 2) {
        /* #swagger.responses[401] = {
                schema: {
                status: 'ERROR',
                message: 'error message'
                },
               description: 'This error will appear if anyone below the designation of hall admin tries to access this route. This middleware assumes that the handleHallPermission middleware is used before and along with this middleware'
        } */
        return res.status(401).send({
            status: 'ERROR',
            message: 'You are not permitted to access this route'
        });
    }
    next();
}

let handleHigherDesignationCheck = async (req, res, next) => {
    if (res.locals.middlewareResponse.donor.designation < res.locals.middlewareResponse.targetDonor.designation
        && res.locals.middlewareResponse.donor._id !== res.locals.middlewareResponse.targetDonor._id
    ) {
        /* #swagger.responses[401] = {
                schema: {
                status: 'ERROR',
                message: 'You cannot modify the details of a Badhan member with higher designation'
                },
               description: 'This middleware is used to block the manipulation of data of a member with higher designation'
        } */
        return res.status(401).send({
            status: 'ERROR',
            message: 'You cannot modify the details of a Badhan member with higher designation'
        });
    }
    next();
}

let handleFetchTargetDonor = async (req, res, next) => {
    /*
    This middleware checks whether the targeted donor is accessible to the logged in user
     */
    let donorId;
    /*
    Makes sure that the targeted donor id is available in the request
     */
    let request = req;

    if (request.body.donorId) {
        donorId = request.body.donorId
    } else if (request.query.donorId) {
        donorId = request.query.donorId
    } else {
        /* #swagger.responses[400] = {
           schema: {
                status: 'ERROR',
                message: 'Donor ID not specified'
            },
           description: 'This error will occur if the donor id in body nor param is not found'
    } */
        return res.status(400).send({
            status: 'ERROR',
            message: 'Donor ID not specified'
        });
    }

    let donorQueryResult = await donorInterface.findDonorByQuery({
        _id: donorId
    });

    if (donorQueryResult.status !== 'OK') {
        /* #swagger.responses[404] = {
          schema: {
            status: 'ERROR',
            message: "Donor not found"
           },
          description: 'When no donor with the specified donor id is found, user will get this error message'
        } */
        return res.status(404).send({
            status: "ERROR",
            message: "Donor not found"
        });
    }

    res.locals.middlewareResponse.targetDonor = donorQueryResult.data;

    return next();
}

let handleHallPermissionOrCheckAvailableToAll = async (req, res, next) => {
    let targetDonor = res.locals.middlewareResponse.targetDonor;

    if (targetDonor.availableToAll) {
        return next();
    }

    await handleHallPermission(req, res, next);

}

let handleHallPermission = async (req, res, next) => {
    /*
    A super admin can access the data of any hall.
    Every hall admin and volunteer can only access data of their own halls along with the data of
    attached students and covid donors.
     */

    let targetDonor = res.locals.middlewareResponse.targetDonor
    if (targetDonor.hall <= 6
        && res.locals.middlewareResponse.donor.hall !== targetDonor.hall
        && res.locals.middlewareResponse.donor.designation !== 3) {
        /* #swagger.responses[401] = {
          schema: {
            status: 'ERROR',
            message: 'You are not authorized to access this donor'
           },
          description: 'The user is trying to access or modify data of a different hall'
        } */
        return res.status(401).send({
            status: 'ERROR',
            message: 'You are not authorized to access a donor of different hall'
        });
    }
    return next();

}

module.exports = {
    //CHECK PERMISSIONS
    handleAuthentication,
    handleHallAdminCheck,
    handleSuperAdminCheck,
    handleHallPermission,
    handleHigherDesignationCheck,
    handleFetchTargetDonor,
    handleHallPermissionOrCheckAvailableToAll
}
