export default class BaseSuccessResponse {
    private status: string;
    private statusCode: number;
    private message: string;
    /**
     * @param {string} status - OK, ERROR or EXCEPTION, the summary of the response type
     * @param {number} statusCode - appropriate status code as per the guideline of mozilla
     * @param {string} message - main message as the response
     * @param {object} payload - additional objects to be sent to client
     */
    constructor (status: string, statusCode: number, message: string, payload: any) {
        this.status = status
        this.statusCode = statusCode
        this.message = message
        if (typeof payload === 'object') {
            Object.assign(this, payload)
        }
    }
}
