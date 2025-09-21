import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import guestController from '../controllers/guestController'

const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /guest/users/signin:
 *   post:
 *     tags:
 *       - Guest
 *     summary: Guest user sign in
 *     description: Sign in endpoint for guest users (external access)
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
 *         description: A successful sign in returns a token for the guest user
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
 */
router.post('/users/signin',
  guestController.handlePOSTLogIn
)

/**
 * @openapi
 * /guest/users/signout:
 *   delete:
 *     tags:
 *       - Guest
 *     summary: Guest user sign out
 *     description: Sign out endpoint for guest users
 *     responses:
 *       200:
 *         description: A successful sign out removes the token for the guest user
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
router.delete('/users/signout',
  guestController.handlePOSTLogOut
)

/**
 * @openapi
 * /guest/users/signout/all:
 *   delete:
 *     tags:
 *       - Guest
 *     summary: Guest user sign out all devices
 *     description: Sign out guest user from all devices
 *     responses:
 *       200:
 *         description: Endpoint to logout guest user from all devices
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
router.delete('/users/signout/all',
  guestController.handlePOSTLogOutAll
)
/**
 * @openapi
 * /guest/users/password:
 *   patch:
 *     tags:
 *       - Guest
 *     summary: Guest user change password
 *     description: Change password endpoint for guest users
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
router.patch('/users/password',
  guestController.handlePATCHPassword
)

/**
 * @openapi
 * /guest/users/me:
 *   get:
 *     tags:
 *       - Guest
 *     summary: Get guest user profile
 *     description: Get the profile information of the currently authenticated guest user
 *     responses:
 *       200:
 *         description: Successfully fetched guest user details
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
router.get('/users/me',
  guestController.handlePOSTViewDonorDetailsSelf
)

/**
 * @openapi
 * /guest/donors:
 *   post:
 *     tags:
 *       - Guest
 *     summary: Guest insert donor
 *     description: Guest version of donor insertion endpoint
 *     requestBody:
 *       description: Donor info for inserting donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: 8801500000000
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *               hall:
 *                 type: number
 *                 example: 5
 *               name:
 *                 type: string
 *                 example: Mir Mahathir
 *               studentId:
 *                 type: string
 *                 example: 1605011
 *               address:
 *                 type: string
 *                 example: Azimpur
 *               roomNumber:
 *                 type: string
 *                 example: 3009
 *               comment:
 *                 type: string
 *                 example: Developer of badhan
 *     responses:
 *       201:
 *         description: Successful donor insertion
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
 *                   example: New donor inserted successfully
 */
router.post('/donors',
  guestController.handlePOSTInsertDonor
)

router.get('/donors/new',
  guestController.handleGETDonorsNew
)

router.get('/search/v3',
  guestController.handlePOSTSearchDonors
)

router.delete('/donors',
  guestController.handlePOSTDeleteDonor
)

router.patch('/donors/comment',
  guestController.handlePOSTComment
)

router.post('/donors/password',
  guestController.handlePOSTChangePassword
)

router.patch('/donors/v2',
  guestController.handlePOSTEditDonor
)

router.patch('/donors/designation',
  guestController.handlePOSTPromote
)

router.patch('/admins',
  guestController.handlePOSTChangeAdmin
)

router.patch('/admins/superadmin',
  guestController.handlePATCHAdminsSuperAdmin
)

router.get('/donors',
  guestController.handleGETViewDonorDetails
)

router.get('/donors/designation',
  guestController.handleGETDonorsDesignation
)

router.get('/donors/checkDuplicate',
  guestController.handleGETDonorsDuplicate
)

router.get('/volunteers',
  guestController.handlePOSTViewVolunteersOfOwnHall
)

router.get('/admins',
  guestController.handlePOSTShowHallAdmins
)

router.get('/donors/designation/all',
  guestController.handleGETViewAllVolunteers
)

router.post('/donations',
  guestController.handlePOSTInsertDonation
)

router.delete('/donations',
  guestController.handlePOSTDeleteDonation
)

router.post('/platelet-donations',
  guestController.handlePOSTInsertPlateletDonation
)

router.delete('/platelet-donations',
  guestController.handlePOSTDeletePlateletDonation
)

router.get('/log/statistics',
  guestController.handleGETStatistics
)

router.delete('/log',
  guestController.handleDELETELogs
)

router.post('/callrecords',
  guestController.handlePOSTCallRecord
)

router.delete('/callrecords',
  guestController.handleDELETECallRecord
)

router.get('/log',
  guestController.handleGETLogs
)

router.get('/publicContacts',
  guestController.handleGETPublicContacts
)

router.post('/publicContacts',
  guestController.handlePOSTPublicContact
)

router.delete('/publicContacts',
  guestController.handleDELETEPublicContact
)

router.get('/users/logins',
  guestController.handleGETLogins
)

router.delete('/users/logins/:tokenId',
  guestController.handleDELETELogins
)

/**
 * @openapi
 * /guest/activeDonors:
 *   post:
 *     tags:
 *       - Guest
 *     summary: Guest create active donor
 *     description: Guest version of active donor creation endpoint
 *   delete:
 *     tags:
 *       - Guest
 *     summary: Guest delete active donor
 *     description: Guest version of active donor deletion endpoint
 *   get:
 *     tags:
 *       - Guest
 *     summary: Guest get active donors
 *     description: Guest version of active donor retrieval endpoint
 */
router.post('/activeDonors', guestController.handlePOSTActiveDonors)
router.delete('/activeDonors/:donorId', guestController.handleDELETEActiveDonors)
router.get('/activeDonors', guestController.handleGETActiveDonors)

// Note: All remaining guest endpoints are guest versions of the main API endpoints
// They follow the same request/response patterns as their main counterparts
// but are accessible through the /guest prefix for external integrations

export default router
