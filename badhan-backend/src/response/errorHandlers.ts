import {Request, Response, NextFunction} from 'express';
import NotFoundError404 from "./models/errorTypes/NotFoundError404";
import InternalServerError500 from "./models/errorTypes/InternalServerError500";
import myConsole from "./myConsole";
export const routeNotFoundHandler: (req: Request, res: Response)=>Response = (req: Request, res: Response):Response => {
  return res.status(404).send(new NotFoundError404('Route not found',{}))
}

// https://stackoverflow.com/questions/27567119/typescript-express-middleware
// https://javascript.plainenglish.io/typed-express-request-and-response-with-typescript-7277aea028c
// https://www.codeconcisely.com/posts/how-to-handle-errors-in-express-with-typescript/
// DO NOT REMOVE THE 'next' PARAMTER OF THIS FUNCTION
export const internalServerErrorHandler: (error: Error, req: Request, res: Response, _next: NextFunction)=>Response = (error: Error, req: Request, res: Response, _next: NextFunction):Response => {
  myConsole.log('INTERNAL SERVER ERROR')
  myConsole.log(error)
  return res.status(500).send(new InternalServerError500('UNCAUGHT ERROR: ' + error.message, error,{}))
}

// https://stackoverflow.com/questions/57132198/unhandledrejection-is-not-assignable-to-parameter-of-type-signals
export const unhandledRejectionHandler = (reason: Error | any, _promise: Promise<any>):void => {
  myConsole.log('UNHANDLED REJECTION')
  myConsole.log(reason)
}
export const uncaughtExceptionHandler: (error: Error)=> void = (error: Error): void => {
  myConsole.log('UNCAUGHT EXCEPTION')
  myConsole.log(error)
}
