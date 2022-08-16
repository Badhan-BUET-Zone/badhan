// @ts-nocheck
/* tslint:disable */
const { NotFoundError404 } = require('../../response/errorTypes')
const { OKResponse200 } = require('../../response/successTypes')
const deprecatedController = async (req, res) => {
  return res.respond(new NotFoundError404('Please update your app'))
}
const underMaintenanceController = async (req, res) => {
  return res.respond(new NotFoundError404('This feature is currently under maintenance'))
}
const onlineCheckController = async (req, res) => {
  return res.respond(new OKResponse200('Badhan API is online'))
}

module.exports = {
  deprecatedController,
  onlineCheckController,
  underMaintenanceController
}
