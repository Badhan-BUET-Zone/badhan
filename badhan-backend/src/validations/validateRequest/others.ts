import {CustomValidator} from 'express-validator'

export const checkEmail: (param: string) => boolean = (email: string): boolean => {
  const emailRegex:RegExp = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/
  return emailRegex.test(email)
}

export const checkTimeStamp: CustomValidator = (dateTimeStamp: number): boolean => {
  return new Date('2000-01-01T00:00:00Z').getTime() < dateTimeStamp
}

export const checkTimeStampMessage = (name: string):string => {
  return `${name} must be a timestamp in milisecond after year 2000`
}