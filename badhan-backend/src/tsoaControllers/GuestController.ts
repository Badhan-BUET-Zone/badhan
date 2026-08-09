import 'reflect-metadata'
import { Body, Controller, Delete, Get, Hidden, Middlewares, Patch, Path, Post, Query, Route, Tags } from 'tsoa'
import * as faker from '../doc/faker'
import * as feedbackToken from '../services/feedbackToken'
import { DESIGNATIONS_INDEX, HTTP_STATUS } from '../constants'

@Route('guest')
@Tags('Guest')
export class GuestController extends Controller {
  /** Guest sign in - returns fake data for demo purposes */
  @Post('users/signin')
  @Hidden()
  public async signIn(): Promise<{
    status: string
    statusCode: number
    message: string
    token: string
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Guest sign in will not show actual nor accurate data',
      token: faker.getToken()
    }
  }

  /**
   * Guest feedback token — returns a faker donor and a REAL, mintable token.
   *
   * Guest mode should exercise the same code path rather than a stub: the token this
   * returns actually verifies, so the guest QR generator and the guest donor page behave
   * like the real thing all the way through to submission.
   */
  @Post('feedbacks/token')
  @Hidden()
  public async postFeedbackToken(
    @Body() body: { phone: number; studentId: string; durationMinutes?: number; hall?: number }
  ): Promise<{
    status: string
    statusCode: number
    message: string
    token: string
    expiresAt: number
    donor: {
      name: string
      phone: number
      studentId: string
      bloodGroup: number
      hall: number
      donationCount: number
      plateletDonationCount: number
      lastDonation: number
      lastPlateletDonation: number
    }
  }> {
    // The requested hall when one is stated — including HALL_ANY, so the guest QR generator
    // can demonstrate an "All Halls" code — and a faker hall otherwise. No designation
    // branch: the guest user is a super admin, so there is nothing here to refuse.
    const hall: number = (body.hall !== undefined && body.hall !== null) ? body.hall : faker.getHall()
    const minted: { token: string; expiresAt: number } = feedbackToken.mintFeedbackToken(hall, body.durationMinutes)

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Token generated successfully',
      token: minted.token,
      expiresAt: minted.expiresAt,
      donor: {
        name: faker.getName(),
        phone: faker.getPhone(),
        studentId: faker.getStudentId(),
        bloodGroup: faker.getBloodGroup(),
        // The caller's own hall, which is not the token's when a hall was stated — and must
        // never be HALL_ANY, since no donor record is -1.
        hall: faker.getHall(),
        donationCount: faker.getDonationCount(),
        plateletDonationCount: faker.getDonationCount(),
        lastDonation: faker.getTimestamp(30),
        lastPlateletDonation: faker.getTimestamp(30)
      }
    }
  }

  /**
   * Guest feedback submission — returns the same 201 without writing anything.
   *
   * The only guest mirror that deliberately does NOT exercise the real path: writing
   * would put demo rows into a real hall's queue.
   */
  @Post('feedbacks')
  @Hidden()
  public async postFeedback(
    @Body() body: { token: string; type: string; feedbackJSON: any }
  ): Promise<{ status: string; statusCode: number; message: string }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Thank you. Your message has reached the volunteers.'
    }
  }

  /**
   * Guest feedback queue — one row of each type, so the Feedback page can be demoed
   * without filing a real submission. The newDonor row is the only way to show that card
   * at all without writing to a real hall's queue.
   */
  @Get('feedbacks')
  @Hidden()
  public async getFeedbacks(): Promise<{
    status: string
    statusCode: number
    message: string
    feedbacks: any[]
  }> {
    const card = (): any => ({
      _id: faker.getId(),
      name: faker.getName(),
      phone: faker.getPhone(),
      studentId: faker.getStudentId(),
      bloodGroup: faker.getBloodGroup(),
      hall: faker.getHall(),
      address: faker.getAddress(),
      roomNumber: faker.getRoom(),
      comment: faker.getComment(),
      commentTime: faker.getTimestamp(10),
      availableToAll: faker.getBoolean(),
      archiveFlag: false,
      donationCount: faker.getDonationCount(),
      plateletDonationCount: faker.getDonationCount(),
      lastDonation: faker.getTimestamp(60),
      lastPlateletDonation: faker.getTimestamp(40),
      lastCalled: faker.getTimestamp(5),
      callCountLast3Days: faker.getRandInt(0, 3),
      markerName: faker.getName()
    })

    const donorCard: any = card()

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Feedbacks fetched successfully',
      feedbacks: [
        {
          _id: faker.getId(),
          type: 'feedback',
          hall: donorCard.hall,
          feedbackJSON: {
            phone: donorCard.phone,
            studentId: donorCard.studentId,
            text: 'I donated on 12 March, please add it'
          },
          date: faker.getTimestamp(3),
          donor: donorCard
        },
        {
          _id: faker.getId(),
          type: 'newDonor',
          hall: faker.getHall(),
          feedbackJSON: {
            name: faker.getName(),
            phone: faker.getPhone(),
            studentId: faker.getStudentId(),
            bloodGroup: faker.getBloodGroup(),
            hall: faker.getHall(),
            address: faker.getAddress(),
            roomNumber: faker.getRoom(),
            comment: faker.getComment(),
            donationCount: 0,
            lastDonation: null,
            plateletDonationCount: 0,
            lastPlateletDonation: null,
            availableToAll: false
          },
          date: faker.getTimestamp(1),
          donor: null
        }
      ]
    }
  }

  /** Guest discard — answers 200 without removing anything */
  @Delete('feedbacks')
  @Hidden()
  public async deleteFeedback(@Query() feedbackId: string): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Feedback discarded successfully'
    }
  }

  /** Guest sign out */
  @Delete('users/signout')
  @Hidden()
  public async signOut(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out successfully'
    }
  }

  /** Guest sign out from all devices */
  @Delete('users/signout/all')
  @Hidden()
  public async signOutAll(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out from all devices successfully'
    }
  }

  /** Guest view own donor details */
  @Get('users/me')
  @Hidden()
  public async viewDonorDetailsSelf(): Promise<{
    status: string
    statusCode: number
    message: string
    donor: any
  }> {
    const obj: any = {
      _id: faker.getId(),
      phone: faker.getPhone(),
      name: faker.getName(),
      studentId: faker.getStudentId(),
      bloodGroup: faker.getBloodGroup(),
      hall: faker.getHall(),
      roomNumber: faker.getRoom(),
      address: faker.getAddress(),
      comment: faker.getComment(),
      commentTime: faker.getTimestamp(240),
      designation: DESIGNATIONS_INDEX.SUPER_ADMIN,
      availableToAll: faker.getBoolean(),
      archiveFlag: false,
      email: faker.getEmail()
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      donor: obj
    }
  }

  /** Guest insert donor */
  @Post('donors')
  @Hidden()
  public async insertDonor(): Promise<{
    status: string
    statusCode: number
    message: string
    newDonor: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'New donor inserted successfully',
      newDonor: {
        address: faker.getAddress(),
        roomNumber: faker.getRoom(),
        designation: faker.getDesignation(),
        comment: faker.getComment(),
        commentTime: faker.getTimestamp(240),
        _id: faker.getId(),
        phone: faker.getPhone(),
        bloodGroup: faker.getBloodGroup(),
        hall: faker.getHall(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        availableToAll: faker.getBoolean(),
        archiveFlag: false,
        email: faker.getEmail()
      }
    }
  }

  /** Guest search donors */
  @Get('search/v3')
  @Hidden()
  public async searchDonors(): Promise<{
    status: string
    statusCode: number
    message: string
    filteredDonors: any[]
  }> {
    const filteredDonors: any[] = []

    for (let i: number = 0; i < faker.getRandInt(1, 50); i++) {
      const randomMarker: any = faker.getBoolean()
        ? {
            name: faker.getName(),
            time: faker.getTimestamp(20)
          }
        : {}

      filteredDonors.push({
        _id: faker.getId(),
        phone: faker.getPhone(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        hall: faker.getHall(),
        lastDonation: faker.getTimestamp(240),
        lastPlateletDonation: faker.getTimestamp(240),
        bloodGroup: faker.getBloodGroup(),
        address: faker.getAddress(),
        roomNumber: faker.getRoom(),
        comment: faker.getComment(),
        donationCount: faker.getDonationCount(),
        plateletDonationCount: faker.getDonationCount(),
        commentTime: faker.getTimestamp(240),
        availableToAll: faker.getBoolean(),
        archiveFlag: false,
        callRecordCount: faker.getRandomIndex(3),
        lastCalled: faker.getTimestamp(10),
        marker: randomMarker
      })
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donors queried successfully',
      filteredDonors
    }
  }

  /** Guest delete donor */
  @Delete('donors')
  @Hidden()
  public async deleteDonor(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donor deleted successfully'
    }
  }

  /** Guest post comment */
  @Patch('donors/comment')
  @Hidden()
  public async comment(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Comment posted successfully'
    }
  }

  /** Guest change password */
  @Post('donors/password')
  @Hidden()
  public async changePassword(): Promise<{
    status: string
    statusCode: number
    message: string
    token: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Created recovery link for user successfully',
      token: faker.getToken()
    }
  }

  /** Guest edit donor */
  @Patch('donors/v2')
  @Hidden()
  public async editDonor(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donor updated successfully'
    }
  }

  /** Guest promote/demote user */
  @Patch('donors/designation')
  @Hidden()
  public async promote(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Target user promoted/demoted successfully'
    }
  }

  /** Guest view donor details */
  @Get('donors')
  @Hidden()
  public async viewDonorDetails(): Promise<{
    status: string
    statusCode: number
    message: string
    donor: any
  }> {
    const callRecords: any[] = []
    for (let i: number = 0; i < 2; i++) {
      callRecords.push({
        date: faker.getTimestamp(240),
        _id: faker.getId(),
        callerId: {
          designation: faker.getDesignation(),
          _id: faker.getId(),
          hall: faker.getHall(),
          name: faker.getName()
        },
        calleeId: faker.getId()
      })
    }
    const donations: any[] = []
    const plateletDonations: any[] = []
    for (let i: number = 0; i < 2; i++) {
      donations.push({
        date: faker.getTimestamp(240),
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId()
      })
      plateletDonations.push({
        date: faker.getTimestamp(240),
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId()
      })
    }
    const publicContacts: any[] = [
      {
        bloodGroup: 2,
        _id: faker.getId(),
        donorId: faker.getId()
      },
      {
        bloodGroup: -1,
        _id: faker.getId(),
        donorId: faker.getId()
      }
    ]

    const randomMarker: any = faker.getBoolean()
      ? {
          _id: faker.getId(),
          name: faker.getName()
        }
      : null

    const obj: any = {
      _id: faker.getId(),
      phone: faker.getPhone(),
      name: faker.getName(),
      studentId: faker.getStudentId(),
      lastDonation: faker.getTimestamp(240),
      lastPlateletDonation: faker.getTimestamp(240),
      bloodGroup: faker.getBloodGroup(),
      hall: faker.getHall(),
      roomNumber: faker.getRoom(),
      address: faker.getAddress(),
      comment: faker.getComment(),
      designation: faker.getDesignation(),
      commentTime: faker.getTimestamp(240),
      callRecords,
      donations,
      plateletDonations,
      publicContacts,
      availableToAll: faker.getBoolean(),
      archiveFlag: false,
      email: faker.getEmail(),
      markedBy: randomMarker
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      donor: obj
    }
  }

  /** Guest view volunteers of own hall */
  @Get('volunteers')
  @Hidden()
  public async viewVolunteersOfOwnHall(): Promise<{
    status: string
    statusCode: number
    message: string
    volunteerList: any[]
  }> {
    const volunteerList: any[] = []
    for (let i: number = 0; i < faker.getRandomIndex(50); i++) {
      volunteerList.push({
        _id: faker.getId(),
        bloodGroup: faker.getBloodGroup(),
        name: faker.getName(),
        phone: faker.getPhone(),
        roomNumber: faker.getRoom(),
        studentId: faker.getStudentId()
      })
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Volunteer list fetched successfully',
      volunteerList
    }
  }

  /** Guest show hall admins */
  @Get('admins')
  @Hidden()
  public async showHallAdmins(): Promise<{
    status: string
    statusCode: number
    message: string
    admins: any[]
  }> {
    const admins: any[] = []
    for (let i: number = 0; i <= 6; i++) {
      admins.push({
        _id: faker.getId(),
        hall: i,
        name: faker.getName(),
        phone: faker.getPhone()
      })
    }
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Hall admin list fetched successfully',
      admins
    }
  }

  /** Guest insert donation */
  @Post('donations')
  @Hidden()
  public async insertDonation(): Promise<{
    status: string
    statusCode: number
    message: string
    newDonation: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Donation inserted successfully',
      newDonation: {
        date: faker.getTimestamp(10),
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId()
      }
    }
  }

  /** Guest insert platelet donation */
  @Post('platelet-donations')
  @Hidden()
  public async insertPlateletDonation(): Promise<{
    status: string
    statusCode: number
    message: string
    newPlateletDonation: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Platelet donation inserted successfully',
      newPlateletDonation: {
        date: faker.getTimestamp(10),
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId()
      }
    }
  }

  /** Guest delete donation */
  @Delete('donations')
  @Hidden()
  public async deleteDonation(): Promise<{
    status: string
    statusCode: number
    message: string
    deletedDonation: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Deleted donation successfully',
      deletedDonation: {
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId(),
        date: faker.getTimestamp(5)
      }
    }
  }

  /** Guest delete platelet donation */
  @Delete('platelet-donations')
  @Hidden()
  public async deletePlateletDonation(): Promise<{
    status: string
    statusCode: number
    message: string
    deletedPlateletDonation: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Deleted platelet donation successfully',
      deletedPlateletDonation: {
        _id: faker.getId(),
        phone: faker.getPhone(),
        donorId: faker.getId(),
        date: faker.getTimestamp(5)
      }
    }
  }

  /** Guest get statistics */
  @Get('log/statistics')
  @Hidden()
  public async getStatistics(): Promise<{
    status: string
    statusCode: number
    message: string
    statistics: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Statistics fetched successfully',
      statistics: {
        donorCount: faker.getRandomIndex(2600),
        donationCount: faker.getRandomIndex(1200),
        donationCountMadeByApp: faker.getRandomIndex(900),
        plateletDonationCount: faker.getRandomIndex(300),
        volunteerCount: faker.getRandomIndex(130)
      }
    }
  }

  /** Guest donation logs grouped by year and month (bar chart) */
  @Get('log/donations')
  @Hidden()
  public async getLogsDonations(): Promise<{
    status: string
    statusCode: number
    message: string
    countByYearMonth: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donation logs fetched successfully',
      countByYearMonth: faker.getDonationCountByYearMonth()
    }
  }

  /** Guest whole blood donations report */
  @Get('donations/report')
  @Hidden()
  public async getDonationsReport(
    @Query() startDate: number,
    @Query() endDate: number
  ): Promise<{
    status: string
    statusCode: number
    message: string
    report: any[]
    firstDonationCount: number
    hallwiseReport: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donations report generated successfully',
      report: faker.getDonationReport(startDate, endDate),
      firstDonationCount: faker.getRandomIndex(150),
      hallwiseReport: faker.getHallwiseDonationReport(startDate, endDate, 'firstDonationCount')
    }
  }

  /** Guest donations behind a single whole blood report cell */
  @Get('donations/report/donors')
  @Hidden()
  public async getDonationsReportDonors(
    @Query() startDate: number,
    @Query() endDate: number,
    @Query() bloodGroup: number,
    @Query() hall: number
  ): Promise<{
    status: string
    statusCode: number
    message: string
    donations: any[]
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donations with donors for the time period',
      donations: faker.getReportDonors(startDate, endDate, bloodGroup, hall)
    }
  }

  /** Guest platelet donations report */
  @Get('platelet-donations/report')
  @Hidden()
  public async getPlateletDonationsReport(
    @Query() startDate: number,
    @Query() endDate: number
  ): Promise<{
    status: string
    statusCode: number
    message: string
    report: any[]
    firstPlateletDonationCount: number
    hallwiseReport: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Platelet donations report generated successfully',
      report: faker.getDonationReport(startDate, endDate),
      firstPlateletDonationCount: faker.getRandomIndex(75),
      hallwiseReport: faker.getHallwiseDonationReport(startDate, endDate, 'firstPlateletDonationCount')
    }
  }

  /** Guest donations behind a single platelet report cell */
  @Get('platelet-donations/report/donors')
  @Hidden()
  public async getPlateletDonationsReportDonors(
    @Query() startDate: number,
    @Query() endDate: number,
    @Query() bloodGroup: number,
    @Query() hall: number
  ): Promise<{
    status: string
    statusCode: number
    message: string
    donations: any[]
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched platelet donations with donors for the time period',
      donations: faker.getReportDonors(startDate, endDate, bloodGroup, hall)
    }
  }

  /** Guest delete logs */
  @Delete('log')
  @Hidden()
  public async deleteLogs(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All logs deleted successfully'
    }
  }

  /** Guest view all donors */
  @Get('donors/all')
  @Hidden()
  public async viewAllDonors(): Promise<{
    status: string
    statusCode: number
    message: string
    data: any[]
  }> {
    const object: any[] = []
    for (let i: number = 0; i < faker.getRandomIndex(200); i++) {
      object.push({
        name: faker.getName(),
        hall: faker.getHall(),
        studentId: faker.getStudentId(),
        logCount: faker.getRandomIndex(20),
        designation: faker.getDesignation(),
        archiveFlag: false,
        _id: faker.getId()
      })
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      data: object
    }
  }

  /** Guest create call record */
  @Post('callrecords')
  @Hidden()
  public async createCallRecord(): Promise<{
    status: string
    statusCode: number
    message: string
    callRecord: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Call record insertion successful',
      callRecord: {
        date: faker.getTimestamp(5),
        _id: faker.getId(),
        callerId: faker.getId(),
        calleeId: faker.getId()
      }
    }
  }

  /** Guest delete call record */
  @Delete('callrecords')
  @Hidden()
  public async deleteCallRecord(): Promise<{
    status: string
    statusCode: number
    message: string
    deletedCallRecord: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Call record deletion successful',
      deletedCallRecord: {
        date: faker.getTimestamp(10),
        _id: faker.getId(),
        callerId: faker.getId(),
        calleeId: faker.getId()
      }
    }
  }

  /** Guest check duplicate donor */
  @Get('donors/checkDuplicate')
  @Hidden()
  public async checkDuplicateDonor(): Promise<{
    status: string
    statusCode: number
    message: string
    found: boolean
    donor: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Duplicate donor found',
      found: true,
      donor: {
        address: faker.getAddress(),
        roomNumber: faker.getRoom(),
        designation: faker.getDesignation(),
        comment: faker.getComment(),
        commentTime: faker.getTimestamp(30),
        email: faker.getEmail(),
        _id: faker.getId(),
        phone: faker.getPhone(),
        bloodGroup: faker.getBloodGroup(),
        hall: faker.getHall(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        availableToAll: faker.getBoolean(),
        archiveFlag: false
      }
    }
  }

  /** Guest get logs */
  @Get('log')
  @Hidden()
  public async getLogs(): Promise<{
    status: string
    statusCode: number
    message: string
    logs: any[]
  }> {
    const logs: any[] = []
    for (let i: number = 0; i < 15; i++) {
      logs.push({
        date: faker.getTimestamp(10),
        _id: faker.getId(),
        name: faker.getName(),
        hall: faker.getHall(),
        operation: faker.getOperation()
      })
    }
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All logs fetched successfully',
      logs
    }
  }

  /** Guest patch password */
  @Patch('users/password')
  @Hidden()
  public async patchPassword(): Promise<{
    status: string
    statusCode: number
    message: string
    token: string
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Password changed successfully',
      token: faker.getToken()
    }
  }

  /** Guest create public contact */
  @Post('publicContacts')
  @Hidden()
  public async createPublicContact(): Promise<{
    status: string
    statusCode: number
    message: string
    publicContact: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Public contact added successfully',
      publicContact: {
        bloodGroup: 2,
        _id: faker.getId(),
        donorId: faker.getId()
      }
    }
  }

  /** Guest delete public contact */
  @Delete('publicContacts')
  @Hidden()
  public async deletePublicContact(): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Public contact deleted successfully'
    }
  }

  /** Guest get public contacts */
  @Get('publicContacts')
  @Hidden()
  public async getPublicContacts(): Promise<{
    status: string
    statusCode: number
    message: string
    publicContacts: any[]
  }> {
    type contactType = { donorId: string; phone: number; name: string; contactId: string }
    const publicContacts: { bloodGroup: number; contacts: contactType[] }[] = []
    let contacts: contactType[] = []

    for (let i: number = 0; i < 2; i++) {
      contacts.push({
        donorId: faker.getId(),
        phone: faker.getPhone(),
        name: faker.getName(),
        contactId: faker.getId()
      })
    }
    publicContacts.push({
      bloodGroup: -1,
      contacts
    })

    for (let i: number = 0; i < 4; i++) {
      contacts = []
      for (let j: number = 0; j < 2; j++) {
        contacts.push({
          donorId: faker.getId(),
          phone: faker.getPhone(),
          name: faker.getName(),
          contactId: faker.getId()
        })
      }
      publicContacts.push({
        bloodGroup: i * 2,
        contacts
      })
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All public contacts fetched successfully',
      publicContacts
    }
  }

  /** Guest get donors by designation */
  @Get('donors/designation')
  @Hidden()
  public async getDonorsByDesignation(): Promise<{
    status: string
    statusCode: number
    message: string
    volunteerList: any[]
    adminList: any[]
    superAdminList: any[]
  }> {
    const volunteerList: any[] = []
    const adminList: any[] = []
    const superAdminList: any[] = []

    for (let i: number = 0; i < 7; i++) {
      adminList.push({
        _id: faker.getId(),
        studentId: faker.getStudentId(),
        name: faker.getName(),
        phone: faker.getPhone(),
        hall: i
      })
    }
    for (let i: number = 0; i < 15; i++) {
      volunteerList.push({
        roomNumber: faker.getRoom(),
        _id: faker.getId(),
        studentId: faker.getStudentId(),
        name: faker.getName(),
        bloodGroup: faker.getBloodGroup(),
        phone: faker.getPhone()
      })
    }
    for (let i: number = 0; i < 5; i++) {
      superAdminList.push({
        _id: faker.getId(),
        studentId: faker.getStudentId(),
        name: faker.getName(),
        phone: faker.getPhone(),
        hall: faker.getHall()
      })
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All designated members fetched',
      volunteerList,
      adminList,
      superAdminList
    }
  }

  /** Guest get logins */
  @Get('users/logins')
  @Hidden()
  public async getLogins(): Promise<{
    status: string
    statusCode: number
    message: string
    logins: any[]
    currentLogin: any
  }> {
    const logins: any[] = [
      {
        _id: faker.getId(),
        os: 'Ubuntu 20.04.1',
        device: 'Asus K550VX',
        browserFamily: 'Firefox',
        ipAddress: '1.2.3.4'
      },
      {
        _id: faker.getId(),
        os: 'Windows 10',
        device: 'Lenovo IP320S',
        browserFamily: 'Chrome 98.2.5',
        ipAddress: '5.6.7.8'
      },
      {
        _id: faker.getId(),
        os: 'MacOS McMojave',
        device: 'MacBook Pro',
        browserFamily: 'Safari 100.2.3',
        ipAddress: '9.10.11.12'
      }
    ]

    const currentLogin: any = {
      _id: faker.getId(),
      os: 'MacOS McMojave',
      device: 'MacBook Pro',
      browserFamily: 'Safari 100.2.3',
      ipAddress: '9.10.11.12'
    }

    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Recent logins fetched successfully',
      logins,
      currentLogin
    }
  }

  /** Guest delete login */
  @Delete('users/logins/{tokenId}')
  @Hidden()
  public async deleteLogin(@Path() tokenId: string): Promise<{
    status: string
    statusCode: number
    message: string
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logged out from specified device'
    }
  }

  /** Guest delete active donor */
  @Delete('activeDonors/{donorId}')
  @Hidden()
  public async deleteActiveDonor(@Path() donorId: string): Promise<{
    status: string
    statusCode: number
    message: string
    removedActiveDonor: any
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Active donor deleted successfully',
      removedActiveDonor: {
        _id: faker.getId(),
        donorId: faker.getId(),
        markerId: faker.getId(),
        time: faker.getTimestamp(2)
      }
    }
  }

  /** Guest create active donor */
  @Post('activeDonors')
  @Hidden()
  public async createActiveDonor(): Promise<{
    status: string
    statusCode: number
    message: string
    newActiveDonor: any
  }> {
    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Active donor created',
      newActiveDonor: {
        _id: faker.getId(),
        donorId: faker.getId(),
        markerId: faker.getId(),
        time: faker.getTimestamp(2)
      }
    }
  }

  /** Guest get active donors */
  @Get('activeDonors')
  @Hidden()
  public async getActiveDonors(): Promise<{
    status: string
    statusCode: number
    message: string
    activeDonors: any[]
  }> {
    const filteredActiveDonors: any[] = []

    for (let i: number = 0; i < faker.getRandInt(1, 50); i++) {
      filteredActiveDonors.push({
        _id: faker.getId(),
        hall: faker.getHall(),
        name: faker.getName(),
        address: faker.getAddress(),
        comment: faker.getComment(),
        commentTime: faker.getTimestamp(2),
        lastDonation: faker.getTimestamp(240),
        availableToAll: faker.getBoolean(),
        archiveFlag: false,
        bloodGroup: faker.getBloodGroup(),
        studentId: faker.getStudentId(),
        phone: faker.getPhone(),
        markedTime: faker.getTimestamp(2),
        markerName: faker.getName(),
        donationCount: faker.getDonationCount(),
        callRecordCount: faker.getDonationCount(),
        lastCallRecord: faker.getTimestamp(2)
      })
    }
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Active donor fetched successfully',
      activeDonors: filteredActiveDonors
    }
  }

  /** Guest fetch a donor certificate */
  @Get('certificates/{donorId}')
  @Hidden()
  public async getCertificate(@Path() donorId: string): Promise<{
    status: string
    statusCode: number
    message: string
    certificate: { name: string; studentId: string }
  }> {
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Certificate fetched successfully',
      certificate: {
        name: faker.getName(),
        studentId: faker.getStudentId()
      }
    }
  }

  /** Guest get new donors */
  @Get('donors/new')
  @Hidden()
  public async getNewDonors(): Promise<{
    status: string
    statusCode: number
    message: string
    donors: any[]
  }> {
    const donors: any[] = []
    const count: number = faker.getRandInt(1, 20)
    for (let i: number = 0; i < count; i++) {
      donors.push({
        _id: faker.getId(),
        phone: faker.getPhone(),
        name: faker.getName(),
        studentId: faker.getStudentId(),
        bloodGroup: faker.getBloodGroup(),
        hall: faker.getHall(),
        address: faker.getAddress(),
        roomNumber: faker.getRoom(),
        designation: faker.getDesignation(),
        comment: faker.getComment(),
        commentTime: faker.getTimestamp(240),
        availableToAll: faker.getBoolean(),
        archiveFlag: false,
        email: faker.getEmail(),
        created: faker.getTimestamp(240)
      })
    }
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donors created in time range fetched successfully',
      donors
    }
  }
}

