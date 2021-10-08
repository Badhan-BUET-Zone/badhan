const bodyParser = require('body-parser');
const {BadRequestError400} = require('../response/errorTypes');
const parseBodyToJSON = async (req, res, next) => {
    bodyParser.json()(req, res, err => {
        if (err) {
            return res.respond(new BadRequestError400("Malformed JSON"));
        }
        next();
    });

}
module.exports = {
    parseBodyToJSON
}
