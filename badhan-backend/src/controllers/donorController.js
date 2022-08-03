// const util = require('util')
const donorInterface = require('../db/interfaces/donorInterface')
const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const tokenInterface = require('../db/interfaces/tokenInterface')
const emailInterface = require('../db/interfaces/emailInterface')
const {
  halls,
  designationNumber,
  MASTER_ADMIN_ID
} = require('../constants')

const {
  InternalServerError500,
  ForbiddenError403,
  NotFoundError404,
  ConflictError409
} = require('../response/errorTypes')
const {
  CreatedResponse201,
  OKResponse200
} = require('../response/successTypes')
const constants = require('../constants')

const handlePOSTDonors = async (req, res) => {
  const authenticatedUser = res.locals.middlewareResponse.donor

  const duplicateDonorResult = await donorInterface.findDonorByPhone(req.body.phone)

  if (duplicateDonorResult.status === 'OK') {
    if (
      authenticatedUser.designation === 3 ||
      duplicateDonorResult.data.hall === authenticatedUser.hall ||
      duplicateDonorResult.data.hall > 6 ||
      duplicateDonorResult.data.availableToAll === true
    ) {
      return res.respond(new ConflictError409('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + ' hall', {
        donorId: duplicateDonorResult.data._id
      }))
    }
    return res.respond(new ConflictError409('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + ' hall. You are not permitted to access this donor.', {}))
  }

  // if the hall is unknown, then the donor must be available to all
  let availableToAll = req.body.availableToAll
  if (req.body.hall === 8) {
    availableToAll = true
  }

  const donorObject = {
    phone: req.body.phone,
    bloodGroup: req.body.bloodGroup,
    hall: req.body.hall,
    name: req.body.name,
    studentId: req.body.studentId,
    address: req.body.address,
    roomNumber: req.body.roomNumber,
    lastDonation: 0,
    comment: req.body.comment,
    availableToAll: availableToAll
  }

  const donorInsertionResult = await donorInterface.insertDonor(donorObject)
  if (donorInsertionResult.status !== 'OK') {
    return res.respond(new InternalServerError500('New donor insertion unsuccessful'))
  }

  const dummyDonations = []
  for (let i = 0; i < req.body.extraDonationCount; i++) {
    dummyDonations.push({
      phone: donorInsertionResult.data.phone,
      donorId: donorInsertionResult.data._id,
      date: 0
    })
  }

  const dummyInsertionResult = await donationInterface.insertManyDonations(dummyDonations)

  if (dummyInsertionResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Dummy donations insertion unsuccessful'))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST DONORS', donorInsertionResult.data)
  return res.respond(new CreatedResponse201('New donor inserted successfully', {
    newDonor: donorInsertionResult.data
  }))
}

const handleDELETEDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor

  if (donor.designation > 1) {
    return res.respond(new ConflictError409('Donor must be demoted for deletion', {}))
  }

  const deleteDonorResult = await donorInterface.deleteDonorById(donor._id)
  if (deleteDonorResult.status !== 'OK') {
    return res.respond(new InternalServerError500('Error occurred in deleting target donor'))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE DONORS', deleteDonorResult.data)

  return res.respond(new OKResponse200('Donor deleted successfully'))
}

const handleGETSearchOptimized = async (req, res) => {
  const reqQuery = req.query

  // console.log(util.inspect(reqQuery, false, null, true /* enable colors */))

  if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall &&
    reqQuery.hall <= 6 &&
    res.locals.middlewareResponse.donor.designation !== 3) {
    return res.respond(new ForbiddenError403('You are not allowed to search donors of other halls'))
  }

  // console.log(util.inspect(queryBuilder, false, null, true /* enable colors */))

  const result = await donorInterface.findDonorsByQuery(reqQuery)

  result.data.sort((donor1, donor2) =>
    donor1.donationCountOptimized >= donor2.donationCountOptimized ? -1 : 1
  )
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET SEARCH', {
    filter: reqQuery,
    resultCount: result.data.length
  })

  return res.respond(new OKResponse200('Donors queried successfully', {
    filteredDonors: result.data
  }))
}

const handleGETSearchV3 = async (req, res) => {
  const reqQuery = req.query
  // console.log(util.inspect(reqQuery, false, null, true /* enable colors */))

  if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall &&
    reqQuery.hall <= 6 &&
    res.locals.middlewareResponse.donor.designation !== 3) {
    return res.respond(new ForbiddenError403('You are not allowed to search donors of other halls'))
  }

  // console.log(util.inspect(queryBuilder, false, null, true /* enable colors */))

  const result = await donorInterface.findDonorsByAggregate(reqQuery)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET SEARCH V3', {
    filter: reqQuery,
    resultCount: result.data.length
  })

  return res.respond(new OKResponse200('Donors queried successfully', {
    filteredDonors: result.data
  }))
}

const handlePATCHDonorsComment = async (req, res) => {
  const targetDonor = res.locals.middlewareResponse.targetDonor

  targetDonor.comment = req.body.comment
  targetDonor.commentTime = new Date().getTime()
  await targetDonor.save()
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH DONORS COMMENT', targetDonor)
  return res.respond(new OKResponse200('Comment updated successfully'))
}

const handlePATCHDonorsPassword = async (req, res) => {
  const reqBody = req.body
  const target = res.locals.middlewareResponse.targetDonor
  if (target.designation === 0) {
    return res.respond(new ConflictError409('Target user does not have an account', {}))
  }

  target.password = reqBody.password

  await target.save()

  await tokenInterface.deleteAllTokensByDonorId(target._id)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH DONORS PASSWORD', { name: target.name })
  return res.respond(new OKResponse200('Password changed successfully'))
}

const handlePATCHDonors = async (req, res) => {
  const reqBody = req.body

  const target = res.locals.middlewareResponse.targetDonor
  const user = res.locals.middlewareResponse.donor

  if (reqBody.email !== '' && !await emailInterface.checkIfEmailExists(reqBody.email)) {
    return res.respond(new NotFoundError404('Email address does not exist'))
  }

  if (target.email !== reqBody.email && !target._id.equals(user._id)) {
    return res.respond(new ForbiddenError403('You do not have permission to edit email address of another user'))
  }

  target.name = reqBody.name
  target.phone = reqBody.phone
  target.studentId = reqBody.studentId
  target.bloodGroup = reqBody.bloodGroup
  target.hall = reqBody.hall
  target.roomNumber = reqBody.roomNumber
  target.address = reqBody.address
  target.availableToAll = reqBody.availableToAll
  target.email = reqBody.email

  if (target.hall === 8) {
    target.availableToAll = true
  }

  await target.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH DONORS', target)
  return res.respond(new OKResponse200('Donor updated successfully'))
}

const handlePATCHDonorsDesignation = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor
  const donorDesignation = donor.designation
  if (donorDesignation === designationNumber.SUPER_ADMIN && req.body.promoteFlag) {
    return res.respond(new ConflictError409('Can\'t promote super admin'))
  }

  if(donorDesignation === designationNumber.DONOR && !req.body.promoteFlag){
    return res.respond(new ConflictError409('Can\'t demote donor'))
  }

  if(donorDesignation === designationNumber.HALL_ADMIN){
    return res.respond(new ConflictError409('This route is not applicable for hall admins'))
  }

  if (donor.hall > 6) {
    return res.respond(new ConflictError409('Donor does not have a valid hall'))
  }

  if (donor._id.equals(constants.MASTER_ADMIN_ID)) {
    return res.respond(new ConflictError409('Cannot call route on master admin'))
  }

  if (req.body.promoteFlag) {
    if ( donorDesignation === designationNumber.DONOR){
      donor.designation = designationNumber.VOLUNTEER
    }else if(donorDesignation === designationNumber.VOLUNTEER){
      donor.designation = designationNumber.SUPER_ADMIN
    }
  } else {
    if ( donorDesignation === designationNumber.VOLUNTEER){
      donor.designation = designationNumber.DONOR
    }else if(donorDesignation === designationNumber.SUPER_ADMIN){
      donor.designation = designationNumber.VOLUNTEER
    }
  }

  await donor.save()

  let logOperation = ''
  if (req.body.promoteFlag) {
    logOperation = 'PROMOTE'
  } else {
    logOperation = 'DEMOTE'
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH DONORS DESIGNATION (' + logOperation + ')', donor)
  return res.respond(new OKResponse200('Target user promoted/demoted successfully',{
    donor
  }))
}

const handlePATCHAdmins = async (req, res) => {
  const targetDonor = res.locals.middlewareResponse.targetDonor

  if (targetDonor.designation !== 1) {
    return res.respond(new ConflictError409('User is not a volunteer'))
  }

  if (targetDonor.hall > 6) {
    return res.respond(new ConflictError409('User does not have a valid hall'))
  }
  await donorInterface.findDonorAndUpdate({
    hall: targetDonor.hall,
    designation: 2
  }, {
    $set: { designation: 1 }
  })

  // Make new hall admin
  targetDonor.designation = 2
  await targetDonor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'PATCH DONORS DESIGNATION (VOLUNTEER)', { name: targetDonor.name })
  return res.respond(new OKResponse200('Changed hall admin successfully'))
}

const handleGETDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor
  await donor.populate([
    {
      path: 'donations',
      options: { sort: { date: -1 } }
    },
    {
      path: 'callRecords',
      populate: {
        path: 'callerId',
        select: {
          _id: 1,
          name: 1,
          hall: 1,
          designation: 1
        }
      },
      options: { sort: { date: -1 } }
    },
    {
      path: 'publicContacts',
      select: {
        _id: 1,
        bloodGroup: 1
      }
    },
    {
      path: 'markedBy',
      select: {
        markerId: 1,
        time: 1,
        _id: 0
      },
      populate: {
        path: 'markerId',
        model: 'Donor',
        select: { name: 1 }
      }
    }
  ])

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET DONORS', { name: donor.name })

  return res.respond(new OKResponse200('Fetched donor details successfully', {
    donor
  }))
}

const handleGETDesignatedDonorsAll = async (req, res) => {
  const allDesignatedDonorResult = await donorInterface.findAllDesignatedDonors()

  if (allDesignatedDonorResult.status !== 'OK') {
    return res.respond(new InternalServerError500(allDesignatedDonorResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET DONORS DESIGNATION ALL', {})

  return res.respond(new OKResponse200('Fetched donor details successfully', {
    data: allDesignatedDonorResult.data
  }))
}

const handleGETDonorsDuplicate = async (req, res) => {
  const authenticatedUser = res.locals.middlewareResponse.donor

  const duplicateDonorResult = await donorInterface.findDonorByPhone(req.query.phone)

  if (duplicateDonorResult.status === 'OK') {
    if (
      authenticatedUser.designation === 3 ||
      duplicateDonorResult.data.hall === authenticatedUser.hall ||
      duplicateDonorResult.data.hall > 6 ||
      duplicateDonorResult.data.availableToAll === true
    ) {
      return res.respond(new OKResponse200('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + ' hall', {
        found: true,
        donor: duplicateDonorResult.data
      }))
    }

    return res.respond(new OKResponse200('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + ' hall. You are not permitted to access this donor.', {
      found: true,
      donor: null
    }))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET DONORS CHECKDUPLICATE', { phone: req.query.phone })

  return res.respond(new OKResponse200('No duplicate donors found', {
    found: false,
    donor: null
  }))
}

const handlePOSTDonorsPasswordRequest = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor

  if (donor.designation === 0) {
    return res.respond(new ConflictError409('Donor is not a volunteer/ admin'))
  }

  const tokenDeleteResult = await tokenInterface.deleteAllTokensByDonorId(donor._id)
  if (tokenDeleteResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenDeleteResult.message))
  }

  const tokenInsertResult = await tokenInterface.insertAndSaveTokenWithExpiry(donor._id, req.userAgent, null)
  if (tokenInsertResult.status !== 'OK') {
    return res.respond(new InternalServerError500(tokenInsertResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST DONORS PASSWORD (REQUEST)', { name: donor.name })

  return res.respond(new OKResponse200('Created recovery link for user successfully', {
    token: tokenInsertResult.data.token
  }))
}

const handleGETDonorsDesignation = async (req, res) => {
  const authenticatedUser = res.locals.middlewareResponse.donor

  const adminsQueryResult = await donorInterface.findAdmins(2)
  if (adminsQueryResult.status !== 'OK') {
    return res.respond(new InternalServerError500(adminsQueryResult.message))
  }
  const adminList = adminsQueryResult.data

  const donorsQueryResult = await donorInterface.findVolunteersOfHall(authenticatedUser.hall)
  if (donorsQueryResult.status !== 'OK') {
    return res.respond(new InternalServerError500(donorsQueryResult.message))
  }

  const volunteerList = donorsQueryResult.data

  const superAdminQuery = await donorInterface.findAdmins(3)
  if (superAdminQuery.status !== 'OK') {
    return res.respond(new InternalServerError500(superAdminQuery.message))
  }
  const superAdminList = superAdminQuery.data

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET DONORS DESIGNATION', {})

  return res.respond(new OKResponse200('All designated members fetched', {
    volunteerList,
    adminList,
    superAdminList
  }))
}

const handleGETDonorsDuplicateMany = async (req, res) => {
  const authenticatedUser = res.locals.middlewareResponse.donor
  const existingDonorsResult = await donorInterface.findDonorIdsByPhone(authenticatedUser.designation, authenticatedUser.hall, req.query.phoneList)
  await logInterface.addLog(authenticatedUser._id, 'GET DONORS PHONE', { phones: req.query.phoneList })
  return res.respond(new OKResponse200(existingDonorsResult.message, {
    donors: existingDonorsResult.donors
  }))
}

module.exports = {
  handlePOSTDonors,
  handleDELETEDonors,
  handleGETSearchOptimized,
  handlePATCHDonorsComment,
  handlePATCHDonorsPassword,
  handleGETDonorsDesignation,
  handlePATCHDonors,
  handlePATCHDonorsDesignation,
  handlePATCHAdmins,
  handleGETDonors,
  handleGETDesignatedDonorsAll,
  handleGETDonorsDuplicate,
  handlePOSTDonorsPasswordRequest,
  handleGETSearchV3,
  handleGETDonorsDuplicateMany
}
