// @ts-nocheck
/* tslint:disable */
import { NotFoundError404 } from '../../response/errorTypes'
import { OKResponse200 } from '../../response/successTypes'
const deprecatedController = async (req, res) => {
  return res.status(404).send(new NotFoundError404('Please update your app'))
}
const underMaintenanceController = async (req, res) => {
  return res.status(404).send(new NotFoundError404('This feature is currently under maintenance'))
}
const onlineCheckController = async (req, res) => {
  return res.status(200).send(new OKResponse200('Badhan API is online'))
}

module.exports = {
  deprecatedController,
  onlineCheckController,
  underMaintenanceController
}
