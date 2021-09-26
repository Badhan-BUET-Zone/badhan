function respond(responseObject) {
    return this.status(responseObject.statusCode).send(responseObject)
}

module.exports = {
    respond,
};
