import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import authenticator from '../middlewares/authenticate'
import userController from '../controllers/userController'
import rateLimiter from '../middlewares/rateLimiter'
import userValidator from '../validations/users'

const router: AsyncRouterInstance = AsyncRouter()


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
 *                 example: 8801500000000
 *               password:
 *                 type: string
 *                 example: badhandev
 *     responses:
 *       201:
 *         description: A successful sign in returns a token for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
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
 *                   type: number
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
 *                   type: number
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Incorrect phone / password
 */
// router.post('/signin',
//   userValidator.validateLogin,
//   rateLimiter.signInLimiter,
//   userController.handlePOSTSignIn
// )

/**
 * @openapi
 * /users/signout:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Sign out route
 *     security:
 *       - ApiKeyAuth: []
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
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
// router.delete('/signout',
//   rateLimiter.commonLimiter,
//   authenticator.handleAuthentication,
//   userController.handleDELETESignOut
// )

/**
 * @openapi
 * /users/signout/all:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Sign out all route
 *     security:
 *       - ApiKeyAuth: []
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
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logged out from all devices successfully
 */
router.delete('/signout/all',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  userController.handleDELETESignOutAll
)

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get own profile info
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the fetching of own details
 *     responses:
 *       200:
 *         description: Info of the logged in user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched donor details
 *                 donor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     email:
 *                       type: string
 *                       example: mirmahathir1@gmail.com
 *                     lastDonation:
 *                       type: number
 *                       example: 786534785
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     hall:
 *                       type: number
 *                       example: 5
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     address:
 *                       type: string
 *                       example: Azimpur
 *                     comment:
 *                       type: string
 *                       example: Developer of badhan
 *                     commentTime:
 *                       type: number
 *                       example: 0
 *                     designation:
 *                       type: number
 *                       example: 3
 *                     availableToAll:
 *                       type: boolean
 *                       example: true
 */
router.get('/me',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  userController.handleGETMe
)

/**
 * @openapi
 * /users/redirection:
 *   post:
 *     tags:
 *       - Users
 *     summary: Redirection route
 *     security:
 *       - ApiKeyAuth: []
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
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Redirection token created
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 */
router.post('/redirection',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  userController.handlePOSTRedirection
)

/**
 * @openapi
 * /users/redirection:
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
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Redirected login successful
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 *                 donor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     email:
 *                       type: string
 *                       example: mirmahathir1@gmail.com
 *                     lastDonation:
 *                       type: number
 *                       example: 786534785
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     hall:
 *                       type: number
 *                       example: 5
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     address:
 *                       type: string
 *                       example: Azimpur
 *                     comment:
 *                       type: string
 *                       example: Developer of badhan
 *                     commentTime:
 *                       type: number
 *                       example: 0
 *                     designation:
 *                       type: number
 *                       example: 3
 *                     availableToAll:
 *                       type: boolean
 *                       example: true
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
 *                   type: number
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
 *                   type: number
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Session Expired
 */
router.patch('/redirection',
  rateLimiter.redirectionSignInLimiter,
  userController.handlePATCHRedirectedAuthentication
)

/**
 * @openapi
 * /users/password:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Patch password route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Route endpoint to change password
 *     requestBody:
 *       description: The JSON consisting of the new password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 example: mynewpassword
 *     responses:
 *       201:
 *         description: Successful password change done
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
 *                   example: Password changed successfully
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 */
router.patch('/password',
  rateLimiter.commonLimiter,
  userValidator.validatePATCHPassword,
  authenticator.handleAuthentication,
  userController.handlePATCHPassword
)

/**
 * @openapi
 * /users/logins:
 *   get:
 *     tags:
 *       - Users
 *     summary: Fetch users login route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Endpoint to get recent logins
 *     responses:
 *       200:
 *         description: Success response
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
 *                   example: Recent logins fetched successfully
 *                 logins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 584abcde6744144441
 *                       os:
 *                         type: string
 *                         example: Ubuntu 20.04.1
 *                       device:
 *                         type: string
 *                         example: Asus K550VX
 *                       browserFamily:
 *                         type: string
 *                         example: Firefox
 *                       ipAddress:
 *                         type: string
 *                         example: 1.2.3.4
 *                 currentLogin:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 584abcde6744144441
 *                     os:
 *                       type: string
 *                       example: Ubuntu 20.04.1
 *                     device:
 *                       type: string
 *                       example: Asus K550VX
 *                     browserFamily:
 *                       type: string
 *                       example: Firefox
 *                     ipAddress:
 *                       type: string
 *                       example: 1.2.3.4
 */
router.get('/logins',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  userController.handleGETLogins
)

/**
 * @openapi
 * /users/logins/{tokenId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete users login route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Endpoint to delete a login from device
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         description: tokenId to be deleted
 *         required: true
 *         schema:
 *           type: string
 *           example: kfsdhf7834y9282
 *     responses:
 *       200:
 *         description: Success response
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
 *                   example: Logged out from specified device
 *       404:
 *         description: Token with specified ID was not found in database
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
 *                   example: Login information not found
 */
router.delete('/logins/:tokenId',
  rateLimiter.commonLimiter,
  userValidator.validateDELETELogins,
  authenticator.handleAuthentication,
  userController.handleDELETELogins
)

export default router
