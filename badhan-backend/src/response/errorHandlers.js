const { NotFoundError404, InternalServerError500 } = require('./errorTypes')
const routeNotFoundHandler = (req, res) => {
  return res.respond(new NotFoundError404('Route not found'))
}
// DO NOT REMOVE THE 'next' PARAMTER OF THIS FUNCTION
const internalServerErrorHandler = (error, req, res, next) => {
  console.log('INTERNAL SERVER ERROR')
  console.log(error)
  return res.respond(new InternalServerError500('UNCAUGHT ERROR: ' + error.message, error))
}
const unhandledRejectionHandler = (reason, promise) => {
  console.log('UNHANDLED REJECTION')
  console.log(reason)
}
const uncaughtExceptionHandler = (error) => {
  console.log('UNCAUGHT EXCEPTION')
  console.log(error)
}

module.exports = {
  routeNotFoundHandler,
  internalServerErrorHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler
}
