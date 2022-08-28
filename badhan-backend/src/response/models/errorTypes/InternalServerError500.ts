// @ts-nocheck
// tslint:disable
import ErrorResponse from "./ErrorResponse";

export default class InternalServerError500 extends ErrorResponse {
    /**
     * @param {string} message - Error message that caused internal server error
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      500 Internal Server Error
      The server has encountered a situation it doesn't know how to handle.
       */
    private details: any;
    constructor (message: string, details: object, payload: object) {
        super('EXCEPTION', 500, message, payload)
        this.details = details
    }
}
