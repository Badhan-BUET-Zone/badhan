import { year2000TimeStamp } from "../../../constants"
type DBValidator = {
  validator: (value: number) => boolean;
  msg: string;
};
export const checkNumber = (field: string): DBValidator => {
    return {
        validator: (value: number): boolean => {
          return Number.isInteger(value)
        },
        msg: `DB: ${field} must be an integer`
    }
}
export const checkTimeStamp = (field: string): DBValidator=>{
    return {
        validator: (value: number):boolean =>{
          return year2000TimeStamp <= value
        },
        msg: `DB: ${field} must be timestamp of miliseconds after year 2000`
    }
}

export const checkPublicContactBloodGroup = (field: string): DBValidator=>{
    return {
        validator: (value: number): boolean => {
          return [-1, 0, 2, 4, 6].includes(value)
        },
        msg: `DB: Please input a valid bloodGroup for ${field}`
    }
}