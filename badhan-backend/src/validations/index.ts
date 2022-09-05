import { validationResult, ValidationChain, Result } from 'express-validator'
import {Request, Response, NextFunction} from 'express'
import BadRequestError400 from "../response/models/errorTypes/BadRequestError400";
import {ReadonlyContext} from "express-validator/src/context";
export const validate = (validations: ValidationChain[]):(req: Request, res: Response, next: NextFunction) => Promise<Response | void> => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response|void> => {
    await Promise.all(validations.map((validation:ValidationChain):Promise<Result & { context: ReadonlyContext }> => validation.run(req)))
    const errors: Result = validationResult(req)
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
