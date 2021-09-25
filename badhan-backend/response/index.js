class CustomResponse{
    constructor(status,statusCode,message) {
        this.status = status;
        this.statusCode = statusCode;
        this.message = message;
    }
}

class DatabaseError extends CustomResponse{
    /**
     * @param {string} message - Error message that caused database error
     */
    constructor(message)
    {
        super("EXCEPTION",500,message)
    }
}

class InternalServerError extends CustomResponse{
    /**
     * @param {string} message - Error message that caused internal server error
     */
    constructor(message) {
        super("EXCEPTION",500,message);
    }
}

class NotFoundError extends CustomResponse{
    /**
     * @param {string} message - Error message for a not found resource
     */
    constructor(message) {
        super("ERROR",404,message)
    }
}
class BadRequestError extends CustomResponse{
    /**
     * @param {string} message - Error message for a not found resource
     */
    constructor(message) {
        super("ERROR",400,message)
    }
}

function sendError(responseObject) {
    return this.status(responseObject.statusCode).send(responseObject)
}

module.exports = {
    DatabaseError,
    InternalServerError,
    NotFoundError,
    CustomResponse,
    BadRequestError,
    sendError
};
