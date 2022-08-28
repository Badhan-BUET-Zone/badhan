// @ts-nocheck
// tslint:disable
import queue from 'express-queue'

const donorInsertionQueue = queue({ activeLimit: 1, queuedLimit: -1 })

export default {
  donorInsertionQueue
}
