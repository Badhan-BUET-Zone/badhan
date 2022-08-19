import BaseSuccessResponse from "./BaseSuccessResponse";

export default class OKResponse200 extends BaseSuccessResponse {
    /**
     * @param {string} message - success response
     * @param {object} payload - response object for the user
     */

    /*
      200 OK
      The request has succeeded. The meaning of the success depends on the HTTP method:
      GET: The resource has been fetched and is transmitted in the message body.
      HEAD: The representation headers are included in the response without any message body.
      PUT or POST: The resource describing the result of the action is transmitted in the message body.
      TRACE: The message body contains the request message as received by the server.
       */

    constructor (message: string, payload: any) {
        super('OK', 200, message, payload)
    }
}
