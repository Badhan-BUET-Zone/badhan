// @ts-nocheck
/* tslint:disable */
import dotenv from '../dotenv'
const tokenCache = require('../cache/tokenCache')
const jwt = require('jsonwebtoken')
const donorInterface = require('../db/interfaces/donorInterface')
const tokenInterface = require('../db/interfaces/tokenInterface')

import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import UnauthorizedError401 from "../response/models/errorTypes/UnauthorizedError401";
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import ForbiddenError403 from "../response/models/errorTypes/ForbiddenError403";

const handleAuthentication = async (req, res, next) => {
  const token = req.header('x-auth')

  try {
    await jwt.verify(token, dotenv.JWT_SECRET)
  } catch (e) {
    return res.status(401).send(new UnauthorizedError401('Invalid Authentication'))
  }

  // check whether donor is already in cache
  const cachedUser = tokenCache.get(token)
  if (cachedUser) {
    res.locals.middlewareResponse = {
      donor: cachedUser,
      token
    }
    return next()
  }

  const tokenCheckResult = await tokenInterface.findTokenDataByToken(token)
  if (tokenCheckResult.status !== 'OK') {
    return res.status(401).send(new UnauthorizedError401('You have been logged out'))
  }

  const tokenData = tokenCheckResult.data

  const findDonorResult = await donorInterface.findDonorById(tokenData.donorId)
  if (findDonorResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500('No user found associated with token', 'Found in handleAuthentication',{}))
  }

  const donor = findDonorResult.data
  // save the donor to cache
  tokenCache.add(token, donor)
  res.locals.middlewareResponse = {
    donor,
    token
  }
  return next()
}

const handleSuperAdminCheck = async (req, res, next) => {
  if (res.locals.middlewareResponse.donor.designation === 3) {
    return next()
  }
  return res.status(403).send(new ForbiddenError403('You are not permitted to access this route'))
}

const handleHallAdminCheck = async (req, res, next) => {
  if (res.locals.middlewareResponse.donor.designation < 2) {
    return res.status(403).send(new ForbiddenError403('You are not permitted to access this route'))
  }
  next()
}

const handleHigherDesignationCheck = async (req, res, next) => {
  if (res.locals.middlewareResponse.donor.designation < res.locals.middlewareResponse.targetDonor.designation &&
        res.locals.middlewareResponse.donor._id !== res.locals.middlewareResponse.targetDonor._id) {
    return res.status(403).send(new ForbiddenError403('You cannot modify the details of a Badhan member with higher designation'))
  }
  next()
}

const handleFetchTargetDonor = async (req, res, next) => {
  /*
    This middleware checks whether the targeted donor is accessible to the logged in user
    Makes sure that the targeted donor id is available in the request
     */
  let donorId
  if (req.body.donorId) {
    donorId = req.body.donorId
  } else if (req.query.donorId) {
    donorId = req.query.donorId
  } else if (req.params.donorId) {
    donorId = req.params.donorId
  }

  const donorQueryResult = await donorInterface.findDonorByQuery({
    _id: donorId
  })
  if (donorQueryResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Donor not found'))
  }
  res.locals.middlewareResponse.targetDonor = donorQueryResult.data
  return next()
}

const handleHallPermissionOrCheckAvailableToAll = async (req, res, next) => {
  const targetDonor = res.locals.middlewareResponse.targetDonor
  if (targetDonor.availableToAll) {
    return next()
  }
  await handleHallPermission(req, res, next)
}

const handleHallPermission = async (req, res, next) => {
  /*
    A super admin can access the data of any hall.
    Every hall admin and volunteer can only access data of their own halls along with the data of
    attached students and covid donors.
     */
  const targetDonor = res.locals.middlewareResponse.targetDonor
  if (targetDonor.hall <= 6 &&
        res.locals.middlewareResponse.donor.hall !== targetDonor.hall &&
        res.locals.middlewareResponse.donor.designation !== 3) {
    return res.status(403).send(new ForbiddenError403('You are not authorized to access a donor of different hall'))
  }
  return next()
}

export default {
  // CHECK PERMISSIONS
  handleAuthentication,
  handleHallAdminCheck,
  handleSuperAdminCheck,
  handleHallPermission,
  handleHigherDesignationCheck,
  handleFetchTargetDonor,
  handleHallPermissionOrCheckAvailableToAll
}
