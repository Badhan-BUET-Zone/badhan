/**
 * @swagger
 * components:
 *   schemas:
 *     ActiveDonors:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor
 *           example: dabcd6465166516
 *         markerId:
 *           type: string
 *           description: id of the badhan member who marked the donor
 *           example: dabcd6465166516
 *         time:
 *           type: number
 *           description: timestamp of marking
 *           example: 1234578161648
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CallRecords:
 *       type: object
 *       properties:
 *         callerId:
 *           type: string
 *           description: id of caller
 *           example: abcd123456798
 *         calleeId:
 *           type: string
 *           description: id of callee
 *           example: abcd123456798
 *         date:
 *           type: number
 *           description: timestamp of donation
 *           example: 1234578161648
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Donations:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor
 *           example: abcdef123456789
 *         date:
 *           type: integer
 *           description: timestamp of donation
 *           example: 1234578161648
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Donors:
 *       type: object
 *       properties:
 *         phone:
 *           type: number
 *           description: Phone number of donor.
 *           example: 8801521438557
 *         password:
 *           type: string
 *           description: Donor password. Will be empty if the donor does not have an account.
 *           example: password123
 *         studentId:
 *           type: string
 *           description: Six digit student ID of BUET students
 *           example: 1605011
 *         bloodGroup:
 *           type: number
 *           description: Blood group of donor
 *           example: 3
 *         hall:
 *           type: number
 *           description: hall number of donor
 *           example: 5
 *         address:
 *           type: string
 *           description: address of donor
 *           example: Azimpur Road
 *         roomNumber:
 *           type: string
 *           description: hall room number of donor
 *           example: 3009
 *         designation:
 *           type: number
 *           description: designation of donor in Badhan platform
 *           example: 3
 *         lastDonation:
 *           type: number
 *           description: timestamp of last donation by donor
 *           example: 1234578161648
 *         name:
 *           type: string
 *           description: name of donor
 *           example: Mir Mahathir Mohammad
 *         comment:
 *           type: string
 *           description: additional information of the donor
 *           example: Has high blood pressure
 *         commentTime:
 *           type: number
 *           description: timestamp of the latest update on comment
 *           example: 13216465164
 *         availableToAll:
 *           type: boolean
 *           description: if this flag is true, then the donor will be made available for all the halls
 *           example: true
 *         email:
 *           type: string
 *           description: email address of a donor
 *           example: mirmahathir1@gmail.com
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Logs:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor who accessed an api
 *           example: abcdef123456789
 *         date:
 *           type: number
 *           description: timestamp of api access
 *           example: 1234578161648
 *         operation:
 *           type: string
 *           description: short detail of the API route
 *           example: POST SIGNIN
 *         details:
 *           type: object
 *           description: any further information needed to be kept in logs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PublicContacts:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor who is published as public contact
 *           example: abcdef123456789
 *         bloodGroup:
 *           type: integer
 *           description: bloodgroup for which the donor is available to contact
 *           example: 2
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Tokens:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of token owner
 *           example: abcd123456798
 *         token:
 *           type: string
 *           description: token string
 *           example: abcd12345679sdkghnswuiobnwsoiueghweoignwieugwesuignwg
 *         os:
 *           type: string
 *           description: name of os from which the user logged in
 *           example: Ubuntu
 *         browserFamily:
 *           type: string
 *           description: name of browser from which the user logged in
 *           example: ASUS
 *         device:
 *           type: string
 *           description: name of device from which the user logged in
 *           example: Huawei
 *         ipAddress:
 *           type: string
 *           description: IP address of the user
 *           example: 17.32.5.55
 */