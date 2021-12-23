const activeDonorInterface = require('../db/interfaces/activeDonorInterface')
const logInterface = require('../db/interfaces/logInterface')
// const util = require('util')
const {
  NotFoundError404,
  ConflictError409,
  ForbiddenError403
} = require('../response/errorTypes')
const { OKResponse200, CreatedResponse201 } = require('../response/successTypes')

/**
 * @openapi
 * /activeDonors:
 *   post:
 *     tags:
 *       - Active Donors
 *     summary: Post active donor route
 *     description: Add an active donor for everyone to see
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON consisting of donor info for inserting donation
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: bhjdekj8923
 *     responses:
 *       201:
 *         description: Active donor created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Active donor created
 *                 newActiveDonor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc5900177ced73
 *                     markerId:
 *                       type: string
 *                       example: 5e901d56effc5900177ced73
 *                     time:
 *                       type: string
 *                       example: 8801521438557
 *       409:
 *         description: Active donor already created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Active donor already created
 */
const handlePOSTActiveDonors = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Active Donors']
        #swagger.description = 'Add an active donor for everyone to see'
        #swagger.parameters['request'] = {
            in: 'body',
            description: 'donorId of the user',
            schema: {
                donorId: 'hdjhd12vhjgj3428569834hth'
            }
        }
        #swagger.security = [{
            "api_key": []
        }]
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'Active donor already created',
            },
            description: 'Active donor already created'
        }
        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                statusCode: 201,
                message: 'Active donor created',
                newActiveDonor: {
                    _id: 'hdjhd12vhjgj3428569834hth',
                    donorId: 'hdjhd12vhjgj3428569834hth',
                    markerId: 'hdjhd12vhjgj3428569834hth',
                    time: 1658974323116
                }
            },
            description: 'Active donor created'
        }

     */

  const donor = res.locals.middlewareResponse.targetDonor
  const user = res.locals.middlewareResponse.donor

  const activeDonorSearch = await activeDonorInterface.findByDonorId(donor._id)
  if (activeDonorSearch.status === 'OK') {
    return res.respond(new ConflictError409('Active donor already created'))
  }

  const activeDonorInsertResult = await activeDonorInterface.add(donor._id, user._id)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST ACTIVEDONORS', {
    ...activeDonorInsertResult.data,
    donor: donor.name
  })
  return res.respond(new CreatedResponse201('Active donor created', {
    newActiveDonor: activeDonorInsertResult.data
  }))
}

const handleDELETEActiveDonors = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Active Donors']
    #swagger.description = 'Remove an active donor'
    #swagger.parameters['donorId'] = {
            description: 'The donor to be removed from active donors',
            type: 'string',
            name: 'donorId',
            in: 'param'
        }
    #swagger.security = [{
        "api_key": []
    }]
    #swagger.responses[404] = {
        schema: {
            status: 'ERROR',
            statusCode: 404,
            message: 'Active donor not found',
        },
        description: 'Active donor not found'
    }
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Active donor deleted successfully',
            removedActiveDonor: {
                _id: 'hdjhd12vhjgj3428569834hth',
                donorId: 'hdjhd12vhjgj3428569834hth',
                markerId: 'hdjhd12vhjgj3428569834hth',
                time: 1658974323116
            }
        },
        description: 'Active donor deleted'
    }

     */

  const donor = res.locals.middlewareResponse.targetDonor

  const activeDonorRemoveResult = await activeDonorInterface.remove(donor._id)
  if (activeDonorRemoveResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Active donor not found'))
  }
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE ACTIVEDONORS', {
    ...activeDonorRemoveResult.data,
    donor: donor.name
  })
  return res.respond(new OKResponse200('Active donor deleted successfully', {
    removedActiveDonor: activeDonorRemoveResult.data
  }))
}

const handleGETActiveDonors = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Active Donors']
        #swagger.description = 'Get list of active donors filtered by search parameters'
        #swagger.parameters['bloodGroup'] = {
            description: 'blood group for donors',
            type: 'number',
            name: 'bloodGroup',
            in: 'query'
        }
        #swagger.parameters['hall'] = {
            description: 'hall for donors',
            type: 'number',
            name: 'hall',
            in: 'query'
        }
        #swagger.parameters['batch'] = {
            description: 'batch for donors',
            type: 'number',
            name: 'batch',
            in: 'query'
        }
        #swagger.parameters['name'] = {
            description: 'name for donors',
            type: 'string',
            name: 'name',
            in: 'query'
        }
        #swagger.parameters['name'] = {
            description: 'address for donors',
            type: 'string',
            name: 'address',
            in: 'query'
        }
        #swagger.parameters['isAvailable'] = {
            description: 'isAvailable for donors',
            type: 'boolean',
            name: 'isAvailable',
            in: 'query'
        }
        #swagger.parameters['isNotAvailable'] = {
            description: 'isNotAvailable for donors',
            type: 'boolean',
            name: 'isNotAvailable',
            in: 'query'
        }
        #swagger.parameters['availableToAll'] = {
            description: 'availableToAll denotes the availability of the donor to the other hall members',
            type: 'boolean',
            name: 'availableToAll',
            in: 'query'
        }
        #swagger.parameters['markedByMe'] = {
            description: 'Make this true to get all marked donors that were marked by me',
            type: 'boolean',
            name: 'markedByMe',
            in: 'query'
        }
        #swagger.parameters['availableToAllOrHall'] = {
            description: 'Make this true to get all marked donors that are of the specified hall or are marked as available to all.',
            type: 'boolean',
            name: 'availableToAllOrHall',
            in: 'query'
        }
        #swagger.security = [{
            "api_key": []
        }]
                #swagger.responses[403] = {
            schema: {
                status: 'ERROR',
                statusCode: 403,
                message: 'You are not allowed to search donors of other halls'
            },
            description: 'This error will occur if the user tries to search other halls'
        }
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: "Active donor deleted successfully",
                activeDonors: [
                    {
                        _id: "616a692bd2bd480016513b56",
                        hall: 8,
                        name: "Mir Mahathir",
                        address: "(Unknown)",
                        comment: "(Unknown)",
                        commentTime: 1636185389668,
                        lastDonation: 0,
                        availableToAll: true,
                        bloodGroup: 1,
                        studentId: "2105011",
                        phone: 8801524578445,
                        markedTime: 1636185389668,
                        markerName: "Ifty",
                        donationCount: 4,
                        callRecordCount: 1,
                        lastCallRecord:1636185389668,
                    }
                ]
            },

            description: 'Active donor deleted'
        }
    }

     */

  const reqQuery = req.query

  if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall &&
    reqQuery.hall <= 6 &&
    res.locals.middlewareResponse.donor.designation !== 3) {
    return res.respond(new ForbiddenError403('You are not allowed to search donors of other halls'))
  }
  const activeDonors = await activeDonorInterface.findByQueryAndPopulate(reqQuery, res.locals.middlewareResponse.donor._id)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET ACTIVEDONORS', {
    filter: reqQuery,
    resultCount: activeDonors.data.length
  })
  return res.respond(new OKResponse200('Active donor deleted successfully', {
    activeDonors: activeDonors.data
  }))
}

module.exports = {
  handlePOSTActiveDonors,
  handleDELETEActiveDonors,
  handleGETActiveDonors
}
