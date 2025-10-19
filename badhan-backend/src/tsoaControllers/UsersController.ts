import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Patch, Post, Response, Route, SuccessResponse, Tags, Request } from 'tsoa'
import type { Response as ExResponse } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from '../dotenv'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as tokenInterface from '../db/interfaces/tokenInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as tokenCache from '../cache/tokenCache'
import { IDonor } from '../db/models/Donor'
import { JwtPayload } from '../db/models/Token'
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

  /** Sign out user from all devices on Badhan Platform */
  @Delete('signout/all')
  @SuccessResponse(200, 'Logged out from all devices successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Failed to sign out from all devices', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Failed to sign out from all devices'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Logged out from all devices successfully'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async signOutAll(@Request() req: any): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    await tokenInterface.deleteAllTokensByDonorId(donor._id)
    await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT ALL', {})

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Logged out from all devices successfully'
    }
  }

  /** Get own profile information */
  @Get('me')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Fetched donor details successfully',
    donor: {
      _id: 'jhdwiurh837921',
      phone: 8801521438557,
      name: 'Mir Mahathir',
      studentId: '1605011',
      email: 'mirmahathir1@gmail.com',
      lastDonation: 786534785,
      bloodGroup: 2,
      hall: 5,
      roomNumber: '3009',
      address: 'Azimpur',
      comment: 'Developer of badhan',
      commentTime: 0,
      designation: 3,
      availableToAll: true
    }
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getMe(@Request() req: any): Promise<{ status: string; statusCode: number; message: string; donor: any }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    await logInterface.addLog(donor._id, 'ENTERED APP', { name: donor.name })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Create a temporary redirection token (expires in 30 seconds) */
  @Post('redirection')
  @SuccessResponse(201, 'Redirection token created')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: 201,
    message: 'Redirection token created',
    token: 'dvsoigneoihegoiwsngoisngoiswgnbon'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async createRedirectionToken(@Request() req: any): Promise<{ status: string; statusCode: number; message: string; token?: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, '30s')

    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Token insertion failed' }
    }

    await logInterface.addLog(donor._id, 'POST USERS REDIRECTION', {})

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Redirection token created',
      token: tokenInsertResult.data!.token
    }
  }

  /** Exchange temporary redirection token for a permanent authentication token */
  @Patch('redirection')
  @SuccessResponse(201, 'Redirected login successful')
  @Response<{ status: string; statusCode: number; message: string }>(401, 'Session Expired', {
    status: 'ERROR',
    statusCode: 401,
    message: 'Session Expired'
  })
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Token not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string; donor: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'Redirected login successful',
    token: 'dvsoigneoihegoiwsngoisngoiswgnbon',
    donor: {
      _id: 'jhdwiurh837921',
      phone: 8801521438557,
      name: 'Mir Mahathir',
      studentId: '1605011',
      email: 'mirmahathir1@gmail.com',
      lastDonation: 786534785,
      bloodGroup: 2,
      hall: 5,
      roomNumber: '3009',
      address: 'Azimpur',
      comment: 'Developer of badhan',
      commentTime: 0,
      designation: 3,
      availableToAll: true
    }
  })
  @Middlewares([rateLimiter.redirectionSignInLimiter])
  public async redirectedAuthentication(
    @Body() body: { token: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; token?: string; donor?: any }> {
    const token: string = body.token
    const res: ExResponse = (req as any).res

    let decodedDonor: JwtPayload
    try {
      decodedDonor = await jwt.verify(token, dotenv.JWT_SECRET) as JwtPayload
    } catch (_e) {
      this.setStatus(401)
      return { status: 'ERROR', statusCode: 401, message: 'Session Expired' }
    }

    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: decodedDonor._id })

    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }

    const donor: IDonor = donorQueryResult.data!

    const tokenDeleteResponse: {message: string, status: string} = await tokenInterface.deleteTokenDataByToken(token)

    if (tokenDeleteResponse.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Token not found' }
    }

    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Token insertion failed' }
    }

    await logInterface.addLog(donor._id, 'PATCH USERS REDIRECTION', {})

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Redirected login successful',
      token: tokenInsertResult.data!.token,
      donor
    }
  }
}


