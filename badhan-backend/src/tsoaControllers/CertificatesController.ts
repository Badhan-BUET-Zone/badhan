import 'reflect-metadata'
import { Controller, Get, Middlewares, Path, Res, Route, SuccessResponse, Tags, TsoaResponse } from 'tsoa'
import mongoose from 'mongoose'
import { Readable } from 'stream'
import * as donorInterface from '../db/interfaces/donorInterface'
import { IDonor } from '../db/models/Donor'
import rateLimiter from '../middlewares/rateLimiter'
import { HTTP_STATUS } from '../constants'
import { certificateFileName, renderCertificatePdf } from '../services/certificate/certificateRenderer'

// The donor's own _id is the certificate identifier — there is no token, no expiry and nothing
// stored. A printed certificate carries this id in its QR code forever, so assume anyone can call
// this route for any donor. The protection is not access control, it is what the route can
// produce: a rendered page carrying a name, two parents' names, a department and a hall, and
// nothing else. That list is enforced by what the renderer is handed to draw, not by a response
// object somebody could later widen — blood group, phone, email, room number and donation history
// have no path to this response at all.
//
// Everyone gets the same document, signature block included: whoever scanned the QR code is
// comparing the names on their screen against the names on the paper in their hand, and the two
// being the same drawing is what makes that comparison read.
//
// This is the only route in the codebase that answers with something other than JSON, so it is the
// only one whose plumbing is worth reading before changing:
//
//   * The PDF is returned as a Readable. tsoa's express handler pipes a stream through untouched
//     and passes anything else to res.json(), which would turn the PDF into a JSON array of byte
//     values. A Buffer is "anything else".
//   * The two failures answer through @Res() instead of being returned. res.json() completes
//     synchronously, so by the time tsoa looks at the returned value the headers are already sent
//     and it leaves the response alone. Doing it the other way round — @Res() for the PDF, a
//     returned object for the errors — would race: piping starts on the next tick, so tsoa would
//     still see an unsent response and write JSON into the middle of the PDF.

const CERTIFICATE_NOT_FOUND: string = 'Certificate not found'
const CERTIFICATE_NOT_ENABLED: string = 'Certificate not available for this donor'

export interface CertificateError {
  status: string
  statusCode: number
  message: string
}

// Nothing is piped from this. It exists because the answer has already been written by @Res(), and
// the method still has to hand tsoa a value of the type it declares.
const alreadyAnswered = (): Readable => Readable.from([])

@Route('certificates')
@Tags('Certificates')
export class CertificatesController extends Controller {
  /**
   * Download a donor's certificate as a PDF. Requires no authentication.
   * @param notFound No donor has this id, or the id is not an id at all.
   * @param notEnabled The donor exists, but nobody has turned their certificate on.
   */
  @Get('{donorId}')
  @SuccessResponse(200, 'Certificate rendered successfully', 'application/pdf')
  @Middlewares([rateLimiter.commonLimiter])
  public async getCertificate(
    @Path() donorId: string,
    @Res() notFound: TsoaResponse<404, CertificateError>,
    @Res() notEnabled: TsoaResponse<403, CertificateError>
  ): Promise<Readable> {
    // A malformed id answers exactly as an absent one does. One indistinguishable "not found" tells
    // a caller walking the id space nothing about which ids are even well formed.
    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      notFound(HTTP_STATUS.NOT_FOUND, { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: CERTIFICATE_NOT_FOUND })
      return alreadyAnswered()
    }

    const searchResult: { data?: IDonor; message: string; status: string } = await donorInterface.findDonorByQuery({ _id: donorId })

    if (searchResult.status !== 'OK' || !searchResult.data) {
      notFound(HTTP_STATUS.NOT_FOUND, { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: CERTIFICATE_NOT_FOUND })
      return alreadyAnswered()
    }

    const donor: IDonor = searchResult.data

    // Deliberately NOT the same answer as "not found", unlike the two cases above. That sameness
    // exists to stop someone walking the id space learning which ids are well formed, and it has
    // nothing left to protect here: the id has already resolved to a real donor. The only thing
    // this discloses is that a real donor has not had their certificate turned on, which is what
    // whoever opened the page needs to be told.
    if (!donor.isCertificateEnabled) {
      notEnabled(HTTP_STATUS.FORBIDDEN, { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: CERTIFICATE_NOT_ENABLED })
      return alreadyAnswered()
    }

    // archiveFlag is deliberately not consulted. A graduate is who needs the certificate most, and
    // paper already in their hands must keep verifying.
    return certificateResponse(this, donor)
  }
}

// `inline` rather than `attachment` so the verification page can show the certificate on screen,
// with the filename ready for whoever presses download.
export const certificateResponse = async (controller: Controller, donor: IDonor): Promise<Readable> => {
  const pdf: Buffer = await renderCertificatePdf(donor)

  controller.setStatus(HTTP_STATUS.OK)
  controller.setHeader('Content-Type', 'application/pdf')
  controller.setHeader('Content-Length', String(pdf.length))
  controller.setHeader('Content-Disposition', `inline; filename="${certificateFileName(donor)}"`)

  return Readable.from(pdf)
}
