let tokenCache = {}
// 21% reduction of total time in testing all routes
const add = (token, user) => {
  tokenCache[token] = user
}
const clear = (token) => {
  tokenCache[token] = undefined
}
const get = (token) => {
  return tokenCache[token]
}
const clearAll = () => {
  tokenCache = {}
}

export default {
  add,
  clear,
  get,
  clearAll
}
