import ErrorResponse from "./ErrorResponse";

export default class BadRequestError400 extends ErrorResponse {
    /**
     * @param {string} message - Error message for a bad request
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      400 Bad Request
      The server could not understand the request due to invalid syntax.
       */
    constructor (message: string, payload: object) {
        super('ERROR', 400, message, payload)
    }
}
