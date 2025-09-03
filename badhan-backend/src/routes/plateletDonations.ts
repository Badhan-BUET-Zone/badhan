import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import plateletDonationController from '../controllers/plateletDonationController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import plateletDonationValidator from '../validations/plateletDonations'
const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /platelet-donations:
 *   post:
 *     tags:
 *       - PlateletDonations
 *     summary: Post platelet donations route
 *     description: Endpoint to insert a platelet donation date for a donor
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
 *         description: Platelet donations inserted successfully
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
 *                   example: Platelet donations inserted successfully
 *                 newPlateletDonation:
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
  plateletDonationValidator.validatePOSTPlateletDonations,
  rateLimiter.donationInsertionLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  plateletDonationController.handlePOSTPlateletDonations
)

/**
 * @openapi
 * /platelet-donations:
 *   delete:
 *     tags:
 *       - PlateletDonations
 *     summary: Delete users platelet donation route
 *     security:
 *       - ApiKeyAuth: []
 *     description: handles the deletion of a platelet donation for a donor
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: Donor id for deleting platelet donations
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: date
 *         description: Platelet donation date for deleting platelet donation
 *         required: true
 *         schema:
 *           type: number
 *           example: 1611100800000
 *     responses:
 *       200:
 *         description: Platelet donation deletion successful
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
 *                   example: Successfully deleted platelet donation
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
 *                   example: Matching platelet donation not found
 */
router.delete('/',
  plateletDonationValidator.validateDELETEPlateletDonations,
  rateLimiter.deleteDonationLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  plateletDonationController.handleDELETEPlateletDonations
)

router.get('/report',
  plateletDonationValidator.validateGETPlateletDonationsReport,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  plateletDonationController.handleGETPlateletDonationsReport
)


export default router
