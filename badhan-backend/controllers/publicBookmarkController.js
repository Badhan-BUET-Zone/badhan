const publicBookmarkInterface = require('../db/interfaces/publicBookmarkInterface');
const logInterface = require('../db/interfaces/logInterface');
const {InternalServerError500, NotFoundError404, ConflictError409,} = require('../response/errorTypes');
const {OKResponse200, CreatedResponse201} = require('../response/successTypes')

const handlePOSTPublicBookmarks = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Public Bookmarks']
        #swagger.description = 'Add a bookmark for everyone to see'
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
                message: 'Public bookmark already created',
            },
            description: 'Public bookmark already created'
        }
        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                statusCode: 201,
                message: 'Public bookmark created',
                newBookmark: {
                    _id: 'hdjhd12vhjgj3428569834hth',
                    donorId: 'hdjhd12vhjgj3428569834hth',
                    markerId: 'hdjhd12vhjgj3428569834hth',
                    time: 1658974323116
                }
            },
            description: 'Public bookmark created'
        }

     */


    let donor = res.locals.middlewareResponse.targetDonor;
    let user = res.locals.middlewareResponse.donor;

    let publicBookmarkSearch = await publicBookmarkInterface.findByDonorId(donor._id);
    if (publicBookmarkSearch.status === 'OK') {
        return res.respond(new ConflictError409('Public bookmark already created'));
    }

    let publicBookmarkInsertResult = await publicBookmarkInterface.add(donor._id, user._id);

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "POST BOOKMARKS PUBLIC", {
        ...publicBookmarkInsertResult.data,
        donor: donor.name
    });
    return res.respond(new CreatedResponse201('Public bookmark created', {
        newBookmark: publicBookmarkInsertResult.data,
    }))

};

const handleDELETEPublicBookmarks = async (req, res, next) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Public Bookmarks']
    #swagger.description = 'Remove a public bookmark'
    #swagger.parameters['donorId'] = {
            description: 'The donor to be removed from public bookmarks',
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
            message: 'Public bookmark not found',
        },
        description: 'Public bookmark not found'
    }
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Public bookmark deleted successfully',
            removedBookmark: {
                _id: 'hdjhd12vhjgj3428569834hth',
                donorId: 'hdjhd12vhjgj3428569834hth',
                markerId: 'hdjhd12vhjgj3428569834hth',
                time: 1658974323116
            }
        },
        description: 'Public bookmark deleted'
    }

     */

    let user = res.locals.middlewareResponse.donor;
    let donor = res.locals.middlewareResponse.targetDonor;

    let publicBookmarkRemoveResult = await publicBookmarkInterface.remove(donor._id);
    if (publicBookmarkRemoveResult.status !== 'OK') {
        return res.respond(new NotFoundError404('Public bookmark not found'));
    }
    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "DELETE BOOKMARKS PUBLIC", {
        ...publicBookmarkRemoveResult.data,
        donor: donor.name
    });
    return res.respond(new OKResponse200('Public bookmark deleted successfully', {
        removedBookmark: publicBookmarkRemoveResult.data,
    }))

}


module.exports = {
    handlePOSTPublicBookmarks,
    handleDELETEPublicBookmarks
}
