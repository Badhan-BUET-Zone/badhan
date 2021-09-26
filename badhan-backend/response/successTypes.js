class BaseSuccessResponse{
    /**
     * @param {string} status - OK, ERROR or EXCEPTION, the summary of the response type
     * @param {number} statusCode - appropriate status code as per the guideline of mozilla
     * @param {string} message - main message as the response
     */
    constructor(status,statusCode,message) {
        this.status = status;
        this.statusCode = statusCode;
        this.message = message;
    }
}

class SuccessResponse extends BaseSuccessResponse{
    /**
     * @param {string} message - success response
     * @param {object} payload - response object for the user
     */
    constructor(message,payload) {
        super("OK",200,message)
        if(typeof payload === 'object'){
            Object.assign(this, payload)
        }
    }
}

module.exports = {
    SuccessResponse,
};
