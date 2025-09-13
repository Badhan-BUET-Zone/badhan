












/**
 * @openapi
 * /users/password/forgot:
 *   post:
 *     tags:
 *       - Users
 *     summary: Password forgot route
 *     description: Route if user forgets the password
 *     requestBody:
 *       description: Phone number of user who forgot his/her password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: 8801521438557
 *     responses:
 *       200:
 *         description:  Success Response
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
 *                   example: A recovery mail has been sent to your email address
 *       404:
 *         description: Error responses
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
 *                   example: Phone number not recognized/ Account not found/ No recovery email found for this phone number
 */






