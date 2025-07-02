import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import testController from "../controllers/testController";
import rateLimiter from '../middlewares/rateLimiter'

const router: AsyncRouterInstance = AsyncRouter()

router.post('/internalServerError/controller',
    rateLimiter.commonLimiter,
    testController.handleInternalServerErrorInController
)
router.post('/internalServerError/dbinterface',
    rateLimiter.commonLimiter,
    testController.handleInternalServerErrorInDBInterface
)

export default router
