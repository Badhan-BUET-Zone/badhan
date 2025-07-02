import ErrorResponse from "./ErrorResponse";

export default class UnauthorizedError401 extends ErrorResponse {
    /**
     * @param {string} message - Error message
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      401 Unauthorized
      Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated".
      That is, the client must authenticate itself to get the requested response.
       */
    constructor (message: string, payload: object) {
        super('ERROR', 401, message, payload)
    }
}
