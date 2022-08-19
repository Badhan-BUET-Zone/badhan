import {Request, Response, NextFunction} from 'express';
import NotFoundError404 from "./models/errorTypes/NotFoundError404";
import InternalServerError500 from "./models/errorTypes/InternalServerError500";
export const routeNotFoundHandler = (req: Request, res: Response) => {
  return res.status(404).send(new NotFoundError404('Route not found',{}))
}

// https://stackoverflow.com/questions/27567119/typescript-express-middleware
// https://javascript.plainenglish.io/typed-express-request-and-response-with-typescript-7277aea028c
// https://www.codeconcisely.com/posts/how-to-handle-errors-in-express-with-typescript/
// DO NOT REMOVE THE 'next' PARAMTER OF THIS FUNCTION
export const internalServerErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // tslint:disable-next-line:no-console
  console.log('INTERNAL SERVER ERROR')
  // tslint:disable-next-line:no-console
  console.log(error)
  return res.status(500).send(new InternalServerError500('UNCAUGHT ERROR: ' + error.message, error,{}))
}

// https://stackoverflow.com/questions/57132198/unhandledrejection-is-not-assignable-to-parameter-of-type-signals
export const unhandledRejectionHandler = (reason: Error | any, promise: Promise<any>) => {
  // tslint:disable-next-line:no-console
  console.log('UNHANDLED REJECTION')
  // tslint:disable-next-line:no-console
  console.log(reason)
}
export const uncaughtExceptionHandler = (error: Error) => {
  // tslint:disable-next-line:no-console
  console.log('UNCAUGHT EXCEPTION')
  // tslint:disable-next-line:no-console
  console.log(error)
}
