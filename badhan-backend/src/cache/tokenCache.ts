// @ts-nocheck
// tslint:disable
import {IDonor} from "../db/models/Donor";

let cache: {
  [key: string]: IDonor | undefined
} = {}

// 37% reduction of total time in testing all routes
export const add = (token: string, user: IDonor):void => {
  cache[token] = user
}
export const clear = (token: string):void => {
  cache[token] = undefined
}
export const get = (token: string): IDonor|undefined=> {
  return cache[token]
}
export const clearAll = ():void => {
  cache = {}
}
