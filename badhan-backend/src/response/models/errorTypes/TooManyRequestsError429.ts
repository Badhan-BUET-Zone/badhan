import ErrorResponse from "./ErrorResponse";

export default class TooManyRequestsError429 extends ErrorResponse {
    /*
     429 Too Many Requests
     The user has sent too many requests in a given amount of time ("rate limiting").
    */
    /**
     * @param {string} message - Error message
     * @param {object} payload - any extra information to pass to the client
     */
    constructor (message: string, payload: object) {
        super('ERROR', 429, message, payload)
    }
}
