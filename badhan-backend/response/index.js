// response status codes are followed using the following documentation
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
class CustomResponse{
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
    /*
    500 Internal Server Error
    The server has encountered a situation it doesn't know how to handle.
     */
    constructor(message) {
        super("EXCEPTION",500,message);
    }
}

class NotFoundError extends CustomResponse{
    /**
     * @param {string} message - Error message for a not found resource
     */
    /*
    404 Not Found
    The server can not find the requested resource. In the browser, this means the URL is not recognized.
    In an API, this can also mean that the endpoint is valid but the resource itself does not exist.
    Servers may also send this response instead of 403 to hide the existence of a resource from an
    unauthorized client. This response code is probably the most famous one due to its frequent occurrence
    on the web.
     */
    constructor(message) {
        super("ERROR",404,message)
    }
}
class BadRequestError extends CustomResponse{
    /**
     * @param {string} message - Error message for a bad request
     */
    /*
    400 Bad Request
    The server could not understand the request due to invalid syntax.
     */
    constructor(message) {
        super("ERROR",400,message)
    }
}
class ForbiddenError extends CustomResponse{
    /**
     * @param {string} message - Error message for a forbidden request
     */
    /*
    403 Forbidden
    The client does not have access rights to the content; that is, it is unauthorized,
    so the server is refusing to give the requested resource. Unlike 401,
    the client's identity is known to the server.
     */
    constructor(message) {
        super("ERROR",403,message)
    }
}
class UnauthorizedError extends CustomResponse{
    /**
     * @param {string} message - Error message
     */
    /*
    401 Unauthorized
    Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated".
    That is, the client must authenticate itself to get the requested response.
     */
    constructor(message) {
        super("ERROR",401,message)
    }
}
class ConflictError extends CustomResponse{
    /*
    409 Conflict
    This response is sent when a request conflicts with the current state of the server.
     */
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
        super("ERROR",409,message)
    }
}

class SuccessResponse extends CustomResponse{
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
function sendResponse(responseObject) {
    return this.status(responseObject.statusCode).send(responseObject)
}
const routeNotFoundHandler=(req, res, next)=>{return res.sendResponse(new NotFoundError('Route not found'));}

module.exports = {
    DatabaseError,
    InternalServerError,
    NotFoundError,
    CustomResponse,
    BadRequestError,
    SuccessResponse,
    ForbiddenError,
    UnauthorizedError,
    ConflictError,
    sendResponse,
    routeNotFoundHandler
};
