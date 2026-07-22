import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Patch, Path, Post, Response, Route, SuccessResponse, Tags, Request } from 'tsoa'
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
import { HTTP_STATUS } from '../constants'

@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  /** Sign in to Badhan Platform using phone and password */
  @Post('signin')
  @SuccessResponse(201, 'Signed in successfully')
  @Response<{ status: string; statusCode: number; message: string }>(401, 'Incorrect phone / password', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: 'Incorrect phone / password'
  })
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Account not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Account not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Account not found' }
    }

    const donor: any = donorQueryResult.data

    let matched: boolean
    try {
      matched = await bcrypt.compare(password, donor.password!)
    } catch (_e) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Account not found' }
    }

    if (!matched) {
      this.setStatus(HTTP_STATUS.UNAUTHORIZED)
      return { status: 'ERROR', statusCode: HTTP_STATUS.UNAUTHORIZED, message: 'Incorrect phone / password' }
    }

    const res: ExResponse = (req as any).res
    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)
    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Token insertion failed' }
    }

    tokenCache.add(tokenInsertResult.data!.token, donor)
    await logInterface.addLog(donor._id, 'POST USERS SIGNIN', {})

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Signed in successfully',
      token: tokenInsertResult.data!.token
    }
  }

  /** Sign out user from Badhan Platform */
  @Delete('signout')
  @SuccessResponse(200, 'Logged out successfully')
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out successfully'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async signOut(@Request() req: any): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const token: string = res.locals.middlewareResponse.token
    const donor: IDonor = res.locals.middlewareResponse.donor

    await tokenInterface.deleteTokenDataByToken(token)
    await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out successfully'
    }
  }

  /** Sign out user from all devices on Badhan Platform */
  @Delete('signout/all')
  @SuccessResponse(200, 'Logged out from all devices successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Failed to sign out from all devices', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Failed to sign out from all devices'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out from all devices successfully'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async signOutAll(@Request() req: any): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    await tokenInterface.deleteAllTokensByDonorId(donor._id)
    await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT ALL', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out from all devices successfully'
    }
  }

  /** Get own profile information */
  @Get('me')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Create a temporary redirection token (expires in 30 seconds) */
  @Post('redirection')
  @SuccessResponse(201, 'Redirection token created')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: 'Redirection token created',
    token: 'dvsoigneoihegoiwsngoisngoiswgnbon'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async createRedirectionToken(@Request() req: any): Promise<{ status: string; statusCode: number; message: string; token?: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, '30s')

    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Token insertion failed' }
    }

    await logInterface.addLog(donor._id, 'POST USERS REDIRECTION', {})

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Redirection token created',
      token: tokenInsertResult.data!.token
    }
  }

  /** Exchange temporary redirection token for a permanent authentication token */
  @Patch('redirection')
  @SuccessResponse(201, 'Redirected login successful')
  @Response<{ status: string; statusCode: number; message: string }>(401, 'Session Expired', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: 'Session Expired'
  })
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Token not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string; donor: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
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
      this.setStatus(HTTP_STATUS.UNAUTHORIZED)
      return { status: 'ERROR', statusCode: HTTP_STATUS.UNAUTHORIZED, message: 'Session Expired' }
    }

    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: decodedDonor._id })

    if (donorQueryResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }

    const donor: IDonor = donorQueryResult.data!

    const tokenDeleteResponse: {message: string, status: string} = await tokenInterface.deleteTokenDataByToken(token)

    if (tokenDeleteResponse.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Token not found' }
    }

    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Token insertion failed' }
    }

    await logInterface.addLog(donor._id, 'PATCH USERS REDIRECTION', {})

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Redirected login successful',
      token: tokenInsertResult.data!.token,
      donor
    }
  }

  /** Change user password */
  @Patch('password')
  @SuccessResponse(201, 'Password changed successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Token insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Token insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: 'Password changed successfully',
    token: 'dvsoigneoihegoiwsngoisngoiswgnbon'
  })
  @Middlewares([rateLimiter.commonLimiter, userValidator.validatePATCHPassword, authenticator.handleAuthentication])
  public async changePassword(
    @Body() body: { password: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; token?: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    donor.password = body.password
    await donor.save()

    await tokenInterface.deleteAllTokensByDonorId(donor._id)
    const tokenInsertResult: {data?: any, message: string, status: string} = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Token insertion failed' }
    }

    await logInterface.addLog(donor._id, 'PATCH USERS PASSWORD', {})

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Password changed successfully',
      token: tokenInsertResult.data!.token
    }
  }

  /** Get list of recent logins for the authenticated user */
  @Get('logins')
  @SuccessResponse(200, 'Recent logins fetched successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Failed to fetch logins', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Failed to fetch logins'
  })
  @Example<{ status: string; statusCode: number; message: string; logins: any[]; currentLogin: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Recent logins fetched successfully',
    logins: [{
      _id: '584abcde6744144441',
      os: 'Ubuntu 20.04.1',
      device: 'Asus K550VX',
      browserFamily: 'Firefox',
      ipAddress: '1.2.3.4'
    }],
    currentLogin: {
      _id: '584abcde6744144441',
      os: 'Ubuntu 20.04.1',
      device: 'Asus K550VX',
      browserFamily: 'Firefox',
      ipAddress: '1.2.3.4'
    }
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getLogins(@Request() req: any): Promise<{ status: string; statusCode: number; message: string; logins?: any[]; currentLogin?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    const token: string = res.locals.middlewareResponse.token

    const recentLoginsResult: {status: string, message: string, data: any[]} = await tokenInterface.findTokenDataExceptSpecifiedToken(user._id, token)

    const currentTokenDataResult: {data?: any, message: string, status: string} = await tokenInterface.findTokenDataByToken(token)
    if (currentTokenDataResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Failed to fetch logins' }
    }

    const currentTokenData: { __v?: string, donorId?: string, token?: string, expireAt?: number, os: string, browserFamily: string, device: string, ipAddress: string} = JSON.parse(JSON.stringify(currentTokenDataResult.data))
    delete currentTokenData.token
    delete currentTokenData.expireAt
    delete currentTokenData.donorId
    delete currentTokenData.__v

    await logInterface.addLog(user._id, 'GET USERS LOGINS', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Recent logins fetched successfully',
      logins: recentLoginsResult.data,
      currentLogin: currentTokenData
    }
  }

  /** Handle missing tokenId - validation error */
  @Delete('logins')
  @Response<{ status: string; statusCode: number; message: string }>(400, 'tokenId is required', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'tokenId is required'
  })
  public async deleteLoginMissingToken(): Promise<{ status: string; statusCode: number; message: string }> {
    this.setStatus(HTTP_STATUS.BAD_REQUEST)
    return {
      status: 'ERROR',
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'tokenId is required'
    }
  }

  /** Delete a specific login session by token ID */
  @Delete('logins/{tokenId}')
  @SuccessResponse(200, 'Logged out from specified device')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Login information not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Login information not found'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out from specified device'
  })
  @Middlewares([rateLimiter.commonLimiter, userValidator.validateDELETELogins, authenticator.handleAuthentication])
  public async deleteLogin(
    @Path() tokenId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    const deletedTokenResult: {message: string, status: string, data?: any} = await tokenInterface.deleteByTokenId(tokenId)

    if (deletedTokenResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Login information not found' }
    }

    await logInterface.addLog(donor._id, 'DELETE USERS LOGINS', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out from specified device'
    }
  }
}


