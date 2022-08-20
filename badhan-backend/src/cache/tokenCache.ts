import {IDonor} from "../db/models/Donor";

let cache: {
  [key: string]: IDonor | undefined
} = {}

// 37% reduction of total time in testing all routes
export const add = (token: string, user: IDonor) => {
  cache[token] = user
}
export const clear = (token: string) => {
  cache[token] = undefined
}
export const get = (token: string) => {
  return cache[token]
}
export const clearAll = () => {
  cache = {}
}
