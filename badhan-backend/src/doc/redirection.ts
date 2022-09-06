import { Request, Response, NextFunction } from 'express'
export const redirectToDoc = (req: Request, res: Response, _next: NextFunction):void => {
  return res.redirect('https://badhan-doc.herokuapp.com/')
}
