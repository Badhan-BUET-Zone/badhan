import { Request, Response } from 'express'
import { NotFoundError404 } from '../../response/errorTypes'
import { OKResponse200 } from '../../response/successTypes'
export const deprecatedController = async (req: Request, res: Response) => {
  return res.status(404).send(new NotFoundError404('Please update your app',{}))
}
export const underMaintenanceController = async (req: Request, res: Response) => {
  return res.status(404).send(new NotFoundError404('This feature is currently under maintenance',{}))
}
export const onlineCheckController = async (req: Request, res: Response) => {
  return res.status(200).send(new OKResponse200('Badhan API is online',{}))
}
