import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import logController from '../controllers/logController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'

const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /log/statistics:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Endpoint to fetch donation statistics
 *     security:
 *       - ApiKeyAuth: []
 *     description: Fetch statistics about the current donor count and volunteer count
 *     responses:
 *       200:
 *         description: Donation statistics fetch successful
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
 *                   example: Statistics fetched successfully
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     donorCount:
 *                       type: number
 *                       example: 2600
 *                     donationCount:
 *                       type: number
 *                       example: 1200
 *                     plateletDonationCount:
 *                       type: number
 *                       example: 300
 *                     volunteerCount:
 *                       type: number
 *                       example: 130
 */
router.get('/log/statistics',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETStatistics
)
router.get('/log/donations',
  rateLimiter.commonLimiter,
  logController.handleGETLogsDonations
)

/**
 * @openapi
 * /log/donations:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get donation logs
 *     description: Fetch logs related to donation activities
 *     responses:
 *       200:
 *         description: Donation logs fetched successfully
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
 *                   example: Donation logs fetched successfully
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 614ec811e29ab430ddfb119a
 *                       donorId:
 *                         type: string
 *                         example: 5e901d56effc590017712345
 *                       donorName:
 *                         type: string
 *                         example: Mir Mahathir
 *                       action:
 *                         type: string
 *                         example: donation_inserted
 *                       timestamp:
 *                         type: number
 *                         example: 1640995200000
 *                       details:
 *                         type: object
 *                         properties:
 *                           donationDate:
 *                             type: number
 *                             example: 1640995200000
 *                           bloodGroup:
 *                             type: number
 *                             example: 2
 *                           hall:
 *                             type: number
 *                             example: 5
 */

/**
 * @openapi
 * /log:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get count of logged in user and logs
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get date wise count of api calls
 *     responses:
 *       200:
 *         description: Log counts fetched successfully
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
 *                   example: Log counts fetched successfully
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dateString:
 *                         type: string
 *                         example: 2021-05-06
 *                       activeUserCount:
 *                         type: number
 *                         example: 23
 *                       totalLogCount:
 *                         type: number
 *                         example: 256
 */
router.get('/log',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETLogs
)

/**
 * @openapi
 * /log:
 *   delete:
 *     tags:
 *       - Logs
 *     summary: Endpoint to delete logs
 *     security:
 *       - ApiKeyAuth: []
 *     description: Delete all logs
 *     responses:
 *       200:
 *         description: All logs deleted successfully
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
 *                   example: All logs deleted successfully
 */
router.delete('/log',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleDELETELogs
)



export default router
