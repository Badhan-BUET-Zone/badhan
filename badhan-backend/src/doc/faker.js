const faker = require('faker');
const phoneOperators = ['88014','88015','88016','88017','88018','88019']
const departments = [
    '01','02', '04','05','06', '08','10','11', '12', '15', '16','18'
];

const halls = [
    0,1,2,3,4,5,6
]

const operations = [
    "CREATE DONOR",
    "DELETE DONOR",
    "SEARCH DONORS",
    "UPDATE DONOR COMMENT",
    "UPDATE DONOR PASSWORD",
    "UPDATE DONOR",
    "UPDATE DONOR DESIGNATION",
    "READ VOLUNTEERS",
    "UPDATE DONOR DESIGNATION (DEMOTE HALLADMIN)",
    "PROMOTE VOLUNTEER",
    "READ ADMINS",
    "READ DONOR",
    "ENTERED APP",
    "GET DONORS DUPLICATE",
    "CREATE CALLRECORD",
    "DELETE CALLRECORD",
    "CREATE DONATION",
    "CREATE SIGN IN",
    "DELETE SIGN OUT",
    "DELETE SIGN OUT ALL",
    "CREATE REDIRECTED TO WEB",
]

/////////////////////////TO BE EXPORTED///////////////////////////////

const getRandInt = (min,max)=>{
    return faker.datatype.number({ min: min, max:max })
}
const getRandomIndex = (maxIndex)=>{
    return faker.datatype.number({min:0,max:maxIndex})
}

const getToken = ()=>{
    return faker.datatype.hexaDecimal(32).substr(2,32).toLowerCase();
}
const getId = ()=>{
    return faker.datatype.hexaDecimal(32).substr(2,32).toLowerCase();
}
const getPhone = ()=>{
    return parseInt(phoneOperators[getRandomIndex(5)]+""+getRandInt(10000000,99999999));
}
const getName = ()=>{
    return faker.name.findName();
}
const getStudentId = ()=>{
    return getRandInt(14,20)+departments[getRandomIndex(11)]+getRandInt(100,200);
}
const getBloodGroup = ()=>{
    return getRandomIndex(7);
}
const getHall = ()=>{
    return halls[getRandomIndex(halls.length-1)];
}
const getRoom = ()=>{
    return faker.address.zipCode()
}
const getAddress = ()=>{
    return faker.address.streetAddress()+', '+faker.address.cityName()+', '+faker.address.country();
}
const getComment = ()=>{
    return faker.lorem.sentence();
}
const getTimestamp = (day)=>{
    return new Date().getTime() - 24 * 3600 * 1000 * getRandomIndex(day);
}
const getDesignation = ()=>{
    return getRandInt(1,3);
}
const getBoolean = ()=>{
    return faker.datatype.boolean();
}
const getDonationCount = ()=>{
    return getRandomIndex(6);
}
const getDonations = ()=>{
    let donations = [];
    for(let i = 0 ; i < getRandomIndex(5);i++){
        donations.push({
            date: getTimestamp(),
            _id: getId(),
            phone: getPhone(),
            donorId: getId(),
        })
    }
    return donations;
}
const getOperation = ()=>{
    return operations[getRandomIndex(operations.length-1)];
}
const getFakeDateString = ()=>{
    let date = new Date();
    return date.getFullYear()+"-"+(date.getMonth()+1)+"-"+getRandInt(1,28);
}

const getEmail = ()=>{
    return faker.internet.email();
}

const getExpireAt = ()=>{
    return "2021-11-15T11:23:54.231Z"
}

module.exports = {
    getName,
    getId,
    getToken,
    getPhone,
    getStudentId,
    getBloodGroup,
    getHall,
    getRoom,
    getAddress,
    getComment,
    getTimestamp,
    getDesignation,
    getBoolean,
    getDonationCount,
    getRandomIndex,
    getDonations,
    getOperation,
    getFakeDateString,
    getEmail,
    getExpireAt
}


