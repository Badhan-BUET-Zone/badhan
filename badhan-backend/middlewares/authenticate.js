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

//THIS ROUTE HAS BEEN DEPRECATED ON 30 JUNE 2021. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
let handlePOSTLogOut = async (req, res) => {
    /*  #swagger.tags = ['Deprecated']
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

let handleDeleteSignOut = async (req, res) => {
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
        }, process.env.JWT_SECRET, {expiresIn: '30s'}).toString();


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
    /*  #swagger.tags = ['User']
           #swagger.description = 'Route endpoint to redirect user from app to web.' */

    /* #swagger.parameters['logIn'] = {
                in: 'body',
                description: 'The temporary token generated by /user/requestRedirection',
                schema:{
                 token: "sdlfkhgoenguiehgfudsnbvsiugkb"
                }
       } */
    try {
        let token = req.body.token;
        // console.log(token)
        let decodedDonor;
        try {
            decodedDonor = await jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
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

let handleHallPermission = async (req, res, next) => {
    /*
    This middleware checks whether the targeted donor is accessible to the logged in user
     */
    let donorId;
    /*
    Makes sure that the targeted donor id is available in the request
     */
    if (req.body.donorId) {
        donorId = req.body.donorId
    } else if (req.query.donorId) {
        donorId = req.query.donorId
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
        /* #swagger.responses[400] = {
          schema: {
            status: 'ERROR',
            message: '(Query error message)'
           },
          description: 'When no donor with the specified donor id is found, user will get this error message'
        } */
        return res.status(404).send({
            status: "ERROR",
            message: "Donor not found"
        });
    }

    let donor = donorQueryResult.data;

    /*
    A super admin can access the data of any hall.
    Every hall admin and volunteer can only access data of their own halls along with the data of
    attached students and covid donors.
     */
    if (donor.hall <= 6
        && res.locals.middlewareResponse.donor.hall !== donor.hall
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

    res.locals.middlewareResponse.targetDonor = donor;
    return next();

}

module.exports = {
    handlePOSTLogIn,
    handleAuthentication,
    handlePOSTLogOut,
    handleDeleteSignOut,
    handlePOSTLogOutAll,
    handleHallAdminCheck,
    handleSuperAdminCheck,
    handleHallPermission,
    handleHigherDesignationCheck,
    handlePOSTRequestRedirection,
    handlePOSTRedirectedAuthentication,

}
