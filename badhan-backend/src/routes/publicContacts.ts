import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import publicContactController from '../controllers/publicContactController'
import authenticator from '../middlewares/authenticate'
import { loadTargetDonor } from '../middlewares/donor'
import rateLimiter from '../middlewares/rateLimiter'
import publicContactValidator from '../validations/publicContacts'
const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /publicContacts:
 *   post:
 *     tags:
 *       - Public Contacts
 *     summary: Post public contact route
 *     description: Endpoint to insert a public contact
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON contains the donor id and assigned blood group of contact
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: bhjdekj8923
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *     responses:
 *       201:
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Public contact added successfully
 *                 newActiveDonor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc590017712345
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 */
// DISABLED: Migrated to TSOA
// router.post('/',
//   rateLimiter.publicContactInsertionLimiter,
//   publicContactValidator.validatePOSTPublicContact,
//   authenticator.handleAuthentication,
//   loadTargetDonor,
//   authenticator.handleSuperAdminCheck,
//   publicContactController.handlePOSTPublicContact
// )

/**
 * @openapi
 * /publicContacts:
 *   get:
 *     tags:
 *       - Public Contacts
 *     summary: Get list of public contacts
 *     description: Endpoint to get public contacts
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
 *                   example: All public contacts fetched successfully
 *                 publicContacts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bloodGroup:
 *                         type: number
 *                         example: 2
 *                       contacts:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             donorId:
 *                               type: string
 *                               example: 584abcde6744144441
 *                             phone:
 *                               type: number
 *                               example: 8801500000000
 *                             name:
 *                               type: string
 *                               example: Mir Mahathir Mohammad
 *                             contactId:
 *                               type: string
 *                               example: 584abcde6744144441
 */
// DISABLED: Migrated to TSOA
// router.get('/',
//   rateLimiter.commonLimiter,
//   publicContactController.handleGETPublicContacts
// )

/**
 * @openapi
 * /publicContacts:
 *   delete:
 *     tags:
 *       - Public Contacts
 *     summary: Delete public contact route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Endpoint to delete a public contact
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: DonorId of public contact
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: contactId
 *         description: ContactId of public contact
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
 *         description: Response if the public contact to be deleted is not found
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
 *                   example: Public contact not found
 *       409:
 *         description: If contactId in database does not have the matching donorId
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
 *                   example: Public contact not consistent with donorId
 */
// DISABLED: Migrated to TSOA
// router.delete('/',
//   rateLimiter.publicContactDeletionLimiter,
//   publicContactValidator.validateDELETEPublicContact,
//   authenticator.handleAuthentication,
//   loadTargetDonor,
//   authenticator.handleSuperAdminCheck,
//   publicContactController.handleDELETEPublicContact
// )

export default router
