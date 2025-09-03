
/**
 * @openapi
 * /pendingDonors:
 *   get:
 *     tags:
 *       - Pending Donors
 *     summary: Get list of pending donors
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the fetching of a list of pending donors
 *     responses:
 *       200:
 *         description: Success message
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
 *                   example: Pending donors fetched successfully
 *                 pendingDonors:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: yPb7njNGzMSDzQtBpQ4O
 *                     phone:
 *                       type: string
 *                       example: 8805322823845
 *                     name:
 *                       type: string
 *                       example: Sanju Basak
 *                     studentId:
 *                       type: string
 *                       example: 1805016
 *                     lastDonation:
 *                       type: number
 *                       example: 786534785
 *                     donationCount:
 *                       type: number
 *                       example: 5
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
 */

/**
 * @openapi
 * /pendingDonors:
 *   post:
 *     tags:
 *       - Pending Donors
 *     summary: Post a donor for confirmation
 *     description: Handles the insertion of a new pending donor into the database.
 *     requestBody:
 *       description: Donor info for inserting donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sanju Basak
 *               phone:
 *                 type: string
 *                 example: 8801521438557
 *               studentId:
 *                 type: string
 *                 example: 1605011
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *               hall:
 *                 type: number
 *                 example: 5
 *               address:
 *                 type: string
 *                 example: Azimpur
 *               roomNumber:
 *                 type: string
 *                 example: 3009
 *               comment:
 *                 type: string
 *                 example: Developer of badhan
 *               donationCount:
 *                 type: number
 *                 example: 5
 *               lastDonation:
 *                 type: number
 *                 example: 1590001382000
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
 *                 message:
 *                   type: string
 *                   example: New donor has been submitted successfully
 */

/**
 * @openapi
 * /pendingDonors/{id}:
 *   delete:
 *     tags:
 *       - Pending Donors
 *     summary: Delete pending donor route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Remove a pending donor by id
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The id of pending donor to be removed from pending donors
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *     responses:
 *       200:
 *         description: Pending donor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Pending donor deleted successfully
 *                 pendingDonor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     name:
 *                       type: string
 *                       example: Sanju Basak
 *                     comment:
 *                       type: string
 *                       example: developer
 *                     lastDonation:
 *                       type: number
 *                       example: 1590001382000
 *                     studentId:
 *                       type: string
 *                       example: 1805016
 *                     donationCount:
 *                       type: number
 *                       example: 5
 *                     bloodGroup:
 *                       type: number
 *                       example: 4
 *                     address:
 *                       type: string
 *                       example: BUET hall
 *                     hall:
 *                       type: number
 *                       example: 4
 *                     phone:
 *                       type: string
 *                       example: 8805322823845
 *                     roomNumber:
 *                       type: string
 *                       example: room 3009
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
 *                 message:
 *                   type: string
 *                   example: Donor Id not found
 */
