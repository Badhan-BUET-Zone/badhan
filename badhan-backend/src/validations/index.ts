// @ts-nocheck
// tslint:disable
import { validationResult, ValidationChain } from 'express-validator'
import {Request, Response, NextFunction} from 'express'
import BadRequestError400 from "../response/models/errorTypes/BadRequestError400";
export const validate = (validations: ValidationChain[]):(req: Request, res: Response, next: NextFunction) => Promise<Response | void> => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response|void> => {
    await Promise.all(validations.map(validation => validation.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    return res.status(400).send(new BadRequestError400(errors.array()[0].msg,{}))
  }
}

/*
rules of using express validator
- no asynchronous calls
 */
