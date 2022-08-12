// @ts-nocheck
const checkEmail = (email) => {
  /* eslint-disable no-useless-escape */
  const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/
  /* eslint-enable no-useless-escape */ //
  return emailRegex.test(email)
}

module.exports = {
  checkEmail
}
