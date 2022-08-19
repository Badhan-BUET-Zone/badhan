import { Response, Request, NextFunction } from 'express'
import { BadRequestError400 } from './errorTypes'
import { HttpException} from "./models/HttpException";

export function handleJsonBodyParseFailures (err: HttpException, request: Request, response: Response, next: NextFunction) {
  if (err.status === 400) {
    return response.status(400).send(new BadRequestError400('Malformed JSON',{}))
  }
  next()
}

