
/**
 * @openapi
 * /activeDonors:
 *   post:
 *     tags:
 *       - Active Donors
 *     summary: Post active donor route
 *     description: Add an active donor for everyone to see
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
 *     responses:
 *       201:
 *         description: Active donor created
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
 *                   example: Active donor created
 *                 newActiveDonor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     markerId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     time:
 *                       type: string
 *                       example: 8801521438557
 *       409:
 *         description: Active donor already created
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
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Active donor already created
 */


/**
 * @openapi
 * /activeDonors/{donorId}:
 *   delete:
 *     tags:
 *       - Active Donors
 *     summary: Delete active donor route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Remove an active donor
 *     parameters:
 *       - in: path
 *         name: donorId
 *         description: The donor to be removed from active donors
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *     responses:
 *       200:
 *         description: Active donor deleted
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
 *                   example: Active donor deleted successfully
 *                 removeActiveDonor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     markerId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     time:
 *                       type: number
 *                       example: 1658974323116
 *       404:
 *         description: ERROR
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
 *                   example: Active donor not found
 */

/**
 * @openapi
 * /activeDonors:
 *   get:
 *     tags:
 *       - Active Donors
 *     summary: Get list of active donors
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get list of active donors filtered by search parameters
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         required: true
 *         description: Bloodgroup must be between 0 to 7. -1 will denote any blood group
 *         schema:
 *           type: number
 *           example: 3
 *       - in: query
 *         name: hall
 *         required: true
 *         description: Hall must be between 0 to 6 or 8
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: batch
 *         required: true
 *         description: Batch must be the two digit batch number of a student. Leave it empty to include all batches
 *         schema:
 *           type: number
 *           example: 16
 *       - in: query
 *         name: name
 *         description: A string that will be matched using subsequence search on the name field
 *         required: true
 *         schema:
 *           type: string
 *           example: maha
 *       - in: query
 *         name: address
 *         required: true
 *         description: Searches the address field using substring search. Leave it empty to include all addresses
 *         schema:
 *           type: string
 *           example: azimpur
 *       - in: query
 *         name: isAvailable
 *         required: true
 *         description: make this true if you want to get the donors who have not donated blood in the last 120 days
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: isNotAvailable
 *         required: true
 *         description: make this false if you want to get the donors who have donated blood in the last 120 days
 *         schema:
 *           type: boolean
 *           example: false
 *       - in: query
 *         name: availableToAll
 *         required: true
 *         description: make this true to get the donors who are marked as public data
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: markedByMe
 *         required: true
 *         description: make this true to get the donors who were marked by me
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: availableToAllOrHall
 *         required: true
 *         description: make this true to get all marked donors who are of the specified hall or marked as available to all
 *         schema:
 *           type: boolean
 *           example: true
 *     responses:
 *       200:
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
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Active donors queried successfully
 *                 activeDonors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 584abcde6744144441
 *                       hall:
 *                         type: number
 *                         example: 5
 *                       name:
 *                         type: string
 *                         example: Mir Mahathir Mohammad
 *                       address:
 *                         type: string
 *                         example: Azimpur Road
 *                       comment:
 *                         type: string
 *                         example: Has diabetes
 *                       commentTime:
 *                         type: number
 *                         example: 154782512254
 *                       lastDonation:
 *                         type: number
 *                         example: 1235478524412
 *                       availableToAll:
 *                         type: boolean
 *                         example: true
 *                       bloodGroup:
 *                         type: number
 *                         example: 2
 *                       studentId:
 *                         type: string
 *                         example: 1605011
 *                       phone:
 *                         type: number
 *                         example: 8801521438557
 *                       markedTime:
 *                         type: number
 *                         example: 135496813489
 *                       markedName:
 *                         type: string
 *                         example: Ifty
 *                       donationCount:
 *                         type: number
 *                         example: 8
 *                       callRecordCount:
 *                         type: number
 *                         example: 3
 *                       lastCallRecord:
 *                         type: number
 *                         example: 135496813489
 *                       lastCalled:
 *                         type: number
 *                         example: 135496813489
 *                       marker:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Mir Mahathir Mohammad
 *                           time:
 *                             type: number
 *                             example: 154875221458
 *       403:
 *         description: This error will occur if the user tries to search other halls
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
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: You are not allowed to search donors of other halls
 */