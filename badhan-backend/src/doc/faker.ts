import faker from 'faker'
const phoneOperators: string[] = ['88014', '88015', '88016', '88017', '88018', '88019']
const departments: string[] = [
  '01', '02', '04', '05', '06', '08', '10', '11', '12', '15', '16', '18'
]

const halls: number[] = [
  0, 1, 2, 3, 4, 5, 6
]

const operations: string[] = [
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

export const getRandInt = (min: number, max: number):number => {
  return faker.datatype.number({ min, max })
}
export const getRandomIndex = (maxIndex: number): number => {
  return faker.datatype.number({ min: 0, max: maxIndex })
}

export const getToken = ():string => {
  return faker.datatype.hexaDecimal(32).substr(2, 32).toLowerCase()
}
export const getId = ():string => {
  return faker.datatype.hexaDecimal(32).substr(2, 32).toLowerCase()
}
export const getPhone = ():number => {
  return parseInt(phoneOperators[getRandomIndex(5)] + '' + getRandInt(10000000, 99999999),10)
}
export const getName = ():string => {
  return faker.name.findName()
}
export const getStudentId = (): string => {
  const currentBatch: number = new Date().getFullYear() % 100
  return getRandInt(currentBatch - 9, currentBatch) + departments[getRandomIndex(11)] + getRandInt(100, 200)
}
export const getBloodGroup = ():number => {
  return getRandomIndex(7)
}
export const getHall = ():number => {
  return halls[getRandomIndex(halls.length - 1)]
}
export const getRoom = ():string => {
  return faker.address.zipCode()
}
export const getAddress = ():string => {
  return faker.address.streetAddress() + ', ' + faker.address.cityName() + ', ' + faker.address.country()
}
export const getComment = ():string => {
  return faker.lorem.sentence()
}
export const getTimestamp = (day: number):number => {
  return new Date().getTime() - 24 * 3600 * 1000 * getRandomIndex(day)
}
export const getDesignation = ():number => {
  return getRandInt(1, 3)
}
export const getBoolean = ():boolean => {
  return faker.datatype.boolean()
}
export const getDonationCount = ():number => {
  return getRandomIndex(6)
}
export const getDonations = ():{date: number, _id: string, phone: number, donorId: string}[] => {
  const donations:{date: number, _id: string, phone: number, donorId: string}[] = []
  for (let i:number = 0; i < getRandomIndex(5); i++) {
    donations.push({
      date: getTimestamp(5),
      _id: getId(),
      phone: getPhone(),
      donorId: getId()
    })
  }
  return donations
}
export const getOperation = ():string => {
  return operations[getRandomIndex(operations.length - 1)]
}
export const getFakeDateString = ():string => {
  const date:Date = new Date()
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + getRandInt(1, 28)
}

export const getEmail = ():string => {
  return faker.internet.email()
}

export const getExpireAt = ():string => {
  return '2021-11-15T11:23:54.231Z'
}

