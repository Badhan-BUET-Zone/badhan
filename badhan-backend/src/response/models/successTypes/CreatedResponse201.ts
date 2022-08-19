import BaseSuccessResponse from "./BaseSuccessResponse";

export default class CreatedResponse201 extends BaseSuccessResponse {
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
