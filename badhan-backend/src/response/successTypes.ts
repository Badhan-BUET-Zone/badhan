/* tslint:disable:max-classes-per-file */
export class BaseSuccessResponse {
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

export class OKResponse200 extends BaseSuccessResponse {
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

export class CreatedResponse201 extends BaseSuccessResponse {
  /**
   * @param {string} message - success response
   * @param {object} payload - response object for the user
   */

  /*
201 Created
The request has succeeded and a new resource has been created as a result.
This is typically the response sent after POST requests, or some PUT requests.
 */
  constructor (message: string, payload: any) {
    super('OK', 201, message, payload)
  }
}

