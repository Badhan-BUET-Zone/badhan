
/**
 * @openapi
 * /donors:
 *   post:
 *     tags:
 *       - Donors
 *     summary: Post donor route
 *     description: Handles the insertion of a new donor into the database.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: Donor info for inserting donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: 8801521438557
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *               hall:
 *                 type: number
 *                 example: 5
 *               name:
 *                 type: string
 *                 example: Mir Mahathir
 *               studentId:
 *                 type: string
 *                 example: 1605011
 *               address:
 *                 type: string
 *                 example: Azimpur
 *               roomNumber:
 *                 type: string
 *                 example: 3009
 *               comment:
 *                 type: string
 *                 example: Developer of badhan
 *               extraDonationCount:
 *                 type: number
 *                 example: 1605011
 *               availableToAll:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Successful donor insertion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: New donor inserted successfully
 *                 newDonor:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: Azimpur road
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     designation:
 *                       type: number
 *                       example: 2
 *                     lastDonation:
 *                       type: number
 *                       example: 2
 *                     comment:
 *                       type: string
 *                       example: Has diabetes
 *                     commentTime:
 *                       type: number
 *                       example: 16547822145
 *                     email:
 *                       type: string
 *                       example: azadsumaiya00@gmail.com
 *                     _id:
 *                       type: string
 *                       example: 616ab751fc274715cc504ac7
 *                     phone:
 *                       type: number
 *                       example: 8801546587552
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     hall:
 *                       type: number
 *                       example: 2
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     availableToAll:
 *                       type: boolean
 *                       example: true
 *       409:
 *         description: If the donor already exists in the database, user will get the error message. If the user is of the same hall or is super admin, he/she will also get the donorId of the existing donor with the duplicate phone number. Otherwise, donorId will be left as undefined
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: number
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Donor found with duplicate phone number/ Donor found with duplicate phone number in another hall
 *                 donorId:
 *                   type: string
 *                   example: 65dabcdef68796116465
 */

/**
 * @openapi
 * /donors:
 *   delete:
 *     tags:
 *       - Donors
 *     summary: Delete donor route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Endpoint to delete a public contact
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: DonorId of public contact
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *     responses:
 *       200:
 *         description: Successful donor deletion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Public contact deleted successfully
 *       404:
 *         description: Response if the public contact to be deleted is not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: number
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Donor deleted successfully
 *       409:
 *         description: If the donor is a volunteer, hall admin or super admin, then he/she cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: number
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Donor must be demoted for deletion
 */

/**
 * @openapi
 * /search/v3:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Get list of donors
 *     security:
 *       - ApiKeyAuth: []
 *     description: Searches for donors that matches the filters
 *     parameters:
 *       - in: query
 *         name: name
 *         description: A string that will be matched using subsequence search on the name field
 *         required: true
 *         schema:
 *           type: string
 *           example: maha
 *       - in: query
 *         name: bloodGroup
 *         required: true
 *         description: Bloodgroup must be between 0 to 7. -1 will denote any blood group
 *         schema:
 *           type: number
 *           example: 3
 *       - in: query
 *         name: hall
 *         required: true
 *         description: Hall must be between 0 to 6 or 8
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: batch
 *         required: true
 *         description: Batch must be the two digit batch number of a student. Leave it empty to include all batches
 *         schema:
 *           type: number
 *           example: 16
 *       - in: query
 *         name: address
 *         required: true
 *         description: Searches the address field using substring search. Leave it empty to include all addresses
 *         schema:
 *           type: string
 *           example: azimpur
 *       - in: query
 *         name: isAvailable
 *         required: true
 *         description: make this true if you want to get the donors who have not donated blood in the last 120 days
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: isNotAvailable
 *         required: true
 *         description: make this false if you want to get the donors who have donated blood in the last 120 days
 *         schema:
 *           type: boolean
 *           example: false
 *       - in: query
 *         name: availableToAll
 *         required: true
 *         description: make this true to get the donors who are marked as public data
 *         schema:
 *           type: boolean
 *           example: true
 *     responses:
 *       200:
 *         description: Donors queried successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Donors queried successfully
 *                 filteredDonors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                         example: Azimpur Road
 *                       roomNumber:
 *                         type: string
 *                         example: 249
 *                       lastDonation:
 *                         type: number
 *                         example: 1235478524412
 *                       comment:
 *                         type: string
 *                         example: Has diabetes
 *                       commentTime:
 *                         type: number
 *                         example: 154782512254
 *                       _id:
 *                         type: string
 *                         example: 584abcde6744144441
 *                       name:
 *                         type: string
 *                         example: Mir Mahathir Mohammad
 *                       studentId:
 *                         type: string
 *                         example: 1605011
 *                       bloodGroup:
 *                         type: number
 *                         example: 2
 *                       phone:
 *                         type: number
 *                         example: 8801521438557
 *                       hall:
 *                         type: number
 *                         example: 5
 *                       availableToAll:
 *                         type: boolean
 *                         example: true
 *                       callRecordCount:
 *                         type: number
 *                         example: 3
 *                       donationCount:
 *                         type: number
 *                         example: 8
 *                       lastCalled:
 *                         type: number
 *                         example: 135496813489
 *                       marker:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Mir Mahathir Mohammad
 *                           time:
 *                             type: number
 *                             example: 154875221458
 *       403:
 *         description: This error will occur if the suer tries to search other halls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: number
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: You are not allowed to search donors of other halls
 */

/**
 * @openapi
 * /donors/comment:
 *   patch:
 *     tags:
 *       - Donors
 *     summary: Patch donor comment route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Adds a comment to a donors profile
 *     requestBody:
 *       description: Donor info for posting comment
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: 563ghefqwr763
 *               comment:
 *                 type: string
 *                 example: Sample comment about donor
 *     responses:
 *       200:
 *         description: In case of successfully saving the comment
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Comment updated successfully
 *                 token:
 *                   type: string
 *                   example: dvsoigneoihegoiwsngoisngoiswgnbon
 *       404:
 *         description: Donor not found
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Donor not found
 */

/**
 * @openapi
 * /donors/v2:
 *   patch:
 *     tags:
 *       - Donors
 *     summary: Patch donor route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the update of donor information
 *     requestBody:
 *       description: Donor info for editing donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: 563ghefqwr763
 *               name:
 *                 type: string
 *                 example: Mir Mahathir
 *               phone:
 *                 type: number
 *                 example: 8801521438557
 *               studentId:
 *                 type: string
 *                 example: 1605011
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *               hall:
 *                 type: number
 *                 example: 2
 *               roomNumber:
 *                 type: string
 *                 example: 3009
 *               address:
 *                 type: string
 *                 example: Azimpur
 *               availableToAll:
 *                 type: boolean
 *                 example: true
 *               email:
 *                 type: string
 *                 example: mirmahathir@gmail.com
 *     responses:
 *       200:
 *         description: Donor info updated successfully
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Donor updated successfully
 *       404:
 *         description: Email address does not exist
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Email address does not exist
 *       403:
 *         description: You do not have permission to edit email address of another user
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
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: You do not have permission to edit email address of another user
 */

/**
 * @openapi
 * /donors/designation:
 *   patch:
 *     tags:
 *       - Donors
 *     summary: Patch donor designation route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the promotion or demotion of users
 *     requestBody:
 *       description: Donor info for editing donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: 563ghefqwr763
 *               promoteFlag:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Donor promotion/ demotion successful
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Target user promoted/demoted successfully
 *       404:
 *         description: When no donor with the specified donor id is found, user will get this error message
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Donor not found
 *       409:
 *         description: If user cannot promote volunteer or cannot demote donor/ Donor does not have a valid hall
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
 *                   example: Can not promote volunteer or can not demote donor/ Donor does not have a valid hall
 *       403:
 *         description: This error will appear if anyone below the designation of hall admin tries to access this route. This middleware assumes that the handleHallPermission middleware is used before and along with this middleware
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
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: error message
 */

/**
 * @openapi
 * /admins:
 *   patch:
 *     tags:
 *       - Donors
 *     summary: Patch admin route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Promotes a volunteer to hall admin and demotes the existing hall admin to volunteer
 *     requestBody:
 *       description: Donor info for changing admin
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: 563ghefqwr763
 *     responses:
 *       200:
 *         description: Successfully changed hall admin
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully changed hall admin
 *       404:
 *         description: When no donor with the specified donor id is found, user will get this error message
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Donor not found
 *       409:
 *         description: If fetched user is not a volunteer/ user does not have a valid hall , user will get this error message
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
 *                   example: User is not a volunteer/ User does not have a valid hall
 */

/**
 * @openapi
 * /donors:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Get donor details
 *     security:
 *       - ApiKeyAuth: []
 *     description: Handles the fetching of donor details
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: DonorId for donor details
 *         required: true
 *         schema:
 *           type: string
 *           example: 678236478ywuy728
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: All public contacts fetched successfully
 *                 donor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     email:
 *                       type: string
 *                       example: mirmahathir1@gmail.com
 *                     lastDonation:
 *                       type: number
 *                       example: 786534785
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     hall:
 *                       type: number
 *                       example: 5
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     address:
 *                       type: string
 *                       example: Azimpur
 *                     comment:
 *                       type: string
 *                       example: Developer of badhan
 *                     commentTime:
 *                       type: number
 *                       example: 0
 *                     designation:
 *                       type: number
 *                       example: 3
 *                     availableToAll:
 *                       type: boolean
 *                       example: true
 *                     callRecords:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 584abcde6744144441
 *                           callerId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 584abcde6744144441
 *                               hall:
 *                                 type: number
 *                                 example: 5
 *                               name:
 *                                 type: string
 *                                 example: Mir Mahathir
 *                           calleeId:
 *                             type: string
 *                             example: 584abcde6744144441
 *                           date:
 *                             type: number
 *                             example: 1627492207064
 *                           expireAt:
 *                             type: string
 *                             example: 2021-08-27T17:10:07.0662
 *                     donations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: number
 *                             example: 1543764822
 *                           _id:
 *                             type: string
 *                             example: 584abcde6744144441
 *                           phone:
 *                             type: number
 *                             example: 881521438557
 *                           donorId:
 *                             type: string
 *                             example: 584abcde6744144441
 *                     publicContacts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bloodGroup:
 *                             type: number
 *                             example: 2
 *                           _id:
 *                             type: string
 *                             example: 584abcde6744144441
 *                           donorId:
 *                             type: string
 *                             example: 584abcde6744144441
 *                     markedBy:
 *                       type: object
 *                       properties:
 *                         donorId:
 *                           type: string
 *                           example: 584abcde6744144441
 *                         markerId:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: 584abcde6744144441
 *                             name:
 *                               type: string
 *                               example: Mir
 *                         time:
 *                           type: number
 *                           example: 1782934242842
 */


/**
 * @openapi
 * /donors/phone:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Check whether list of phone numbers exist in database
 *     security:
 *       - ApiKeyAuth: []
 *     description: Request using a list of phone numbers to check whether these numbers exist in database.
 *     parameters:
 *       - in: query
 *         name: phoneList
 *         description: phone number to be checked. To send multiple phone numbers, just add more phone numbers using the same query parameter
 *         required: true
 *         schema:
 *           type: number
 *           example: 8801521438557
 *       - in: query
 *         name: phoneList
 *         description: phone number to be checked. To send multiple phone numbers, just add more phone numbers using the same query parameter
 *         required: true
 *         schema:
 *           type: number
 *           example: 8801627151097
 *     responses:
 *       200:
 *         description: Among the list of phone numbers, if a phone number exists in database- no corresponding response will be sent for that phone. If a phone number exists in the database but the user is forbidden to get any further information, only the phone number will be sent along with a FORBIDDEN donorId as response. If the phone number exists in database and the user is permitted to view that donor, then the donorId will be sent as the corresponding response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Existing donors fetched successfully
 *                 donors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       donorId:
 *                         type: string
 *                         example: FORBIDDEN
 *                       phone:
 *                         type: number
 *                         example: 8801521438557
 *
 *
 */

/**
 * @openapi
 * /volunteers/all:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Get list of volunteers
 *     security:
 *       - ApiKeyAuth: []
 *     description: Fetches all volunteers
 *     responses:
 *       200:
 *         description: Volunteer list fetch successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched donor details
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: jhdwiurh837921
 *                       name:
 *                         type: string
 *                         example: Mir Mahathir
 *                       hall:
 *                         type: number
 *                         example: 5
 *                       studentId:
 *                         type: string
 *                         example: 1605011
 *                       logCount:
 *                         type: number
 *                         example: 3
 */

/**
 * @openapi
 * /donors/checkDuplicate:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Get list of duplicate donors
 *     security:
 *       - ApiKeyAuth: []
 *     description: Check whether phone number already exists
 *     parameters:
 *       - in: query
 *         name: phone
 *         description: Phone number of donor
 *         required: true
 *         schema:
 *           type: string
 *           example: 8801521438557
 *     responses:
 *       200:
 *         description: If the donor already exists in the database, user will get the error message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Donor found with duplicate phone number in Titumir Hall/ Donor found with duplicate phone number in Titumir Hall. You are not permitted to access this donor
 *                 donor:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: Azimpur
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     designation:
 *                       type: number
 *                       example: 3
 *                     lastDonation:
 *                       type: number
 *                       example: 786534785
 *                     comment:
 *                       type: string
 *                       example: Developer of badhan
 *                     commentTime:
 *                       type: number
 *                       example: 0
 *                     email:
 *                       type: string
 *                       example: mirmahathir1@gmail.com
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     hall:
 *                       type: number
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     availableToAll:
 *                       type: boolean
 *                       example: true
 */



/**
 * @openapi
 * /donors/password:
 *   post:
 *     tags:
 *       - Donors
 *     summary: Post donor password route
 *     description: Request for password reset link for a user
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: Donor info for inserting donor
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: 8734uir2895709
 *     responses:
 *       200:
 *         description: Successfully created recovery link for user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Successfully created recovery link for user
 *                 token:
 *                   type: string
 *                   example: 5894jkrth89490
 *       409:
 *         description: Donor is not a volunteer/ admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: number
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Donor is not a volunteer/ admin
 */

/**
 * @openapi
 * /donors/designation:
 *   get:
 *     tags:
 *       - Donors
 *     summary: Get list of donors designation
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get list of volunteers of own hall, all hall admins and super admins
 *     responses:
 *       200:
 *         description: All designated members fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: All designated members fetched
 *                 volunteerList:
 *                   type: object
 *                   properties:
 *                     roomNumber:
 *                       type: string
 *                       example: 3009
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                 adminList:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     hall:
 *                       type: number
 *                       example: 5
 *                 superAdminList:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: jhdwiurh837921
 *                     studentId:
 *                       type: string
 *                       example: 1605011
 *                     name:
 *                       type: string
 *                       example: Mir Mahathir
 *                     phone:
 *                       type: number
 *                       example: 881521438557
 *                     hall:
 *                       type: number
 *                       example: 5
 */
