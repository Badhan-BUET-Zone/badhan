import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import testController from "../controllers/testController";
import rateLimiter from '../middlewares/rateLimiter'

const router: AsyncRouterInstance = AsyncRouter()

/**
 * @openapi
 * /test/internalServerError/controller:
 *   post:
 *     tags:
 *       - Test
 *     summary: Test internal server error in controller
 *     description: Endpoint to test internal server error handling in controller layer
 *     responses:
 *       500:
 *         description: Internal server error triggered for testing
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
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post('/internalServerError/controller',
    rateLimiter.commonLimiter,
    testController.handleInternalServerErrorInController
)

/**
 * @openapi
 * /test/internalServerError/dbinterface:
 *   post:
 *     tags:
 *       - Test
 *     summary: Test internal server error in DB interface
 *     description: Endpoint to test internal server error handling in database interface layer
 *     responses:
 *       500:
 *         description: Internal server error triggered for testing
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
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post('/internalServerError/dbinterface',
    rateLimiter.commonLimiter,
    testController.handleInternalServerErrorInDBInterface
)

export default router
