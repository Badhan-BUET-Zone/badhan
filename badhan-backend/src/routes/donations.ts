import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import donationController from '../controllers/donationController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import donationValidator from '../validations/donations'
const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /donations:
 *   post:
 *     tags:
 *       - Donations
 *     summary: Post donations route
 *     description: Endpoint to insert a donation date for a donor
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON consisting of donor info for inserting donation
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: bhjdekj8923
 *               date:
 *                 type: number
 *                 example: 1611100800000
 *     responses:
 *       201:
 *         description: Donations inserted successfully
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
 *                   example: Donations inserted successfully
 *                 newDonation:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: number
 *                       example: 1611100800000
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     phone:
 *                       type: string
 *                       example: 8801500000000
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 */
router.post('/',
  donationValidator.validatePOSTDonations,
  rateLimiter.donationInsertionLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  donationController.handlePOSTDonations
)

/**
 * @openapi
 * /donations:
 *   delete:
 *     tags:
 *       - Donations
 *     summary: Delete users login route
 *     security:
 *       - ApiKeyAuth: []
 *     description: handles the deletion of a donation for a donor
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: Donor id for deleting donations
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: date
 *         description: Donation date for deleting donation
 *         required: true
 *         schema:
 *           type: number
 *           example: 1611100800000
 *     responses:
 *       200:
 *         description: Donation deletion successful
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
 *                   example: Successfully deleted donation
 *                 deletedDonation:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     date:
 *                       type: number
 *                       example: 1611100800000
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     phone:
 *                       type: number
 *                       example: 8801500000000
 *       404:
 *         description: Error case
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Matching donation not found
 */
router.delete('/',
  donationValidator.validateDELETEDonations,
  rateLimiter.deleteDonationLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  donationController.handleDELETEDonations
)

router.get('/report',
  donationValidator.validateGETDonationsReport,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  donationController.handleGETDonationsReport
)

/**
 * @openapi
 * /donations/report:
 *   get:
 *     tags:
 *       - Donations
 *     summary: Get donations report
 *     security:
 *       - ApiKeyAuth: []
 *     description: Generate a comprehensive report of all blood donations (Super Admin only)
 *     parameters:
 *       - in: query
 *         name: startDate
 *         description: Start date for the report (UNIX timestamp)
 *         required: false
 *         schema:
 *           type: number
 *           example: 1609459200000
 *       - in: query
 *         name: endDate
 *         description: End date for the report (UNIX timestamp)
 *         required: false
 *         schema:
 *           type: number
 *           example: 1640995200000
 *       - in: query
 *         name: hall
 *         description: Filter by specific hall (0-6 or 8)
 *         required: false
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: bloodGroup
 *         description: Filter by blood group (0-7)
 *         required: false
 *         schema:
 *           type: number
 *           example: 2
 *     responses:
 *       200:
 *         description: Donations report generated successfully
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
 *                   example: Donations report generated successfully
 *                 report:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       counts:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             month:
 *                               type: number
 *                               example: 1
 *                             year:
 *                               type: number
 *                               example: 2024
 *                             count:
 *                               type: number
 *                               example: 25
 *                       bloodGroup:
 *                         type: number
 *                         example: 2
 *                 firstDonationCount:
 *                   type: number
 *                   example: 150
 */


export default router
