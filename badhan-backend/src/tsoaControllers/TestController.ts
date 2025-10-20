import 'reflect-metadata'
import { Controller, Post, Route, Tags, Hidden, Middlewares } from 'tsoa'
import * as testInterface from '../db/interfaces/testInterface'
import rateLimiter from '../middlewares/rateLimiter'

@Route('test')
@Tags('Test')
export class TestController extends Controller {
  /**
   * Test internal server error in controller
   * This endpoint is deliberately written to generate an internal server error
   * to test unknown fallback cases from inside a controller
   */
  @Post('internalServerError/controller')
  @Hidden()
  @Middlewares([rateLimiter.commonLimiter])
  public async handleInternalServerErrorInController(): Promise<void> {
    // this route is deliberately written to generate an internal server error to test unknown fallback cases from inside a controller
    throw { dummy: 'intentional internal server error' }
  }

  /**
   * Test internal server error in DB interface
   * This endpoint is deliberately written to generate an internal server error
   * to test unknown fallback cases from inside a DB interface
   */
  @Post('internalServerError/dbinterface')
  @Hidden()
  @Middlewares([rateLimiter.commonLimiter])
  public async handleInternalServerErrorInDBInterface(): Promise<void> {
    await testInterface.generateInternalServerErrorFromInterface()
  }
}

