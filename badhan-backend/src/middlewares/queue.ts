// @ts-nocheck
const queue = require('express-queue')

const donorInsertionQueue = queue({ activeLimit: 1, queuedLimit: -1 })

module.exports = {
  donorInsertionQueue
}
