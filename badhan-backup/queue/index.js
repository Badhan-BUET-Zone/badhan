const queue = require('express-queue')

const commonQueue = queue({ activeLimit: 1, queuedLimit: -1 })

module.exports = {
    commonQueue
}
