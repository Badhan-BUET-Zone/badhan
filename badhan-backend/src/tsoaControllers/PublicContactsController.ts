import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import mongoose from 'mongoose'
import * as publicContactInterface from '../db/interfaces/publicContactInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import { IPublicContact } from '../db/models/PublicContact'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import publicContactValidator from '../validations/publicContacts'
import { loadTargetDonor } from '../middlewares/donor'
import { HTTP_STATUS } from '../constants'

@Route('publicContacts')
@Tags('Public Contacts')
export class PublicContactsController extends Controller {
  /** Insert a public contact */
  @Post()
  @SuccessResponse(201, 'Public contact added successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Internal server error', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal server error'
  })
  @Example<{ status: string; statusCode: number; message: string; publicContact: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: 'Public contact added successfully',
    publicContact: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      bloodGroup: 2
    }
  })
  @Middlewares([rateLimiter.publicContactInsertionLimiter, publicContactValidator.validatePOSTPublicContact, authenticator.handleAuthentication, loadTargetDonor, authenticator.handleSuperAdminCheck])
  public async postPublicContact(
    @Body() body: { donorId: string; bloodGroup: number },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; publicContact?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const donorObjectId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(body.donorId)
    const insertionResult: { data: IPublicContact; message: string; status: string } = await publicContactInterface.insertPublicContact(donorObjectId, body.bloodGroup)

    if (insertionResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: insertionResult.message }
    }

    await logInterface.addLog(user._id, 'POST PUBLICCONTACTS', { donorId: body.donorId })

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Public contact added successfully',
      publicContact: insertionResult.data
    }
  }

  /** Get all public contacts */
  @Get()
  @SuccessResponse(200, 'All public contacts fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; publicContacts: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'All public contacts fetched successfully',
    publicContacts: [{
      bloodGroup: 2,
      contacts: [{
        donorId: '584abcde6744144441',
        phone: 8801500000000,
        name: 'Mir Mahathir Mohammad',
        contactId: '584abcde6744144441'
      }]
    }]
  })
  @Middlewares([rateLimiter.commonLimiter])
  public async getPublicContacts(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; publicContacts?: any[] }> {
    const searchResult: { data: IPublicContact[]; message: string; status: string } = await publicContactInterface.findAllPublicContacts()

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All public contacts fetched successfully',
      publicContacts: searchResult.data
    }
  }

  /** Delete a public contact */
  @Delete()
  @SuccessResponse(200, 'Public contact deleted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Public contact not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Public contact not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Internal server error', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal server error'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Public contact deleted successfully'
  })
  @Middlewares([rateLimiter.publicContactDeletionLimiter, publicContactValidator.validateDELETEPublicContact, authenticator.handleAuthentication, loadTargetDonor, authenticator.handleSuperAdminCheck])
  public async deletePublicContact(
    @Query() donorId: string,
    @Query() contactId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    const targetDonor: IDonor = res.locals.middlewareResponse.targetDonor

    const searchResult: { data?: IPublicContact; message: string; status: string } = await publicContactInterface.findPublicContactById(contactId)

    if (searchResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Public contact not found' }
    }

    const deletionResult: { data?: IPublicContact; status: string; message: string } = await publicContactInterface.deletePublicContactById(contactId)

    if (deletionResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: deletionResult.message }
    }

    await logInterface.addLog(user._id, 'DELETE PUBLICCONTACTS', { deletedContact: targetDonor.name })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Public contact deleted successfully'
    }
  }
}

