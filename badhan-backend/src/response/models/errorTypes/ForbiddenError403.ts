import ErrorResponse from "./ErrorResponse";

export default class ForbiddenError403 extends ErrorResponse {
    /**
     * @param {string} message - Error message for a forbidden request
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      403 Forbidden
      The client does not have access rights to the content; that is, it is unauthorized,
      so the server is refusing to give the requested resource. Unlike 401,
      the client's identity is known to the server.
       */
    constructor (message:string, payload:object) {
        super('ERROR', 403, message, payload)
    }
}
