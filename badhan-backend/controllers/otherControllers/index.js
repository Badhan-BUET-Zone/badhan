const {NotFoundError} = require('../../response/errorTypes');
const deprecatedController = async(req,res,next)=>{
    return res.respond(new NotFoundError("Please update your app for this feature"));
}

module.exports = {
    deprecatedController
}
