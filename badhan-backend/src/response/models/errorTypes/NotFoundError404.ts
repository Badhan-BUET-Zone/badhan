import ErrorResponse from "./ErrorResponse";

export default class NotFoundError404 extends ErrorResponse {
    /**
     * @param {string} message - Error message for a not found resource
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      404 Not Found
      The server can not find the requested resource. In the browser, this means the URL is not recognized.
      In an API, this can also mean that the endpoint is valid but the resource itself does not exist.
      Servers may also send this response instead of 403 to hide the existence of a resource from an
      unauthorized client. This response code is probably the most famous one due to its frequent occurrence
      on the web.
       */
    constructor (message: string, payload: object) {
        super('ERROR', 404, message, payload)
    }
}
