
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
 *                       example: 8801521438557
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 */

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