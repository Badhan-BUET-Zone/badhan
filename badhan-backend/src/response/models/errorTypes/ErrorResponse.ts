// @ts-nocheck
// tslint:disable
// response status codes are followed using the following documentation
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

export default class ErrorResponse extends Error {
    private status: string;
    private statusCode: number;
    /**
     * @param {string} status - OK, ERROR or EXCEPTION, the summary of the response type
     * @param {number} statusCode - appropriate status code as per the guideline of mozilla
     * @param {string} message - main message as the response
     * @param {object} payload - any extra information to pass to the client
     */
    constructor (status: string, statusCode: number, message: string, payload: object) {
        super()
        this.status = status
        this.statusCode = statusCode
        this.message = message
        if (typeof payload === 'object') {
            Object.assign(this, payload)
        }
    }
}
