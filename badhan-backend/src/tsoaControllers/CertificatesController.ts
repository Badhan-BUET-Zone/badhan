import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Path, Response, Route, SuccessResponse, Tags } from 'tsoa'
import mongoose from 'mongoose'
import * as donorInterface from '../db/interfaces/donorInterface'
import { IDonor } from '../db/models/Donor'
import rateLimiter from '../middlewares/rateLimiter'
import { HTTP_STATUS } from '../constants'

// The donor's own _id is the certificate identifier — there is no token, no expiry and nothing
// stored. A printed certificate carries this id in its QR code forever, so assume anyone can call
// this route for any donor. The protection is not access control, it is the payload: name and
// studentId, and nothing else. Build the response field by field; never spread the donor document.

const CERTIFICATE_NOT_FOUND: string = 'Certificate not found'

@Route('certificates')
@Tags('Certificates')
export class CertificatesController extends Controller {
  /** Fetch the name and student ID printed on a donor's certificate. Requires no authentication. */
  @Get('{donorId}')
  @SuccessResponse(200, 'Certificate fetched successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Certificate not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CERTIFICATE_NOT_FOUND
  })
  @Example<{ status: string; statusCode: number; message: string; certificate: { name: string; studentId: string } }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Certificate fetched successfully',
    certificate: {
      name: 'Mir Mahathir Mohammad',
      studentId: '1605011'
    }
  })
  @Middlewares([rateLimiter.commonLimiter])
  public async getCertificate(@Path() donorId: string): Promise<{
    status: string
    statusCode: number
    message: string
    certificate?: { name: string; studentId: string }
  }> {
    // A malformed id answers exactly as an absent one does. One indistinguishable "not found" tells
    // a caller walking the id space nothing about which ids are even well formed.
    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: CERTIFICATE_NOT_FOUND }
    }

    const searchResult: { data?: IDonor; message: string; status: string } = await donorInterface.findDonorByQuery({ _id: donorId })

    if (searchResult.status !== 'OK' || !searchResult.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: CERTIFICATE_NOT_FOUND }
    }

    const donor: IDonor = searchResult.data

    // archiveFlag is deliberately not consulted. A graduate is who needs the certificate most, and
    // paper already in their hands must keep verifying.
    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Certificate fetched successfully',
      certificate: {
        name: donor.name,
        studentId: donor.studentId
      }
    }
  }
}
