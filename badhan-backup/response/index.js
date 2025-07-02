const { ErrorResponse } = require('./errorTypes')
const { BaseSuccessResponse } = require('./successTypes')
function respond (responseObject) {
  if (responseObject instanceof BaseSuccessResponse || responseObject instanceof ErrorResponse) {
    return this.status(responseObject.statusCode).send(responseObject)
  }
  return this.status(500).send({ message: 'Respond function has received invalid object' })
}

module.exports = {
  respond
}
