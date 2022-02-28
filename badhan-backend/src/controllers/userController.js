const tokenCache = require('../cache/tokenCache')
const dotenv = require('../dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const donorInterface = require('../db/interfaces/donorInterface')
const tokenInterface = require('../db/interfaces/tokenInterface')
const logInterface = require('../db/interfaces/logInterface')
const emailInterface = require('../db/interfaces/emailInterface')

const {
  InternalServerError500,
  NotFoundError404,
  UnauthorizedError401
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

const handlePOSTSignIn = async (req, res) => {
  const donorPhone = req.body.phone
  const password = req.body.password
  const donorQueryResult = await donorInterface.findDonorByQuery({ phone: donorPhone }, {})

  if (donorQueryResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Account not found'))
  }

  const donor = donorQueryResult.data

  let matched

  try {
    matched = await bcrypt.compare(password, donor.password)
  } catch (e) {
    return res.respond(new NotFoundError404('Account not found'))
  }

  if (!matched) {
    return res.respond(new UnauthorizedError401('Incorrect phone / password'))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Token insertion failed', 'found in handlePOSTSignIn when tokenInterface.addToken'))
  }
  // add new token to cache
  tokenCache.add(tokenInsertResult.data.token, donor)
  await logInterface.addLog(donor._id, 'POST USERS SIGNIN', {})
  return res.respond(new CreatedResponse201('Successfully signed in', {
    token: tokenInsertResult.data.token
  }))
}

const handleDELETESignOut = async (req, res) => {
  const token = res.locals.middlewareResponse.token
  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteTokenDataByToken(token, donor._id)
  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT', {})
  return res.respond(new OKResponse200('Logged out successfully'))
}

const handleDELETESignOutAll = async (req, res) => {
  const donor = res.locals.middlewareResponse.donor

  // did not analyze the result because the route wouldn't reach this point if the token was not in the database
  await tokenInterface.deleteAllTokensByDonorId(donor._id)

  await logInterface.addLog(donor._id, 'DELETE USERS SIGNOUT ALL', {})
  return res.respond(new OKResponse200('Logged out from all devices successfully'))
}

const handlePOSTRedirection = async (req, res) => {
  const donor = res.locals.middlewareResponse.donor
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, '30s')

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenInsertResult.message, 'found in handlePOSTRedirection when tokenInterface.addToken'))
  }

  await logInterface.addLog(donor._id, 'POST USERS REDIRECTION', {})

  return res.respond(new CreatedResponse201('Redirection token created', {
    token: tokenInsertResult.data.token
  }))
}

const handlePATCHRedirectedAuthentication = async (req, res) => {
  const token = req.body.token

  let decodedDonor
  try {
    decodedDonor = await jwt.verify(token, dotenv.JWT_SECRET)
  } catch (e) {
    return res.respond(new UnauthorizedError401('Session Expired'))
  }

  const donorQueryResult = await donorInterface.findDonorByQuery({ _id: decodedDonor._id }, {})

  if (donorQueryResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Donor not found'))
  }

  const donor = donorQueryResult.data

  const tokenDeleteResponse = await tokenInterface.deleteTokenDataByToken(token, donor._id)

  if (tokenDeleteResponse.status !== 'OK') {
    return res.respond(new NotFoundError404('Token not found'))
  }
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenInsertResult.message, 'found in handlePATCHRedirectedAuthentication when tokenInterface.addToken'))
  }
  await logInterface.addLog(donor._id, 'PATCH USERS REDIRECTION', {})

  return res.respond(new CreatedResponse201('Redirected login successful', {
    token: tokenInsertResult.data.token,
    donor
  }))
}

const handlePOSTPasswordForgot = async (req, res) => {
  const phone = req.body.phone
  const queryByPhoneResult = await donorInterface.findDonorByPhone(phone)
  if (queryByPhoneResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Phone number not recognized'))
  }

  const donor = queryByPhoneResult.data
  const email = donor.email

  if (donor.designation === 0) {
    return res.respond(new NotFoundError404('Account not found'))
  }

  if (email === '') {
    return res.respond(new NotFoundError404('No recovery email found for this phone number'))
  }

  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)

  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Token insertion failed', 'found in handlePOSTPasswordForgot when tokenInterface.insertAndSaveToken'))
  }

  const emailHtml = emailInterface.generatePasswordForgotHTML(tokenInsertResult.data.token)

  const result = await emailInterface.sendMail(email, 'Password Recovery Email from Badhan', emailHtml)
  if (result.status !== 'OK') {
    return res.respond(new InternalServerError500(result.message, 'found in handlePOSTPasswordForgot when emailInterface.sendMail'))
  }

  await logInterface.addLog(donor._id, 'POST USERS PASSWORD FORGOT', {})

  return res.respond(new OKResponse200('A recovery mail has been sent to your email address'))
}

const handlePATCHPassword = async (req, res) => {
  const reqBody = req.body
  const donor = res.locals.middlewareResponse.donor
  donor.password = reqBody.password
  await donor.save()

  await tokenInterface.deleteAllTokensByDonorId(donor._id)
  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH USERS PASSWORD', {})

  return res.respond(new CreatedResponse201('Password changed successfully', {
    token: tokenInsertResult.data.token
  }))
}

const handleGETLogins = async (req, res) => {
  const user = res.locals.middlewareResponse.donor
  const token = res.locals.middlewareResponse.token
  const recentLoginsResult = await tokenInterface.findTokenDataExceptSpecifiedToken(user._id, token)

  const currentTokenDataResult = await tokenInterface.findTokenDataByToken(token)
  if (currentTokenDataResult.status !== 'OK') {
    return res.respond(new InternalServerError500(currentTokenDataResult.message, 'found in handleGETLogins when tokenInterface.findTokenDataByToken'))
  }

  const currentTokenData = JSON.parse(JSON.stringify(currentTokenDataResult.data))
  delete currentTokenData.token
  delete currentTokenData.expireAt
  delete currentTokenData.donorId
  delete currentTokenData.__v

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET USERS LOGINS', {})
  return res.respond(new OKResponse200('Recent logins fetched successfully', {
    logins: recentLoginsResult.data,
    currentLogin: currentTokenData
  }))
}

const handleDELETELogins = async (req, res) => {
  const deletedTokenResult = await tokenInterface.deleteByTokenId(req.params.tokenId)
  if (deletedTokenResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Login information not found'))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE USERS LOGINS', {})
  return res.respond(new OKResponse200('Logged out from specified device'))
}

const handleGETMe = async (req, res) => {
  const donor = res.locals.middlewareResponse.donor

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'ENTERED APP', { name: donor.name })

  return res.respond(new OKResponse200('Successfully fetched donor details', {
    donor
  }))
}

module.exports = {
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
