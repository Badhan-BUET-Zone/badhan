import faker from 'faker'
const phoneOperators: string[] = ['88014', '88015', '88016', '88017', '88018', '88019']
const departments: string[] = [
  '01', '02', '04', '05', '06', '08', '10', '11', '12', '15', '16', '17', '18'
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

// --- Report fakers (guest donation/platelet reports + donation logs chart) ---
interface FakeReportCount { month: number, year: number, count: number }
interface FakeReportBloodGroup { bloodGroup: number, counts: FakeReportCount[] }

// Every (month, year) pair spanned by [startDate, endDate], capped so a huge range
// can't blow up the payload.
const getMonthsInRange = (startDate: number, endDate: number): {month: number, year: number}[] => {
  const months: {month: number, year: number}[] = []
  const start: Date = new Date(startDate)
  const end: Date = new Date(endDate)
  let year: number = start.getFullYear()
  let month: number = start.getMonth() + 1
  const endYear: number = end.getFullYear()
  const endMonth: number = end.getMonth() + 1
  let guard: number = 0
  while ((year < endYear || (year === endYear && month <= endMonth)) && guard < 120) {
    months.push({ month, year })
    month++
    if (month > 12) { month = 1; year++ }
    guard++
  }
  // Fall back to the current month so a bad/empty range still renders a table
  if (months.length === 0) {
    const now: Date = new Date()
    months.push({ month: now.getMonth() + 1, year: now.getFullYear() })
  }
  return months
}

// [{ bloodGroup, counts: [{ month, year, count }] }] for the 8 blood groups (index 0..7)
export const getDonationReport = (startDate: number, endDate: number): FakeReportBloodGroup[] => {
  const months: {month: number, year: number}[] = getMonthsInRange(startDate, endDate)
  const report: FakeReportBloodGroup[] = []
  for (let bloodGroup: number = 0; bloodGroup < 8; bloodGroup++) {
    report.push({
      bloodGroup,
      counts: months.map((m: {month: number, year: number}): FakeReportCount => ({ month: m.month, year: m.year, count: getRandomIndex(20) }))
    })
  }
  return report
}

// Per-hall slice keyed by hall index (0..6), each { report, [firstCountKey]: number }
export const getHallwiseDonationReport = (startDate: number, endDate: number, firstCountKey: string): Record<number, any> => {
  const hallwiseReport: Record<number, any> = {}
  halls.forEach((hall: number): void => {
    hallwiseReport[hall] = {
      report: getDonationReport(startDate, endDate),
      [firstCountKey]: getRandomIndex(50)
    }
  })
  return hallwiseReport
}

// Donations behind a single report cell: [{ donorId, name, bloodGroup, hall, date }].
// bloodGroup/hall of -1 mean 'any' (the report's Total / All Halls column), so fake a
// random value for those; otherwise echo the requested cell's value.
export const getReportDonors = (startDate: number, endDate: number, bloodGroup: number, hall: number): {donorId: string, name: string, bloodGroup: number, hall: number, date: number}[] => {
  const donors: {donorId: string, name: string, bloodGroup: number, hall: number, date: number}[] = []
  for (let i: number = 0; i < getRandInt(1, 8); i++) {
    donors.push({
      donorId: getId(),
      name: getName(),
      bloodGroup: bloodGroup === -1 ? getBloodGroup() : bloodGroup,
      hall: hall === -1 ? getHall() : hall,
      date: getRandInt(startDate, endDate)
    })
  }
  return donors
}

// { [year]: { [month]: count } } for the last 12 months (donation logs bar chart)
export const getDonationCountByYearMonth = (): Record<string, Record<string, number>> => {
  const result: Record<string, Record<string, number>> = {}
  const now: Date = new Date()
  const currentYear: number = now.getFullYear()
  const currentMonth: number = now.getMonth() + 1
  for (let i: number = 0; i < 12; i++) {
    const month: number = (currentMonth - i - 1 + 12) % 12 + 1
    const year: number = currentYear - (month > currentMonth ? 1 : 0)
    if (!result[`${year}`]) result[`${year}`] = {}
    result[`${year}`][`${month}`] = getRandomIndex(60)
  }
  return result
}

