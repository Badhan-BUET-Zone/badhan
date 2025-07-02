const { BadRequestError400 } = require('./errorTypes')
function handleJsonBodyParseFailures (err, request, response, next) {
  if (err instanceof SyntaxError && err.status === 400) {
    return response.status(400).send(new BadRequestError400('Malformed JSON'))
  }
  next()
}
module.exports = {
  handleJsonBodyParseFailures
}
