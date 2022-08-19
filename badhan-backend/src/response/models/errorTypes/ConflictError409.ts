import ErrorResponse from "./ErrorResponse";

export default class ConflictError409 extends ErrorResponse {
    /*
      409 Conflict
      This response is sent when a request conflicts with the current state of the server.
       */
    /**
     * @param {string} message - Error message
     * @param {object} payload - any extra information to pass to the client
     */
    constructor (message: string, payload: object) {
        super('ERROR', 409, message, payload)
    }
}
