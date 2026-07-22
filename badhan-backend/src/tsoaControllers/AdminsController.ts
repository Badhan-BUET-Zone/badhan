import 'reflect-metadata'
import { Body, Controller, Example, Middlewares, Patch, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import donorValidator from '../validations/donors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import { DESIGNATIONS_INDEX, hasNoSpecificHall } from '../constants'

@Route('admins')
@Tags('Admins')
export class AdminsController extends Controller {
  /** Change hall admin (Super Admin only) */
  @Patch()
  @SuccessResponse(200, 'Changed hall admin successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Invalid operation', {
    status: 'ERROR',
    statusCode: 409,
    message: 'User is not a volunteer'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Changed hall admin successfully'
  })
  @Middlewares([donorValidator.validatePATCHAdmins, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async changeAdmin(
    @Body() body: { donorId: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    if (targetDonor.designation !== DESIGNATIONS_INDEX.VOLUNTEER) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'User is not a volunteer' }
    }

    if (hasNoSpecificHall(targetDonor.hall)) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'User does not have a valid hall' }
    }

    await donorInterface.findDonorAndUpdate({
      hall: targetDonor.hall,
      designation: 2
    }, {
      $set: { designation: 1 }
    })

    // Make new hall admin
    targetDonor.designation = DESIGNATIONS_INDEX.HALL_ADMIN
    await targetDonor.save()

    await logInterface.addLog(user._id, 'PATCH DONORS DESIGNATION (VOLUNTEER)', { name: targetDonor.name })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Changed hall admin successfully'
    }
  }

  /** Promote or demote super admin (Super Admin only) */
  @Patch('superadmin')
  @SuccessResponse(200, 'Donor promotion/demotion successful')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Invalid operation', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Target donor must be a volunteer or super admin'
  })
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donor has been promoted to Super Admin',
    donor: {
      _id: 'jhdwiurh837921',
      name: 'Mir Mahathir',
      designation: 3
    }
  })
  @Middlewares([donorValidator.validatePATCHAdminsSuperAdmin, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async changeSuperAdmin(
    @Body() body: { donorId: string; promoteFlag: boolean },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donor?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    if (targetDonor.designation !== DESIGNATIONS_INDEX.VOLUNTEER && targetDonor.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Target donor must be a volunteer or super admin' }
    }

    let message: string
    if (body.promoteFlag) {
      targetDonor.designation = DESIGNATIONS_INDEX.SUPER_ADMIN
      message = 'Donor has been promoted to Super Admin'
    } else {
      targetDonor.designation = DESIGNATIONS_INDEX.VOLUNTEER
      message = 'Donor has been demoted to Volunteer'
    }

    await targetDonor.save()
    await logInterface.addLog(targetDonor._id, 'PATCH DONORS DESIGNATION SUPERADMIN', { name: targetDonor.name })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message,
      donor: targetDonor
    }
  }
}

