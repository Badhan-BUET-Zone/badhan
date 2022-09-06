import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";
import logController from '../controllers/logController'
import * as faker from "../doc/faker";
import {Request, RequestHandler, Response} from 'express'
const handlePOSTLogIn = async (req: Request, res: Response): Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Guest sign in will not show actual nor accurate data', {
    token: faker.getToken()
  }))
}

const handlePOSTViewDonorDetailsSelf = async (req: Request, res: Response): Promise<Response> => {
  const obj: {
    _id: string
    phone: number
    name: string
    studentId: string
    bloodGroup: number
    hall: number
    roomNumber: string
    address: string
    comment: string
    commentTime: number
    designation: number
    availableToAll: boolean
    email: string
    lastDonation: number
  } = {
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
    designation: 3,
    availableToAll: faker.getBoolean(),
    email: faker.getEmail(),
    lastDonation: faker.getTimestamp(240)
  }

  return res.status(200).send(new OKResponse200('Fetched donor details successfully', {
    donor: obj
  }))
}

const handlePOSTInsertDonor = async (req: Request, res: Response):Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('New donor inserted successfully', {
    newDonor: {
      address: faker.getAddress(),
      roomNumber: faker.getRoom(),
      designation: faker.getDesignation(),
      lastDonation: faker.getTimestamp(240),
      comment: faker.getComment(),
      commentTime: faker.getTimestamp(240),
      _id: faker.getId(),
      phone: faker.getPhone(),
      bloodGroup: faker.getBloodGroup(),
      hall: faker.getHall(),
      name: faker.getName(),
      studentId: faker.getStudentId(),
      availableToAll: faker.getBoolean(),
      email: faker.getEmail()
    }
  }))
}

const handlePOSTLogOut = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Logged out successfully',{}))
}

const handlePOSTLogOutAll = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Logged out from all devices successfully',{}))
}

const handlePOSTSearchDonors = async (req: Request, res: Response):Promise<Response> => {
  const filteredDonors:{
    _id: string,
    phone: number,
    name: string,
    studentId: string,
    hall: number,
    lastDonation: number,
    bloodGroup: number,
    address: string,
    roomNumber: string,
    comment: string,
    donationCount: number,
    commentTime: number,
    availableToAll: boolean,
    callRecordCount: number,
    lastCalled: number,
    marker: { name: string; time: number } | {}
  }[] = []

  for (let i: number = 0; i < faker.getRandInt(1, 50); i++) {
    const randomMarker: { name: string; time: number } | {} = faker.getBoolean()
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
      bloodGroup: faker.getBloodGroup(),
      address: faker.getAddress(),
      roomNumber: faker.getRoom(),
      comment: faker.getComment(),
      donationCount: faker.getDonationCount(),
      commentTime: faker.getTimestamp(240),
      availableToAll: faker.getBoolean(),
      callRecordCount: faker.getRandomIndex(3),
      lastCalled: faker.getTimestamp(10),
      marker: randomMarker
    })
  }

  return res.status(200).send(new OKResponse200('Donors queried successfully', {
    filteredDonors
  }))
}

const handlePOSTDeleteDonor = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Donor deleted successfully',{}))
}

const handlePOSTComment = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Comment posted successfully',{}))
}

const handlePOSTChangePassword = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Created recovery link for user successfully', {
    token: faker.getToken()
  }))
}

const handlePOSTEditDonor = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Donor updated successfully',{}))
}

const handlePOSTPromote = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Target user promoted/demoted successfully',{}))
}

const handlePOSTChangeAdmin = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Changed hall admin successfully',{}))
}

const handleGETViewDonorDetails = async (req: Request, res: Response):Promise<Response> => {
  const callRecords: {
    date: number
    _id: string
    callerId: {
      designation: number
      _id: string
      hall: number
      name: string
    },
    calleeId: string
    expireAt: string
  }[] = []
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
      calleeId: faker.getId(),
      expireAt: faker.getExpireAt()
    }
    )
  }
  const donations:{
    date: number,
    _id: string,
    phone: number,
    donorId: string
  }[] = []
  for (let i: number = 0; i < 2; i++) {
    donations.push({
      date: faker.getTimestamp(240),
      _id: faker.getId(),
      phone: faker.getPhone(),
      donorId: faker.getId()
    }
    )
  }
  const publicContacts: {bloodGroup: number, _id: string, donorId: string}[] = [
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

  const randomMarker: { donorId: string; time: number; markerId: { name: string; _id: string } } | null = faker.getBoolean()
    ? {
        donorId: faker.getId(),
        markerId: {
          _id: faker.getId(),
          name: faker.getName()
        },
        time: faker.getTimestamp(20)
      }
    : null

  const obj: { roomNumber: string; address: string; donations: { date: number; _id: string; phone: number; donorId: string }[]; callRecords: { date: number; calleeId: string; _id: string; callerId: { name: string; hall: number; designation: number; _id: string }; expireAt: string }[]; availableToAll: boolean; hall: number; commentTime: number; studentId: string; bloodGroup: number; phone: number; lastDonation: number; name: string; publicContacts: { bloodGroup: number; _id: string; donorId: string }[]; comment: string; _id: string; designation: number; markedBy: { donorId: string; time: number; markerId: { name: string; _id: string } } | null; email: string } = {
    _id: faker.getId(),
    phone: faker.getPhone(),
    name: faker.getName(),
    studentId: faker.getStudentId(),
    lastDonation: faker.getTimestamp(240),
    bloodGroup: faker.getBloodGroup(),
    hall: faker.getHall(),
    roomNumber: faker.getRoom(),
    address: faker.getAddress(),
    comment: faker.getComment(),
    designation: faker.getDesignation(),
    commentTime: faker.getTimestamp(240),
    callRecords,
    donations,
    publicContacts,
    availableToAll: faker.getBoolean(),
    email: faker.getEmail(),
    markedBy: randomMarker
  }

  return res.status(200).send(new OKResponse200('Fetched donor details successfully', {
    donor: obj
  }))
}

const handlePOSTViewVolunteersOfOwnHall = async (req: Request, res: Response):Promise<Response> => {
  const volunteerList: {
    _id: string,
    bloodGroup: number,
    name: string,
    phone: number,
    roomNumber: string,
    studentId: string
  }[] = []
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

  return res.status(200).send(new OKResponse200('Volunteer list fetched successfully', {
    volunteerList
  }))
}

const handlePOSTShowHallAdmins = async (req: Request, res: Response):Promise<Response> => {
  const admins: { _id: string, hall: number, name: string, phone: number }[] = []
  for (let i: number = 0; i <= 6; i++) {
    admins.push({
      _id: faker.getId(),
      hall: i,
      name: faker.getName(),
      phone: faker.getPhone()
    })
  }
  return res.status(200).send(new OKResponse200('Hall admin list fetched successfully', {
    admins
  }))
}

const handlePOSTInsertDonation = async (req: Request, res: Response):Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Donation inserted successfully', {
    newDonation: {
      date: faker.getTimestamp(10),
      _id: faker.getId(),
      phone: faker.getPhone(),
      donorId: faker.getId()
    }
  }))
}

const handlePOSTDeleteDonation = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Deleted donation successfully',{
    deletedDonation: {
      _id: faker.getId(),
      phone: faker.getPhone(),
      donorId: faker.getId(),
      date: faker.getTimestamp(5)
    }
  }))
}

const handleGETStatistics = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Statistics fetched successfully', {
    statistics: {
      donorCount: faker.getRandomIndex(2600),
      donationCount: faker.getRandomIndex(1200),
      volunteerCount: faker.getRandomIndex(130)
    }
  }))
}

const handleDELETELogs = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('All logs deleted successfully',{}))
}

const handleGETViewAllVolunteers = async (req: Request, res: Response):Promise<Response> => {
  const object: {name: string, hall: number, studentId: string, logCount: number, _id: string}[] = []
  for (let i: number = 0; i < faker.getRandomIndex(200); i++) {
    object.push({
      name: faker.getName(),
      hall: faker.getHall(),
      studentId: faker.getStudentId(),
      logCount: faker.getRandomIndex(20),
      _id: faker.getId()
    })
  }

  return res.status(200).send(new OKResponse200('Fetched donor details successfully', {
    data: object
  }))
}

const handlePOSTCallRecord = async (req: Request, res: Response):Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Call record insertion successful', {
    callRecord: {
      date: faker.getTimestamp(5),
      _id: faker.getId(),
      callerId: faker.getId(),
      calleeId: faker.getId(),
      expireAt: '2021-11-21T09:28:52.764Z'
    }
  }))
}

const handleDELETECallRecord = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Call record deletion successful', {
    deletedCallRecord: {
      date: faker.getTimestamp(10),
      _id: faker.getId(),
      callerId: faker.getId(),
      calleeId: faker.getId(),
      expireAt: '2021-11-21T09:28:52.764Z'
    }
  }))
}

const handleGETDonorsDuplicate = async (req: Request, res: Response):Promise<Response> => {
  return res.status(200).send(new OKResponse200('Duplicate donor found', {
    found: true,
    donor: {
      address: faker.getAddress(),
      roomNumber: faker.getRoom(),
      designation: faker.getDesignation(),
      lastDonation: faker.getTimestamp(30),
      comment: faker.getComment(),
      commentTime: faker.getTimestamp(30),
      email: faker.getEmail(),
      _id: faker.getId(),
      phone: faker.getPhone(),
      bloodGroup: faker.getBloodGroup(),
      hall: faker.getHall(),
      name: faker.getName(),
      studentId: faker.getStudentId(),
      availableToAll: faker.getBoolean()
    }
  }))
}

const handleGETLogs = async (req: Request, res: Response):Promise<Response> => {
  const logs:{ dateString: string, activeUserCount: number, totalLogCount: number }[] = []
  for (let i: number = 0; i < 15; i++) {
    logs.push({
      dateString: faker.getFakeDateString(),
      activeUserCount: faker.getRandomIndex(20),
      totalLogCount: faker.getRandomIndex(20)
    })
  }
  return res.status(200).send(new OKResponse200('All logs fetched successfully', {
    logs
  }))
}

const handleGETLogsByDateAndDonor = async (req: Request, res: Response):Promise<Response> => {
  const logs: {_id: string, date: number, operation: string, details: {}}[] = []

  for (let i: number = 0; i < 15; i++) {
    logs.push({
      _id: faker.getId(),
      date: faker.getTimestamp(2),
      operation: faker.getOperation(),
      details: {}
    })
  }
  return res.status(200).send(new OKResponse200('Logs fetched by user and date', {
    logs
  }))
}

const handleGETLogsByDate = async (req: Request, res: Response):Promise<Response> => {
  const logs: {name: string, donorId: string, hall: number, count: number}[] = []
  for (let i: number = 0; i < 15; i++) {
    logs.push({
      name: faker.getName(),
      donorId: faker.getId(),
      hall: faker.getHall(),
      count: faker.getRandomIndex(20)
    })
  }
  return res.status(200).send(new OKResponse200('Logs fetched by date successfully', {
    logs
  }))
}

const handlePATCHPassword = async (req: Request, res: Response):Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Password changed successfully', {
    token: faker.getToken()
  }))
}

const handlePOSTPublicContact = async (req: Request, res: Response): Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Public contact added successfully', {
    publicContact: {
      bloodGroup: 2,
      _id: faker.getId(),
      donorId: faker.getId()
    }
  }))
}

const handleDELETEPublicContact = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send(new OKResponse200('Public contact deleted successfully',{}))
}

const handleGETPublicContacts = async (req: Request, res: Response): Promise<Response> => {
  type contactType = { donorId: string, phone: number, name: string, contactId: string }
  const publicContacts: { bloodGroup: number, contacts: contactType[]}[] = []
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

  return res.status(200).send(new OKResponse200('All public contacts fetched successfully', {
    publicContacts
  }))
}

const handleGETDonorsDesignation = async (req: Request, res: Response): Promise<Response> => {
  type adminType = { _id: string, studentId: string, name: string, phone: number, hall: number }
  type volunteerType = { roomNumber: string, _id: string, studentId: string, name: string, bloodGroup: number, phone: number}
  type superAdminType = adminType
  const volunteerList: volunteerType[] = []
  const adminList: adminType[] = []
  const superAdminList: superAdminType[] = []

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

  return res.status(200).send(new OKResponse200('All designated members fetched', {
    volunteerList,
    adminList,
    superAdminList
  }))
}

const handleGETLogins = async (req: Request, res: Response): Promise<Response> => {
  type loginType = { _id: string, os: string, device: string, browserFamily: string, ipAddress: string }
  const logins: loginType[] = [
    {
      _id: faker.getId(),
      os: 'Ubuntu 20.04.1',
      device: 'Asus K550VX',
      browserFamily: 'Firefox',
      ipAddress: '1.2.3.4'
    }, {
      _id: faker.getId(),
      os: 'Windows 10',
      device: 'Lenovo IP320S',
      browserFamily: 'Chrome 98.2.5',
      ipAddress: '5.6.7.8'
    }, {
      _id: faker.getId(),
      os: 'MacOS McMojave',
      device: 'MacBook Pro',
      browserFamily: 'Safari 100.2.3',
      ipAddress: '9.10.11.12'
    }
  ]

  const currentLogin: loginType = {
    _id: faker.getId(),
    os: 'MacOS McMojave',
    device: 'MacBook Pro',
    browserFamily: 'Safari 100.2.3',
    ipAddress: '9.10.11.12'
  }

  return res.status(200).send(new OKResponse200('Recent logins fetched successfully', {
    logins,
    currentLogin
  }))
}
const handleDELETELogins = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send(new OKResponse200('Logged out from specified device',{}))
}

const handleDELETEActiveDonors = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send(new OKResponse200('Active donor deleted successfully', {
    removedActiveDonor: {
      _id: faker.getId(),
      donorId: faker.getId(),
      markerId: faker.getId(),
      time: faker.getTimestamp(2)
    }
  }))
}

const handlePOSTActiveDonors = async (req: Request, res: Response): Promise<Response> => {
  return res.status(201).send(new CreatedResponse201('Active donor created', {
    newActiveDonor: {
      _id: faker.getId(),
      donorId: faker.getId(),
      markerId: faker.getId(),
      time: faker.getTimestamp(2)
    }
  }))
}

const handleGETActiveDonors = async (req: Request, res: Response): Promise<Response> => {
  const filteredActiveDonors:{ _id: string, hall: number, name: string, address: string, comment: string, commentTime: number,
    lastDonation: number, availableToAll: boolean, bloodGroup: number, studentId: string, phone: number, markedTime: number,
    markerName: string, donationCount: number, callRecordCount: number, lastCallRecord: number }[] = []

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
  return res.status(200).send(new OKResponse200('Active donor fetched successfully', {
    activeDonors: filteredActiveDonors
  }))
}

const handleGETAppVersions: RequestHandler = logController.handleGETAppVersions

const handlePATCHAdminsSuperAdmin = async (req: Request,res: Response): Promise<Response> => {
  return res.status(200).send(new OKResponse200('Donor has been promoted to Super Admin',{
    donor: {
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
      designation: 3,
      availableToAll: faker.getBoolean(),
      email: faker.getEmail(),
      lastDonation: faker.getTimestamp(240)
    }
  }))
}

export default {
  handlePOSTLogIn,
  handlePOSTViewDonorDetailsSelf,
  handlePOSTSearchDonors,
  handlePOSTLogOut,
  handlePOSTLogOutAll,
  handlePOSTInsertDonor,
  handlePOSTDeleteDonor,
  handlePOSTComment,
  handlePOSTChangePassword,
  handlePOSTEditDonor,
  handlePOSTPromote,
  handlePOSTChangeAdmin,
  handleGETViewDonorDetails,
  handlePOSTViewVolunteersOfOwnHall,
  handlePOSTShowHallAdmins,
  handlePOSTInsertDonation,
  handlePOSTDeleteDonation,
  handleGETStatistics,
  handleGETLogs,
  handleDELETELogs,
  handleGETViewAllVolunteers,
  handlePOSTCallRecord,
  handleDELETECallRecord,
  handleGETDonorsDuplicate,
  handleGETLogsByDateAndDonor,
  handleGETLogsByDate,
  handlePATCHPassword,
  handleGETPublicContacts,
  handleDELETEPublicContact,
  handlePOSTPublicContact,
  handleGETDonorsDesignation,
  handleGETLogins,
  handleDELETELogins,
  handleDELETEActiveDonors,
  handlePOSTActiveDonors,
  handleGETActiveDonors,
  handleGETAppVersions,
  handlePATCHAdminsSuperAdmin
}
