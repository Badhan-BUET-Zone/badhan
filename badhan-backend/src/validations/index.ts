// @ts-nocheck
/* tslint:disable */
const { validationResult } = require('express-validator')
import { BadRequestError400 } from '../response/errorTypes'
const validate = validations => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    return res.status(400).send(new BadRequestError400(errors.array()[0].msg))
  }
}

module.exports = {
  validate
}
/*
rules of using express validator
- no asynchronous calls
 */
