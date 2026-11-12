import { Response, Request, NextFunction } from 'express'
import BadRequestError400 from "./models/errorTypes/BadRequestError400";
import PayloadTooLargeError413 from "./models/errorTypes/PayloadTooLargeError413";
import { HttpException} from "./models/HttpException";
import { HTTP_STATUS } from '../constants'

export const handleJsonBodyParseFailures: (err: HttpException, request: Request, response: Response, next: NextFunction)=> Response|void = (err: HttpException, request: Request, response: Response, next: NextFunction): Response|void => {
  if (err.status === 400) {
    return response.status(HTTP_STATUS.BAD_REQUEST).send(new BadRequestError400('Malformed JSON',{}))
  }
  // A body over the parser's limit (100 KB for most routes; see app.ts for the one that takes
  // more). Answered here rather than passed on: next() without the error would let the request
  // reach its route with no body at all, and the route would report a missing field instead.
  if (err.status === HTTP_STATUS.PAYLOAD_TOO_LARGE) {
    return response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).send(new PayloadTooLargeError413('The request body is too large',{}))
  }
  return next()
}
