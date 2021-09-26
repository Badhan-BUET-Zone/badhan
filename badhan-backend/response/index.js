function sendResponse(responseObject) {
    return this.status(responseObject.statusCode).send(responseObject)
}

module.exports = {
    sendResponse,
};
