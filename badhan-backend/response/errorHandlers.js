const {NotFoundError,InternalServerError500} = require('./errorTypes')
const routeNotFoundHandler=(req, res, next)=>{
    return res.respond(new NotFoundError('Route not found'));
}
const internalServerErrorHandler=(error, req, res, next)=>{
    console.log("INTERNAL SERVER ERROR");
    console.log(error);
    return res.respond(new InternalServerError500("UNCAUGHT ERROR: "+error.message));
}
const unhandledRejectionHandler=(reason, promise) => {
    console.log("UNHANDLED REJECTION")
    console.log(reason);
}
const uncaughtExceptionHandler= (error) => {
    console.log('UNCAUGHT EXCEPTION')
    console.log(error);
}

module.exports = {
    routeNotFoundHandler,
    internalServerErrorHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler
};
