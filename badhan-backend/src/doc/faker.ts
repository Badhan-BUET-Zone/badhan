import faker from 'faker'
const phoneOperators = ['88014', '88015', '88016', '88017', '88018', '88019']
const departments = [
  '01', '02', '04', '05', '06', '08', '10', '11', '12', '15', '16', '18'
]

const halls = [
  0, 1, 2, 3, 4, 5, 6
]

const operations = [
  'CREATE DONOR',
  'DELETE DONOR',
  'SEARCH DONORS',
  'UPDATE DONOR COMMENT',
  'UPDATE DONOR PASSWORD',
  'UPDATE DONOR',
  'UPDATE DONOR DESIGNATION',
  'READ VOLUNTEERS',
  'UPDATE DONOR DESIGNATION (DEMOTE HALLADMIN)',
  'PROMOTE VOLUNTEER',
  'READ ADMINS',
  'READ DONOR',
  'ENTERED APP',
  'GET DONORS DUPLICATE',
  'CREATE CALLRECORD',
  'DELETE CALLRECORD',
  'CREATE DONATION',
  'CREATE SIGN IN',
  'DELETE SIGN OUT',
  'DELETE SIGN OUT ALL',
  'CREATE REDIRECTED TO WEB'
]

/// //////////////////////TO BE EXPORTED///////////////////////////////

export const getRandInt = (min: number, max: number) => {
  return faker.datatype.number({ min, max })
}
export const getRandomIndex = (maxIndex: number) => {
  return faker.datatype.number({ min: 0, max: maxIndex })
}

export const getToken = () => {
  return faker.datatype.hexaDecimal(32).substr(2, 32).toLowerCase()
}
export const getId = () => {
  return faker.datatype.hexaDecimal(32).substr(2, 32).toLowerCase()
}
export const getPhone = () => {
  return parseInt(phoneOperators[getRandomIndex(5)] + '' + getRandInt(10000000, 99999999),10)
}
export const getName = () => {
  return faker.name.findName()
}
export const getStudentId = () => {
  return getRandInt(14, 20) + departments[getRandomIndex(11)] + getRandInt(100, 200)
}
export const getBloodGroup = () => {
  return getRandomIndex(7)
}
export const getHall = () => {
  return halls[getRandomIndex(halls.length - 1)]
}
export const getRoom = () => {
  return faker.address.zipCode()
}
export const getAddress = () => {
  return faker.address.streetAddress() + ', ' + faker.address.cityName() + ', ' + faker.address.country()
}
export const getComment = () => {
  return faker.lorem.sentence()
}
export const getTimestamp = (day: number) => {
  return new Date().getTime() - 24 * 3600 * 1000 * getRandomIndex(day)
}
export const getDesignation = () => {
  return getRandInt(1, 3)
}
export const getBoolean = () => {
  return faker.datatype.boolean()
}
export const getDonationCount = () => {
  return getRandomIndex(6)
}
export const getDonations = () => {
  const donations = []
  for (let i = 0; i < getRandomIndex(5); i++) {
    donations.push({
      date: getTimestamp(5),
      _id: getId(),
      phone: getPhone(),
      donorId: getId()
    })
  }
  return donations
}
export const getOperation = () => {
  return operations[getRandomIndex(operations.length - 1)]
}
export const getFakeDateString = () => {
  const date = new Date()
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + getRandInt(1, 28)
}

export const getEmail = () => {
  return faker.internet.email()
}

export const getExpireAt = () => {
  return '2021-11-15T11:23:54.231Z'
}

