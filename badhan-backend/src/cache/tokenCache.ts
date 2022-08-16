// @ts-nocheck
/* tslint:disable */
let cache = {}
// 37% reduction of total time in testing all routes
const add = (token, user) => {
  cache[token] = user
}
const clear = (token) => {
  cache[token] = undefined
}
const get = (token) => {
  return cache[token]
}
const clearAll = () => {
  cache = {}
}

module.exports = {
  add,
  clear,
  get,
  clearAll
}
