const {NotFoundError,ErrorResponse,InternalServerError} = require('./errorTypes')
const routeNotFoundHandler=(req, res, next)=>{
    return res.respond(new NotFoundError('Route not found'));
}
const internalServerErrorHandler=(error, req, res, next)=>{
    if(error instanceof ErrorResponse){
        return res.respond(error)
    }
    return res.respond(new InternalServerError(error.message));
}
const unhandledRejectionHandler=(reason, promise) => {
    console.log("UNHANDLEDREJECTION")
    console.log(reason);
}
const uncaughtExceptionHandler= (error) => {
    console.log('UNCAUGHTEXCEPTION')
    console.log(error);
}

module.exports = {
    routeNotFoundHandler,
    internalServerErrorHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler
};
