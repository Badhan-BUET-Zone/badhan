import * as tokenCache from '../cache/tokenCache'
import dotenv from '../dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {Request, Response} from 'express'

import * as donorInterface from '../db/interfaces/donorInterface'
import * as tokenInterface from '../db/interfaces/tokenInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as emailInterface from '../db/interfaces/emailInterface'

import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import UnauthorizedError401 from "../response/models/errorTypes/UnauthorizedError401";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";
import {JwtPayload} from "../db/models/Token";

const handlePOSTSignIn = async (req: Request, res: Response) => {
  const donorPhone = req.body.phone
  const password = req.body.password
  const donorQueryResult = await donorInterface.findDonorByQuery({ phone: donorPhone })

  if (donorQueryResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Account not found',{}))
  }

  const donor = donorQueryResult.data!

  let matched

  try {
    matched = await bcrypt.compare(password, donor.password!)
  } catch (e) {
    return res.status(404).send(new NotFoundError404('Account not found',{}))
  }

  if (!matched) {
    return res.status(401).send(new UnauthorizedError401('Incorrect phone / password',{}))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500('Token insertion failed', {file:'found in handlePOSTSignIn when tokenInterface.addToken'},{}))
  }
  // add new token to cache
  tokenCache.add(tokenInsertResult.data.token, donor)
  await logInterface.addLog(donor._id, 'POST USERS SIGNIN', {})
  return res.status(201).send(new CreatedResponse201('Signed in successfully', {
    token: tokenInsertResult.data.token
  }))
}

const handleDELETESignOut = async (req: Request, res: Response) => {
  const token = res.locals.middlewareResponse.token
  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteTokenDataByToken(token)
  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT', {})
  return res.status(200).send(new OKResponse200('Logged out successfully',{}))
}

const handleDELETESignOutAll = async (req: Request, res: Response) => {
  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteAllTokensByDonorId(donor._id)

  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT ALL', {})
  return res.status(200).send(new OKResponse200('Logged out from all devices successfully',{}))
}

const handlePOSTRedirection = async (req: Request, res: Response) => {
  const donor = res.locals.middlewareResponse.donor
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, '30s')

  if (tokenInsertResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(tokenInsertResult.message, {file: 'found in handlePOSTRedirection when tokenInterface.addToken'},{}))
  }

  await logInterface.addLog(donor._id, 'POST USERS REDIRECTION', {})

  return res.status(201).send(new CreatedResponse201('Redirection token created', {
    token: tokenInsertResult.data.token
  }))
}

const handlePATCHRedirectedAuthentication = async (req: Request, res: Response) => {
  const token = req.body.token

  let decodedDonor
  try {
    decodedDonor = await jwt.verify(token, dotenv.JWT_SECRET) as JwtPayload
  } catch (e) {
    return res.status(401).send(new UnauthorizedError401('Session Expired',{}))
  }

  const donorQueryResult = await donorInterface.findDonorByQuery({ _id: decodedDonor._id })

  if (donorQueryResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Donor not found',{}))
  }

  const donor = donorQueryResult.data!

  const tokenDeleteResponse = await tokenInterface.deleteTokenDataByToken(token)

  if (tokenDeleteResponse.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Token not found',{}))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(tokenInsertResult.message, {file: 'found in handlePATCHRedirectedAuthentication when tokenInterface.addToken'},{}))
  }
  await logInterface.addLog(donor._id, 'PATCH USERS REDIRECTION', {})

  return res.status(201).send(new CreatedResponse201('Redirected login successful', {
    token: tokenInsertResult.data.token,
    donor
  }))
}

const handlePOSTPasswordForgot = async (req: Request, res: Response) => {
  const phone = req.body.phone
  const queryByPhoneResult = await donorInterface.findDonorByPhone(phone)
  if (queryByPhoneResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Phone number not recognized',{}))
  }

  const donor = queryByPhoneResult.data!
  const email = donor.email

  if (donor.designation === 0) {
    return res.status(404).send(new NotFoundError404('Account not found',{}))
  }

  if (email === '') {
    return res.status(404).send(new NotFoundError404('No recovery email found for this phone number',{}))
  }

  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500('Token insertion failed', {file: 'found in handlePOSTPasswordForgot when tokenInterface.insertAndSaveToken'},{}))
  }

  const emailHtml = emailInterface.generatePasswordForgotHTML(tokenInsertResult.data.token)

  const emailResult = await emailInterface.sendMail(email, 'Password Recovery Email from Badhan', emailHtml)
  if (emailResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(emailResult.message, {error: emailResult.error},{}))
  }

  await logInterface.addLog(donor._id, 'POST USERS PASSWORD FORGOT', {})

  return res.status(200).send(new OKResponse200('A recovery mail has been sent to your email address',{}))
}

const handlePATCHPassword = async (req: Request, res: Response) => {
  const reqBody = req.body
  const donor = res.locals.middlewareResponse.donor
  donor.password = reqBody.password
  await donor.save()

  await tokenInterface.deleteAllTokensByDonorId(donor._id)
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, res.locals.userAgent, null)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH USERS PASSWORD', {})

  return res.status(201).send(new CreatedResponse201('Password changed successfully', {
    token: tokenInsertResult.data.token
  }))
}

const handleGETLogins = async (req: Request, res: Response) => {
  const user = res.locals.middlewareResponse.donor
  const token = res.locals.middlewareResponse.token
  const recentLoginsResult = await tokenInterface.findTokenDataExceptSpecifiedToken(user._id, token)

  const currentTokenDataResult = await tokenInterface.findTokenDataByToken(token)
  if (currentTokenDataResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(currentTokenDataResult.message, {file: 'found in handleGETLogins when tokenInterface.findTokenDataByToken'},{}))
  }

  const currentTokenData = JSON.parse(JSON.stringify(currentTokenDataResult.data))
  delete currentTokenData.token
  delete currentTokenData.expireAt
  delete currentTokenData.donorId
  delete currentTokenData.__v

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET USERS LOGINS', {})
  return res.status(200).send(new OKResponse200('Recent logins fetched successfully', {
    logins: recentLoginsResult.data,
    currentLogin: currentTokenData
  }))
}

const handleDELETELogins = async (req: Request<{tokenId: string},{},{},{}>, res: Response) => {
  const deletedTokenResult = await tokenInterface.deleteByTokenId(req.params.tokenId)
  if (deletedTokenResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Login information not found',{}))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE USERS LOGINS', {})
  return res.status(200).send(new OKResponse200('Logged out from specified device',{}))
}

const handleGETMe = async (req: Request, res: Response) => {
  const donor = res.locals.middlewareResponse.donor

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'ENTERED APP', { name: donor.name })

  return res.status(200).send(new OKResponse200('Fetched donor details successfully', {
    donor
  }))
}

export default {
  // TOKEN HANDLERS
  handlePOSTSignIn,
  handleDELETESignOut,
  handleDELETESignOutAll,
  handlePOSTRedirection,
  handlePATCHRedirectedAuthentication,
  handlePATCHPassword,
  handlePOSTPasswordForgot,
  handleGETLogins,
  handleDELETELogins,
  handleGETMe
}
