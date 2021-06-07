const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const donorInterface = require('../db/interfaces/donorInterface');

let handlePOSTLogIn = async (req, res) => {
    /*  #swagger.tags = ['User']
            #swagger.description = 'Endpoint to login a user.' */

    /* #swagger.parameters['logIn'] = {
               in: 'body',
               description: 'Phone number of a logging user.',
               schema:{
                phone: "8801521438557",
                password: "123456"
               }
      } */

    try {
        let donorPhone = req.body.phone;
        let password = req.body.password;
        let donorQueryResult = await donorInterface.findDonorByQuery({phone: donorPhone}, {});


        if (donorQueryResult.status !== 'OK') {
            /* #swagger.responses[401] = {
               schema: {
                    status: 401,
                    message: 'Donor not found',
                },
               description: 'When the donor is not found'
        } */
            return res.status(401).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let matched;

        try {
            matched = await bcrypt.compare(password, donor.password);
        } catch (e) {
            return res.status(401).send({
                status: "ERROR",
                message: "You do not have an account",
            });
        }


        if (matched) {
            let access = 'auth';
            let token = await jwt.sign({
                _id: donor._id.toString(),
                access
            }, process.env.JWT_SECRET).toString();


            donor.tokens.push({access, token});

            await donor.save();

            /* #swagger.responses[201] = {
               schema: {
                    token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
                },
               description: 'A successful sign in returns a token for the user'
        } */
            return res.status(201).send({status: 'OK', message: "Successfully signed in", token: token});
        } else {
            /* #swagger.responses[401] = {
               schema: {
                    status: 'ERROR',
                    message: 'Incorrect phone / password'
                },
               description: 'When the user provides an invalid password'
            } */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Incorrect phone / password'
            });
        }
    } catch (e) {
        /* #swagger.responses[500] = {
               schema: {
                    status: 'EXCEPTION',
                    message: 'message generated from the backend caused by runtime error'
                },
               description: 'When the server malfunctions to the request body'
        } */
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
};

let handleAuthentication = async (req, res, next) => {
    try {
        let token = req.header('x-auth');
        let decodedDonor = await jwt.verify(token, process.env.JWT_SECRET);
        let donorQueryResult = await donorInterface.findDonorByQuery({_id: decodedDonor._id}, {});

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;

            let result = donor.tokens.find(obj => {
                return obj.token === token
            })

            if (result === undefined) {
                /* #swagger.responses[401] = {
               schema: {
                    status: 'ERROR',
                    message: 'User has been logged out'
                },
               description: 'If the token does not exist in database , the user might have logged out already.'
        } */
                return res.status(401).send({
                    status: 'ERROR',
                    message: 'User has been logged out'
                });
            }

            res.locals.middlewareResponse = {
                donor,
                token
            };
            return next();
        } else {
            /* #swagger.responses[401] = {
               schema: {
                   status: 'ERROR',
                message: 'Authentication failed. Invalid authentication token.'
                },
               description: 'This error will occur if the user does not exist'
        } */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Authentication failed. Invalid authentication token.'
            });
        }

    } catch (e) {
        /* #swagger.responses[500] = {
              schema: {
              status: 'ERROR',
           message: 'error message'
               },
              description: 'In case of internal server error user will receive an error message'
       } */
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
};

let handlePOSTLogOut = async (req, res) => {
    /*  #swagger.tags = ['User']
            #swagger.description = 'Endpoint to logout a user.' */

    try {
        let donor = res.locals.middlewareResponse.donor;
        let token = res.locals.middlewareResponse.token;

        await donorInterface.findDonorByIDAndUpdate(donor._id, {
            $pull: {
                tokens: {token}
            }
        });
        /* #swagger.responses[200] = {
               schema: {
               status: 'OK',
                message: 'Logged out successfully'
                },
               description: 'A successful sign out removes the token for the user'
        } */
        return res.status(200).send({
            status: 'OK',
            message: 'Logged out successfully'
        });
    } catch (e) {
        /* #swagger.responses[500] = {
               schema: {
               status: 'ERROR',
            message: 'error message'
                },
               description: 'In case of internal server error user will receive an error message'
        } */
        return res.status(500).send({
            status: 'ERROR',
            message: e.message
        });
    }
};

let handlePOSTLogOutAll = async (req, res) => {
    /*  #swagger.tags = ['User']
            #swagger.description = 'Endpoint to logout user from all devices.' */
    try {
        let donor = res.locals.middlewareResponse.donor;

        await donorInterface.findDonorByIDAndUpdate(donor._id, {
            $set: {
                tokens: []
            }
        });
        /* #swagger.responses[200] = {
               schema: {
               status: 'OK',
                message: 'Logged out from all devices successfully'
                },
               description: 'A successful sign out removes all the tokens of the user'
        } */
        return res.status(200).send({
            status: 'OK',
            message: 'Logged out from all devices successfully'
        });
    } catch (e) {
        /* #swagger.responses[500] = {
               schema: {
               status: 'ERROR',
            message: 'error message'
                },
               description: 'In case of internal server error user will receive an error message'
        } */
        return res.status(500).send({
            status: 'ERROR',
            message: e.message
        });
    }
};

let handlePOSTRequestRedirection = async (req, res) => {
    /*  #swagger.tags = ['User']
            #swagger.description = 'Endpoint to request a temporary redirection token' */
    try {
        let donor = res.locals.middlewareResponse.donor;
        let access = 'auth';
        // let token = await jwt.sign({
        //     _id: donor._id.toString(),
        //     access
        // }, process.env.JWT_SECRET).toString();
        let token = await jwt.sign({
            _id: donor._id.toString(),
            access
        }, process.env.JWT_SECRET,{ expiresIn: '30s' }).toString();


        donor.tokens.push({access, token});

        await donor.save();

        /* #swagger.responses[201] = {
               schema: {
                    status: 'OK',
                    message: 'Redirection token created',
                    token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
                },
               description: 'Redirection token created'
        } */
        return res.status(201).send({status: 'OK', message: "Redirection token created", token: token});
    } catch (e) {
        /* #swagger.responses[500] = {
               schema: {
               status: 'ERROR',
            message: 'error message'
                },
               description: 'In case of internal server error user will receive an error message'
        } */
        return res.status(500).send({
            status: 'ERROR',
            message: e.message
        });
    }

};

let handlePOSTRedirectedAuthentication = async (req, res) => {
    try {
        let token = req.body.token;
        let decodedDonor;
        try{
            decodedDonor = await jwt.verify(token, process.env.JWT_SECRET);
        }catch(e){
            /* #swagger.responses[401] = {
               schema: {
                   status: 'ERROR',
                message: 'Session Expired'
                },
               description: 'This error will occur if the jwt token is invalid'
        } */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Session Expired'
            });
        }

        let donorQueryResult = await donorInterface.findDonorByQuery({_id: decodedDonor._id}, {});

        if (donorQueryResult.status !== 'OK') {
            /* #swagger.responses[401] = {
               schema: {
                   status: 'ERROR',
                message: 'Authentication failed. Invalid authentication token.'
                },
               description: 'This error will occur if the user does not exist'
        } */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Authentication failed. Invalid authentication token.'
            });
        }


        let donor = donorQueryResult.data;

        let result = donor.tokens.find(obj => {
            return obj.token === token
        })

        if (result === undefined) {
            /* #swagger.responses[401] = {
           schema: {
                status: 'ERROR',
                message: 'User has been logged out'
            },
           description: 'If the token does not exist in database , the user might have logged out already.'
    } */
            return res.status(401).send({
                status: 'ERROR',
                message: 'User has been logged out'
            });
        }

        await donorInterface.findDonorByIDAndUpdate(donor._id, {
            $pull: {
                tokens: {token}
            }
        });

        let access = 'auth';
        let newToken = await jwt.sign({
            _id: donor._id.toString(),
            access
        }, process.env.JWT_SECRET).toString();
        donor.tokens.push({access, token: newToken});
        await donor.save();

        /* #swagger.responses[201] = {
               schema: {
                    status: 'OK',
                    message: 'Redirected login successful',
                    token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
                },
               description: 'Redirection token created'
        } */
        return res.status(201).send({status: 'OK', message: "Redirected login successful", token: newToken});

    } catch (e) {
        /* #swagger.responses[500] = {
               schema: {
               status: 'ERROR',
            message: 'error message'
                },
               description: 'In case of internal server error user will receive an error message'
        } */
        console.log(e);
        return res.status(500).send({
            status: 'ERROR',
            message: e.message
        });
    }

}

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

module.exports = {
    handlePOSTLogIn,
    handleAuthentication,
    handlePOSTLogOut,
    handlePOSTLogOutAll,
    handleSuperAdminCheck,
    handlePOSTRequestRedirection,
    handlePOSTRedirectedAuthentication
}
