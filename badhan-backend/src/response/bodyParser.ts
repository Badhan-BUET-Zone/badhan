// @ts-nocheck
/* tslint:disable */
const { BadRequestError400 } = require('../response/errorTypes')
export function handleJsonBodyParseFailures (err, request, response, next) {
  if (err instanceof SyntaxError && err.status === 400) {
    return response.respond(new BadRequestError400('Malformed JSON'))
  }
  next()
}

