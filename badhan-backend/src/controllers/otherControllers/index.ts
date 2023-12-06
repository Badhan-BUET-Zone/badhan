import { Request, Response } from 'express'
import NotFoundError404 from "../../response/models/errorTypes/NotFoundError404";
import OKResponse200 from "../../response/models/successTypes/OKResponse200";
import dotenv from "../../dotenv"
export const deprecatedController = async (req: Request, res: Response): Promise<Response> => {
  return res.status(404).send(new NotFoundError404('Please update your app',{}))
}
export const underMaintenanceController = async (req: Request, res: Response): Promise<Response> => {
  return res.status(404).send(new NotFoundError404('This feature is currently under maintenance',{}))
}
export const onlineCheckController = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send(new OKResponse200(`Badhan backend API is online! environment: ${dotenv.NODE_ENV}`,{}))
}
