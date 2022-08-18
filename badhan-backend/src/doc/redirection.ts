import { Request, Response, NextFunction } from 'express'
export const redirectToDoc = (req: Request, res: Response, next: NextFunction) => {
  return res.redirect('https://badhan-doc.herokuapp.com/')
}
