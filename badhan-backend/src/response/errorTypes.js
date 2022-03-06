// response status codes are followed using the following documentation
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
class ErrorResponse extends Error {
  /**
     * @param {string} status - OK, ERROR or EXCEPTION, the summary of the response type
     * @param {number} statusCode - appropriate status code as per the guideline of mozilla
     * @param {string} message - main message as the response
     * @param {object} payload - any extra information to pass to the client
     */
  constructor (status, statusCode, message, payload) {
    super()
    this.status = status
    this.statusCode = statusCode
    this.message = message
    if (typeof payload === 'object') {
      Object.assign(this, payload)
    }
  }
}

class InternalServerError500 extends ErrorResponse {
  /**
     * @param {string} message - Error message that caused internal server error
     * @param {object} payload - any extra information to pass to the client
     */
  /*
    500 Internal Server Error
    The server has encountered a situation it doesn't know how to handle.
     */
  constructor (message, details, payload) {
    super('EXCEPTION', 500, message, payload)
    this.details = details
  }
}

class NotFoundError404 extends ErrorResponse {
  /**
     * @param {string} message - Error message for a not found resource
     * @param {object} payload - any extra information to pass to the client
     */
  /*
    404 Not Found
    The server can not find the requested resource. In the browser, this means the URL is not recognized.
    In an API, this can also mean that the endpoint is valid but the resource itself does not exist.
    Servers may also send this response instead of 403 to hide the existence of a resource from an
    unauthorized client. This response code is probably the most famous one due to its frequent occurrence
    on the web.
     */
  constructor (message, payload) {
    super('ERROR', 404, message, payload)
  }
}
class BadRequestError400 extends ErrorResponse {
  /**
     * @param {string} message - Error message for a bad request
     * @param {object} payload - any extra information to pass to the client
     */
  /*
    400 Bad Request
    The server could not understand the request due to invalid syntax.
     */
  constructor (message, payload) {
    super('ERROR', 400, message, payload)
  }
}
class ForbiddenError403 extends ErrorResponse {
  /**
     * @param {string} message - Error message for a forbidden request
     * @param {object} payload - any extra information to pass to the client
     */
  /*
    403 Forbidden
    The client does not have access rights to the content; that is, it is unauthorized,
    so the server is refusing to give the requested resource. Unlike 401,
    the client's identity is known to the server.
     */
  constructor (message, payload) {
    super('ERROR', 403, message, payload)
  }
}
class UnauthorizedError401 extends ErrorResponse {
  /**
     * @param {string} message - Error message
     * @param {object} payload - any extra information to pass to the client
     */
  /*
    401 Unauthorized
    Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated".
    That is, the client must authenticate itself to get the requested response.
     */
  constructor (message, payload) {
    super('ERROR', 401, message, payload)
  }
}
class ConflictError409 extends ErrorResponse {
  /*
    409 Conflict
    This response is sent when a request conflicts with the current state of the server.
     */
  /**
     * @param {string} message - Error message
   * @param {object} payload - any extra information to pass to the client
     */
  constructor (message, payload) {
    console.log(payload)
    super('ERROR', 409, message, payload)
  }
}
class TooManyRequestsError429 extends ErrorResponse {
  /*
    429 Too Many Requests
    The user has sent too many requests in a given amount of time ("rate limiting").

     */
  /**
     * @param {string} message - Error message
   * @param {object} payload - any extra information to pass to the client
     */
  constructor (message, payload) {
    super('ERROR', 429, message, payload)
  }
}

module.exports = {
  InternalServerError500,
  NotFoundError404,
  ErrorResponse,
  BadRequestError400,
  ForbiddenError403,
  UnauthorizedError401,
  ConflictError409,
  TooManyRequestsError429
}
