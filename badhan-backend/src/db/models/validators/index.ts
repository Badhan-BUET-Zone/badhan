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

// For a timestamp that is legitimately empty until something happens (a chat nobody has deleted
// yet). Mongoose skips validators on undefined but NOT on null, so checkTimeStamp on a nullable
// field would fail every document that is still in its empty state.
type NullableDBValidator = {
  validator: (value: number | null) => boolean;
  msg: string;
};
export const checkNullableTimeStamp = (field: string): NullableDBValidator=>{
    return {
        validator: (value: number | null): boolean =>{
          return value === null || (Number.isInteger(value) && year2000TimeStamp <= value)
        },
        msg: `DB: ${field} must be null or a timestamp of miliseconds after year 2000`
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