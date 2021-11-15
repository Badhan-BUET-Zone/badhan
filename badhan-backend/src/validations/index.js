const { validationResult } = require('express-validator')
const { BadRequestError400 } = require('../response/errorTypes')
const validate = validations => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    return res.respond(new BadRequestError400(errors.array()[0].msg))
  }
}

module.exports = {
  validate
}
/*
rules of using express validator
- no asynchronous calls
 */
