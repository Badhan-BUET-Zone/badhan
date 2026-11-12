import ErrorResponse from "./ErrorResponse";

export default class PayloadTooLargeError413 extends ErrorResponse {
    /**
     * @param {string} message - Error message describing the size limit that was exceeded
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      413 Content Too Large
      The request body is larger than the server is willing to read.
       */
    constructor (message:string, payload:object) {
        super('ERROR', 413, message, payload)
    }
}
