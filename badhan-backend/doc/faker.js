const faker = require('faker');
const phoneOperators = ['88014','88015','88016','88017','88018','88019']
const departments = [
    '01','02', '04','05','06', '08','10','11', '12', '15', '16','18'
];

const getRandInt = (min,max)=>{
    return faker.datatype.number({ min: min, max:max })
}

/////////////////////////TO BE EXPORTED///////////////////////////////
const getRandomIndex = (maxIndex)=>{
    return faker.datatype.number({min:0,max:maxIndex})
}

const getFakeToken = ()=>{
    return faker.datatype.hexaDecimal(32).substr(2,32).toLowerCase();
}
const getFakeId = ()=>{
    return faker.datatype.hexaDecimal(32).substr(2,32).toLowerCase();
}
const getFakePhone = ()=>{
    return parseInt(phoneOperators[getRandomIndex(5)]+""+getRandInt(10000000,99999999));
}
const getFakeName = ()=>{
    return faker.name.findName();
}
const getFakeStudentId = ()=>{
    return getRandInt(14,20)+departments[getRandomIndex(11)]+getRandInt(100,200);
}
const getFakeBloodGroup = ()=>{
    return getRandomIndex(7);
}

console.log(getFakeName())
console.log(getFakeId());
console.log(getFakeToken());
console.log(getFakePhone());
console.log(getFakeStudentId());
console.log(getFakeBloodGroup());
