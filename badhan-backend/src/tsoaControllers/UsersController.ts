import 'reflect-metadata'
import { Body, Controller, Delete, Example, Middlewares, Post, Response, Route, SuccessResponse, Tags, Request } from 'tsoa'
import type { Response as ExResponse } from 'express'
import bcrypt from 'bcryptjs'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as tokenInterface from '../db/interfaces/tokenInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as tokenCache from '../cache/tokenCache'
import userValidator from '../validations/users'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import userController from '../controllers/userController'

@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  /** Sign in to Badhan Platform using phone and password */
  @Post('signin')
  @SuccessResponse(201, 'Signed in successfully')
  @Response<{ status: string; statusCode: number; message: string }>(401, 'Incorrect phone / password', {
    status: 'ERROR',
    statusCode: 401,
    message: 'Incorrect phone / password'
  })
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Account not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Account not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: 201,
    message: 'Signed in successfully',
    token: 'dvsoigneoihegoiwsngoisngoiswgnbon'
  })
  @Middlewares([userValidator.validateLogin, rateLimiter.signInLimiter])
  public async signIn(
    @Body() body: { phone: number; password: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; token?: string }> {
    const donorPhone: number = body.phone
    const password: string = body.password

    const donorQueryResult: {data?: any, message: string, status: string} = await donorInterface.findDonorByQuery({ phone: donorPhone })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Account not found' }
    }

    const donor: any = donorQueryResult.data

    let matched: boolean
    try {
      matched = await bcrypt.compare(password, donor.password!)
    } catch (_e) {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Account not found' }
    }

    if (!matched) {
      this.setStatus(401)
      return { status: 'ERROR', statusCode: 401, message: 'Incorrect phone / password' }
    }

    const res: ExResponse = (req as any).res
    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)
    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Token insertion failed' }
    }

    tokenCache.add(tokenInsertResult.data!.token, donor)
    await logInterface.addLog(donor._id, 'POST USERS SIGNIN', {})

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Signed in successfully',
      token: tokenInsertResult.data!.token
    }
  }

  /** Sign out user from Badhan Platform */
  @Delete('signout')
  @SuccessResponse(200, 'Logged out successfully')
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async signOut(@Request() req: any): Promise<void> {
    const res: ExResponse = (req as any).res
    await userController.handleDELETESignOut(req, res)
  }
}


