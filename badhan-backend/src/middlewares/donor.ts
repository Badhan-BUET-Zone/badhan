import {Request, Response, NextFunction} from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import NotFoundError404 from '../response/models/errorTypes/NotFoundError404'
import {IDonor} from '../db/models/Donor'
import { HTTP_STATUS } from '../constants'

export const loadTargetDonor = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  /*
    This middleware checks whether the targeted donor is accessible to the logged-in user
    Makes sure that the targeted donor id is available in the request
  */
  let donorId: string = ""
  if (req.body.donorId) {
    donorId = req.body.donorId
  } else if (req.query.donorId) {
    donorId = String(req.query.donorId)
  } else if (req.params.donorId) {
    donorId = req.params.donorId
  }

  const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({
    _id: donorId
  })
  if (donorQueryResult.status !== 'OK') {
    return res.status(HTTP_STATUS.NOT_FOUND).send(new NotFoundError404('Donor not found', {}))
  }
  res.locals.middlewareResponse.targetDonor = donorQueryResult.data
  return next()
}


