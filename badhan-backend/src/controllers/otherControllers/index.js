const { NotFoundError404 } = require('../../response/errorTypes')
const deprecatedController = async (req, res) => {
  return res.respond(new NotFoundError404('Please update your app'))
}

module.exports = {
  deprecatedController
}
