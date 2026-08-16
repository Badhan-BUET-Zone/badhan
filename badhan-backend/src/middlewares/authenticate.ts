import dotenv from '../dotenv'
import * as tokenCache from '../cache/tokenCache'
import jwt from 'jsonwebtoken'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as tokenInterface from '../db/interfaces/tokenInterface'
import {Request, Response, NextFunction, RequestHandler} from 'express'

import UnauthorizedError401 from "../response/models/errorTypes/UnauthorizedError401";
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import ForbiddenError403 from "../response/models/errorTypes/ForbiddenError403";
import {IDonor} from "../db/models/Donor";
import {IToken} from "../db/models/Token";
import {DESIGNATIONS_INDEX, isHallRestricted} from "../constants";
import { HTTP_STATUS } from '../constants'

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-auth
 *
 */
const handleAuthentication = async (req: Request, res: Response, next:  NextFunction):Promise<Response|void> => {
  const token: string = req.header('x-auth')!

  try {
    await jwt.verify(token, dotenv.JWT_SECRET)
  } catch (e) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).send(new UnauthorizedError401('Invalid Authentication',{}))
  }

  // check whether donor is already in cache
  const cachedUser: IDonor = tokenCache.get(token)!
  if (cachedUser) {
    res.locals.middlewareResponse = {
      donor: cachedUser,
      token
    }
    return next()
  }

  const tokenCheckResult: {data?: IToken, message: string, status: string} = await tokenInterface.findTokenDataByToken(token)
  if (tokenCheckResult.status !== 'OK' || !tokenCheckResult.data) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).send(new UnauthorizedError401('You have been logged out',{}))
  }

  const tokenData: IToken = tokenCheckResult.data

  const findDonorResult: {message: string, status: string, data?: IDonor} = await donorInterface.findDonorById(tokenData.donorId)
  if (findDonorResult.status !== 'OK' || !findDonorResult.data) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(new InternalServerError500('No user found associated with token', {file:'Found in handleAuthentication'},{}))
  }

  const donor: IDonor = findDonorResult.data
  // save the donor to cache
  tokenCache.add(token, donor)
  res.locals.middlewareResponse = {
    donor,
    token
  }
  return next()
}

/**
 * Authentication that applies only to a request which states a `hall`.
 *
 * The feedback mint route is public: a donor arriving from a printed QR code has no session
 * and must still get 200. But stating a hall is a permissioned act — it is how a member asks
 * for a registration code aimed at a hall — so a body carrying one has to identify its caller.
 *
 * THE BRANCH IS KEYED ON THE BODY, NEVER ON WHETHER AN x-auth HEADER HAPPENS TO BE PRESENT.
 * A request with no hall is treated identically whether or not somebody is signed in, which is
 * what keeps the route's public behaviour one thing rather than two. Do not "improve" this into
 * "authenticate when a token is present": that makes an anonymous route's answer depend on a
 * header, which is exactly what it must not do.
 *
 * Place it AFTER the body validator in the middleware chain, so `hall` has already been checked
 * and coerced by the time this reads it: a malformed hall is then a 400 and not a 401.
 */
const handleAuthenticationIfHallStated = async (req: Request, res: Response, next: NextFunction): Promise<Response|void> => {
  if (req.body === undefined || req.body === null || req.body.hall === undefined || req.body.hall === null) {
    return next()
  }
  return handleAuthentication(req, res, next)
}

const handleSuperAdminCheck = async (req: Request, res: Response, next:  NextFunction):Promise<Response|void> => {
  if (res.locals.middlewareResponse.donor.designation === DESIGNATIONS_INDEX.SUPER_ADMIN) {
    return next()
  }
  return res.status(HTTP_STATUS.FORBIDDEN).send(new ForbiddenError403('You are not permitted to access this route',{}))
}

const handleHallAdminCheck = async (req: Request, res: Response, next:  NextFunction):Promise<Response|void> => {
  if (res.locals.middlewareResponse.donor.designation < DESIGNATIONS_INDEX.HALL_ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).send(new ForbiddenError403('Only hall admins or above can access this route',{}))
  }
  next()
}

const handleHigherDesignationCheck = async (req: Request, res: Response, next:  NextFunction):Promise<Response|void> => {
  if (res.locals.middlewareResponse.donor.designation < res.locals.middlewareResponse.targetDonor.designation &&
        res.locals.middlewareResponse.donor._id !== res.locals.middlewareResponse.targetDonor._id) {
    return res.status(HTTP_STATUS.FORBIDDEN).send(new ForbiddenError403('You cannot modify the details of a Badhan member with higher designation',{}))
  }
  next()
}


const handleHallPermissionOrCheckAvailableToAll = async (req: Request, res: Response, next:  NextFunction): Promise<Response|void> => {
  const targetDonor: IDonor = res.locals.middlewareResponse.targetDonor
  if (targetDonor.availableToAll) {
    return next()
  }
  await handleHallPermission(req, res, next)
}

const handleHallPermission = async (req: Request, res: Response, next:  NextFunction): Promise<Response|void> => {
  /*
    A super admin can access the data of any hall.
    Every hall admin and volunteer can only access data of their own halls along with the data of
    attached students and covid donors.
     */
  const targetDonor: IDonor = res.locals.middlewareResponse.targetDonor
  if (isHallRestricted(targetDonor.hall) &&
        res.locals.middlewareResponse.donor.hall !== targetDonor.hall &&
        res.locals.middlewareResponse.donor.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).send(new ForbiddenError403('You are not authorized to access a donor of different hall',{}))
  }
  return next()
}

export default {
  // CHECK PERMISSIONS
  handleAuthentication,
  handleAuthenticationIfHallStated,
  handleHallAdminCheck,
  handleSuperAdminCheck,
  handleHallPermission,
  handleHigherDesignationCheck,
  handleHallPermissionOrCheckAvailableToAll
}
