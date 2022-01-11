/**
 * @openapi
 * /log/version:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get info about current version
 *     description: Get app info deployed to play store
 *     responses:
 *       200:
 *         description: Response is the current version number of badhan api
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
 *                   example: Latest app version fetched
 *                 version:
 *                   type: string
 *                   example: '2.5.1'
 */

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
 *                     volunteerCount:
 *                       type: number
 *                       example: 130
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

/**
 * @openapi
 * /log/date/{date}:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get logs of a specific date
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get user-wise api call counts for specific date
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         description: Date of logs
 *     responses:
 *       200:
 *         description: Successful
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
 *                       name:
 *                         type: string
 *                         example: Mir Mahathir
 *                       donorId:
 *                         type: string
 *                         example: herfg395890
 *                       hall:
 *                         type: number
 *                         example: 5
 *                       count:
 *                         type: number
 *                         example: 8
 */

/**
 * @openapi
 * /log/date/{date}/donorId/{donorId}:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get logs of a specific date and donorId
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get api call details of a donor by date
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         description: Date of logs
 *       - in: path
 *         name: donorId
 *         required: true
 *         description: DonorId of the target donor
 *     responses:
 *       200:
 *         description: Successful
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
 *                       _id:
 *                         type: string
 *                         example: 567jhgjkg
 *                       date:
 *                         type: number
 *                         example: 1628789240641
 *                       operation:
 *                         type: string
 *                         example: Search donors
 *                       details:
 *                         type: object
 */

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