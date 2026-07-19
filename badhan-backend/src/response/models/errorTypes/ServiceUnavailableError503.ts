import ErrorResponse from "./ErrorResponse";

export default class ServiceUnavailableError503 extends ErrorResponse {
    /**
     * @param {string} message - Error message describing why the service is unavailable
     * @param {object} payload - any extra information to pass to the client
     */
    /*
      503 Service Unavailable
      The server is not ready to handle the request. Common causes are a server that is
      down for maintenance or that is misconfigured (e.g. missing credentials).
       */
    constructor (message:string, payload:object) {
        super('ERROR', 503, message, payload)
    }
}
