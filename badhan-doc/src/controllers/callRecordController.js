
/**
 * @openapi
 * /callrecords:
 *   post:
 *     tags:
 *       - Call Records
 *     summary: Post public contact route
 *     description: Endpoint to insert a public contact
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON contains the donor id of callee
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
 *         description: Call record insertion successful
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
 *                   example: Call record insertion successful
 *                 calleeId:
 *                   type: string
 *                   example: 5e68514546b0e
 *                 expireAt:
 *                   type: string
 *                   example: 2021-11-15T11:23:54.231Z
 *                 callRecord:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     designation:
 *                       type: number
 *                       example: 3
 *                     hall:
 *                       type: number
 *                       example: 4
 */

/**
 * @openapi
 * /callrecords:
 *   delete:
 *     tags:
 *       - Call Records
 *     summary: Delete call record route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the deletion of one call history for a particular donor
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: Id of donor for call history
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: callRecordId
 *         description: Id of call record that is going to be deleted
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
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
 *                   example: Public contact deleted successfully
 *       404:
 *         description: This error occurs if the call record does not exist
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
 *                   example: Call record not found
 *       409:
 *         description: This error occurs if the call record does not associate with the target donor
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
 *                   example: Target donor does not have the callee of call record
 */