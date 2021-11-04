const activeDonorInterface = require('../db/interfaces/activeDonorInterface');
const logInterface = require('../db/interfaces/logInterface');
const {InternalServerError500, NotFoundError404, ConflictError409,} = require('../response/errorTypes');
const {OKResponse200, CreatedResponse201} = require('../response/successTypes')

const handlePOSTActiveDonors = async (req, res, next) => {
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


    let donor = res.locals.middlewareResponse.targetDonor;
    let user = res.locals.middlewareResponse.donor;

    let activeDonorSearch = await activeDonorInterface.findByDonorId(donor._id);
    if (activeDonorSearch.status === 'OK') {
        return res.respond(new ConflictError409('Active donor already created'));
    }

    let activeDonorInsertResult = await activeDonorInterface.add(donor._id, user._id);

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "POST ACTIVEDONORS", {
        ...activeDonorInsertResult.data,
        donor: donor.name
    });
    return res.respond(new CreatedResponse201('Active donor created', {
        newActiveDonor: activeDonorInsertResult.data,
    }))

};

const handleDELETEActiveDonors = async (req, res, next) => {
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

    let user = res.locals.middlewareResponse.donor;
    let donor = res.locals.middlewareResponse.targetDonor;

    let activeDonorRemoveResult = await activeDonorInterface.remove(donor._id);
    if (activeDonorRemoveResult.status !== 'OK') {
        return res.respond(new NotFoundError404('Active donor not found'));
    }
    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "DELETE ACTIVEDONORS", {
        ...activeDonorRemoveResult.data,
        donor: donor.name
    });
    return res.respond(new OKResponse200('Active donor deleted successfully', {
        removedActiveDonor: activeDonorRemoveResult.data,
    }))

}


module.exports = {
    handlePOSTActiveDonors,
    handleDELETEActiveDonors
}
