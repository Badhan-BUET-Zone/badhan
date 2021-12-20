const tokenCache = require('../cache/tokenCache')
const dotenv = require('../dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const donorInterface = require('../db/interfaces/donorInterface')
const tokenInterface = require('../db/interfaces/tokenInterface')
const logInterface = require('../db/interfaces/logInterface')
const emailInterface = require('../db/interfaces/emailInterface')

const {
  InternalServerError500,
  NotFoundError404,
  UnauthorizedError401
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

const handlePOSTPasswordForgot = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['User']
        #swagger.description = 'Route if user forgets the password.'
        #swagger.parameters['signIn'] = {
            in: 'body',
            description: 'Phone number of user who forgot his/her password',
            schema: {
                phone: "8801521438557",
            }
        }

            #swagger.responses[404] = {
                schema: {
                    status: "ERROR",
                    statusCode: 404,
                    message: "Phone number not recognized/ Account not found/ No recovery email found for this phone number",
                },
                description: 'Error responses'
            }
            #swagger.responses[200] = {
                schema: {
                    status: "OK",
                    statusCode: 200,
                    message: "A recovery mail has been sent to your email address",
                },
                description: 'Success response'
            }
    */
  const phone = req.body.phone
  const queryByPhoneResult = await donorInterface.findDonorByPhone(phone)
  if (queryByPhoneResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Phone number not recognized'))
  }

  const donor = queryByPhoneResult.data
  const email = donor.email

  if (donor.designation === 0) {
    return res.respond(new NotFoundError404('Account not found'))
  }

  if (email === '') {
    return res.respond(new NotFoundError404('No recovery email found for this phone number'))
  }

  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Token insertion failed', 'found in handlePOSTPasswordForgot when tokenInterface.insertAndSaveToken'))
  }

  const emailHtml = emailInterface.generatePasswordForgotHTML(tokenInsertResult.data.token)

  const result = await emailInterface.sendMail(email, 'Password Recovery Email from Badhan', emailHtml)
  if (result.status !== 'OK') {
    return res.respond(new InternalServerError500(result.message, 'found in handlePOSTPasswordForgot when emailInterface.sendMail'))
  }

  await logInterface.addLog(donor._id, 'POST USERS PASSWORD FORGOT', {})

  return res.respond(new OKResponse200('A recovery mail has been sent to your email address'))
}

/**
 * @openapi
 * /users/signin:
 *   post:
 *     tags:
 *       - Users
 *     summary: Sign in route
 *     description: Sign in to Badhan Platform using phone and password
 *     requestBody:
 *       description: The JSON consisting of phone and password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: 8801521438557
 *               password:
 *                 type: string
 *                 example: 123456789
 *     responses:
 *       201:
 *         description: Donors queried successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Successfully signed in
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 *       404:
 *         description: When the donor is not found/ When the logging user does not have any account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Donor not found/ You do not have an account
 *       401:
 *         description: When the user provides an invalid password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Incorrect phone / password
 */
const handlePOSTSignIn = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['User']
        #swagger.description = 'Endpoint to login a user.'
        #swagger.parameters['signIn'] = {
            in: 'body',
            description: 'Phone number of a logging user.',
            schema: {
                phone: "8801521438557",
                password: "123456"
            }
        }
                #swagger.responses[404] = {
            schema: {
                status: "ERROR",
                statusCode: 404,
                message: 'Donor not found/ You do not have an account',
            },
            description: 'When the donor is not found/ When the logging user does not have any account'
        }

        #swagger.responses[401] = {
            schema: {
                status: 'ERROR',
                statusCode: 401,
                message: 'Incorrect phone / password'
            },
            description: 'When the user provides an invalid password'
        }
            #swagger.responses[201] = {
        schema: {
            "status": "OK",
            statusCode: 201,
            "message": "Successfully signed in",
            token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
        },
        description: 'A successful sign in returns a token for the user'
    }
        */

  const donorPhone = req.body.phone
  const password = req.body.password
  const donorQueryResult = await donorInterface.findDonorByQuery({ phone: donorPhone }, {})

  if (donorQueryResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Account not found'))
  }

  const donor = donorQueryResult.data

  let matched

  try {
    matched = await bcrypt.compare(password, donor.password)
  } catch (e) {
    return res.respond(new NotFoundError404('Account not found'))
  }

  if (!matched) {
    return res.respond(new UnauthorizedError401('Incorrect phone / password'))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Token insertion failed', 'found in handlePOSTSignIn when tokenInterface.addToken'))
  }
  // add new token to cache
  tokenCache.add(tokenInsertResult.data.token, donor)
  await logInterface.addLog(donor._id, 'POST USERS SIGNIN', {})
  return res.respond(new CreatedResponse201('Successfully signed in', {
    token: tokenInsertResult.data.token
  }))
}
/**
 * @openapi
 * /users/signout:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Sign out route
 *     description: Sign out user from Badhan Platform
 *     responses:
 *       200:
 *         description: A successful sign out removes the token for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
const handleDELETESignOut = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['User']
    #swagger.description = 'Endpoint to logout a user.'
    #swagger.security = [{
               "api_key": []
        }]
            #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Logged out successfully'
        },
        description: 'A successful sign out removes the token for the user'
    }
     */

  const token = res.locals.middlewareResponse.token
  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteTokenDataByToken(token, donor._id)
  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT', {})
  return res.respond(new OKResponse200('Logged out successfully'))
}
/**
 * @openapi
 * /users/signout/all:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Sign out all route
 *     description: Sign out user from all devices
 *     responses:
 *       200:
 *         description: Endpoint to logout user from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logged out from all devices successfully
 */
const handleDELETESignOutAll = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['User']
    #swagger.description = 'Endpoint to logout user from all devices.'
    #swagger.security = [{
               "api_key": []
        }]
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Logged out from all devices successfully'
                },
                description: 'A successful sign out removes all the tokens of the user'
            }
     */

  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteAllTokensByDonorId(donor._id)

  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT ALL', {})
  return res.respond(new OKResponse200('Logged out from all devices successfully'))
}
/**
 * @openapi
 * /users/redirection:
 *   post:
 *     tags:
 *       - Users
 *     summary: Redirection route
 *     description: Endpoint to request a temporary redirection token
 *     responses:
 *       201:
 *         description: Redirection token created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Redirection token created
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 */
const handlePOSTRedirection = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['User']
    #swagger.description = 'Endpoint to request a temporary redirection token'
    #swagger.security = [{
               "api_key": []
        }]
    #swagger.responses[201] = {
        schema: {
            status: 'OK',
            statusCode: 201,
            message: 'Redirection token created',
            token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
        },
        description: 'Redirection token created'
    }
     */

  const donor = res.locals.middlewareResponse.donor
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, '30s')

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenInsertResult.message, 'found in handlePOSTRedirection when tokenInterface.addToken'))
  }

  await logInterface.addLog(donor._id, 'POST USERS REDIRECTION', {})

  return res.respond(new CreatedResponse201('Redirection token created', {
    token: tokenInsertResult.data.token
  }))
}
/**
 * @openapi
 * /users/redirectio:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Patch redirection route
 *     description: Route endpoint to redirect user from app to web
 *     requestBody:
 *       description: The JSON consisting of the temporary token generated by /users/requestRedirection
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: dvsoigneoihegoiwsngoisngoiswgnbon
 *     responses:
 *       201:
 *         description: Redirection token created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Redirected login successful
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 *       404:
 *         description: This error will occur if the user does not exist/ This error will occur if the token does not exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Authentication failed. Invalid authentication token./ Token not found
 *       401:
 *         description: This error will occur if the jwt token is invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Session Expired
 */
const handlePATCHRedirectedAuthentication = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['User']
    #swagger.description = 'Route endpoint to redirect user from app to web.'
    #swagger.parameters['logIn'] = {
        in: 'body',
        description: 'The temporary token generated by /user/requestRedirection',
        schema: {
            token: "sdlfkhgoenguiehgfudsnbvsiugkb"
        }
    }
        #swagger.responses[401] = {
            schema: {
                status: 'ERROR',
                statusCode: 401,
                message: 'Session Expired'
            },
            description: 'This error will occur if the jwt token is invalid'
        }
     #swagger.responses[404] = {
            schema: {
                status: 'ERROR',
                statusCode: 404,
                message: 'Authentication failed. Invalid authentication token./ Token not found'
            },
            description: 'This error will occur if the user does not exist/ This error will occur if the token does not exist'
        }

            #swagger.responses[201] = {
                schema: {
                    status: 'OK',
                    statusCode: 201,
                    message: 'Redirected login successful',
                    token: "lksjaopirnboishbnoiwergnbsdiobhsiognkghesuiog"
                },
                description: 'Redirection token created'
            }
     */
  const token = req.body.token

  let decodedDonor
  try {
    decodedDonor = await jwt.verify(token, dotenv.JWT_SECRET)
  } catch (e) {
    return res.respond(new UnauthorizedError401('Session Expired'))
  }

  const donorQueryResult = await donorInterface.findDonorByQuery({ _id: decodedDonor._id }, {})

  if (donorQueryResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Donor not found'))
  }

  const donor = donorQueryResult.data

  const tokenDeleteResponse = await tokenInterface.deleteTokenDataByToken(token, donor._id)

  if (tokenDeleteResponse.status !== 'OK') {
    return res.respond(new NotFoundError404('Token not found'))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenInsertResult.message, 'found in handlePATCHRedirectedAuthentication when tokenInterface.addToken'))
  }
  await logInterface.addLog(donor._id, 'PATCH USERS REDIRECTION', {})

  return res.respond(new CreatedResponse201('Redirected login successful', {
    token: tokenInsertResult.data.token
  }))
}

const handlePATCHPassword = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['User']
    #swagger.description = 'Route endpoint to change password'
    #swagger.security = [{
               "api_key": []
        }]
    #swagger.parameters['passwordChange'] = {
        in: 'body',
        description: 'New Password',
        schema: {
            password: "mynewpassword"
        }
    }
        #swagger.responses[201] = {
        schema: {
            status: 'OK',
            statusCode: 201,
            message: 'Password changed successfully',
            token: 'dsgfewosgnwegnhw'
        },
        description: 'Successful password change done'
    }
*/

  const reqBody = req.body
  const donor = res.locals.middlewareResponse.donor
  donor.password = reqBody.password
  await donor.save()

  await tokenInterface.deleteAllTokensByDonorId(donor._id)
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH USERS PASSWORD', {})

  return res.respond(new CreatedResponse201('Password changed successfully', {
    token: tokenInsertResult.data.token
  }))
}

const handleGETLogins = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['User']
        #swagger.description = 'Endpoint to get recent logins'
        #swagger.security = [{
            "api_key": []
        }]

        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: 'Recent logins fetched successfully',
                logins: [
                    {
                        _id: 'dsgfewosgnwegnhw',
                        os: "Ubuntu 20.04.1",
                        device: "Asus K550VX",
                        browserFamily: "Firefox",
                        ipAddress: "1.2.3.4"
                    }
                ],
                currentLogin: {
                    _id: 'dsgfewosgnwegnhw',
                    os: "Ubuntu 20.04.1",
                    device: "Asus K550VX",
                    browserFamily: "Firefox",
                    ipAddress: "1.2.3.4"
                },
            },
            description: 'Success response'
        }

     */

  const user = res.locals.middlewareResponse.donor
  const token = res.locals.middlewareResponse.token
  const recentLoginsResult = await tokenInterface.findTokenDataExceptSpecifiedToken(user._id, token)

  const currentTokenDataResult = await tokenInterface.findTokenDataByToken(token)
  if (currentTokenDataResult.status !== 'OK') {
    return res.respond(new InternalServerError500(currentTokenDataResult.message, 'found in handleGETLogins when tokenInterface.findTokenDataByToken'))
  }

  const currentTokenData = JSON.parse(JSON.stringify(currentTokenDataResult.data))
  delete currentTokenData.token
  delete currentTokenData.expireAt
  delete currentTokenData.donorId
  delete currentTokenData.__v

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET USERS LOGINS', {})
  return res.respond(new OKResponse200('Recent logins fetched successfully', {
    logins: recentLoginsResult.data,
    currentLogin: currentTokenData
  }))
}

const handleDELETELogins = async (req, res) => {
  /*
#swagger.auto = false
#swagger.tags = ['User']
#swagger.description = 'Endpoint to delete a login from device'
#swagger.security = [{
               "api_key": []
        }]
 #swagger.parameters['tokenId'] = {
        description: 'ID of token to be deleted',
        type: 'string',
        name: 'tokenId',
        in: 'param'
    }

    #swagger.responses[404] = {
        schema: {
            status: 'ERROR',
            statusCode: 404,
            message: 'Login information not found'
        },
        description: 'Token with specified ID was not found in database'
    }
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Logged out from specified device',
        },
        description: 'Success response'
    }
*/

  const deletedTokenResult = await tokenInterface.deleteByTokenId(req.params.tokenId)
  if (deletedTokenResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Login information not found'))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE USERS LOGINS', {})
  return res.respond(new OKResponse200('Logged out from specified device'))
}

module.exports = {
  // TOKEN HANDLERS
  handlePOSTSignIn,
  handleDELETESignOut,
  handleDELETESignOutAll,
  handlePOSTRedirection,
  handlePATCHRedirectedAuthentication,
  handlePATCHPassword,
  handlePOSTPasswordForgot,
  handleGETLogins,
  handleDELETELogins
}
