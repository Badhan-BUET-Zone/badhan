import { Response, Request, NextFunction } from 'express'
import BadRequestError400 from "./models/errorTypes/BadRequestError400";
import { HttpException} from "./models/HttpException";
import { HTTP_STATUS } from '../constants'

export const handleJsonBodyParseFailures: (err: HttpException, request: Request, response: Response, next: NextFunction)=> Response|void = (err: HttpException, request: Request, response: Response, next: NextFunction): Response|void => {
  if (err.status === 400) {
    return response.status(HTTP_STATUS.BAD_REQUEST).send(new BadRequestError400('Malformed JSON',{}))
  }
  return next()
}

